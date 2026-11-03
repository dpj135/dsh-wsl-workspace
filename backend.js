import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { mkdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';

const exec = promisify(execFile);
const packageDirectory = dirname(fileURLToPath(import.meta.url));
export const NODE_VERSION = '24.11.0';
export const DSH_VERSION = '0.2.1-rc.5';
const SETUP_TIMEOUT_MS = 15 * 60 * 1000;
const SETUP_LOG_LIMIT = 8192;
function redactSetupLine(value) {
  return value.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@')
    .replace(/((?:access[_-]?token|refresh[_-]?token|token|password|passwd|secret|api[_-]?key|authorization|cookie)\s*[=:]\s*)[^\r\n]+/gi, '$1[redacted]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|sk-[A-Za-z0-9_-]+)\b/g, '[redacted]');
}

export function defaultStateDirectory() {
  return join(process.env.LOCALAPPDATA || join(homedir(), '.local', 'share'), 'dsh-wsl-workspace');
}
function text(value, name) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.length > 8192) throw new Error(`Invalid ${name}.`);
  return value;
}
function directory(value) {
  text(value, 'Linux directory');
  if (!value.startsWith('/')) throw new Error('Use an absolute Linux directory beginning with /.');
  return value;
}
function powershellQuote(value) { return `'${value.replaceAll("'", "''")}'`; }
export function validateBackendUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password || !url.port || !url.searchParams.get('token') || url.pathname !== '/') {
    throw new Error('Backend returned an unexpected authentication URL.');
  }
  return url;
}
const listingScript = `import os,sys,json
p=os.path.realpath(sys.argv[1] if len(sys.argv)>1 and sys.argv[1] else os.path.expanduser('~'))
if not os.path.isdir(p): raise ValueError('Not a directory: '+p)
items=[]
with os.scandir(p) as entries:
 for e in entries:
  try:
   if e.is_dir(): items.append({'name':e.name,'path':os.path.join(p,e.name)})
  except OSError: pass
items.sort(key=lambda e:e['name'].casefold())
print(json.dumps({'path':p,'parent':os.path.dirname(p),'directories':items[:500],'truncated':len(items)>500}))`;
const statusScript = `import os,sys,json,platform,subprocess
root=os.path.expanduser('~/.local/share/dsh-wsl-workspaces/runtime')
node=os.path.join(root,'node-v${NODE_VERSION}-linux-x64/bin/node')
cli=os.path.join(root,'dsh/node_modules/@deepseek-ai/dsh/lib/bin.js')
missing=[]
def version(args,label):
 try:
  result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=12)
  if result.returncode!=0: missing.append(label); return None
  return result.stdout.strip()
 except (OSError,subprocess.SubprocessError): missing.append(label); return None
arch=platform.machine()
if arch!='x86_64': missing.append('supported x86_64 architecture')
nv=version([node,'--version'],'dedicated Node')
dv=version([node,cli,'--version'],'Harness CLI') if nv else None
if nv and nv!='v${NODE_VERSION}': missing.append('Node ${NODE_VERSION}')
if dv and dv!='${DSH_VERSION}': missing.append('Harness ${DSH_VERSION}')
if not nv: missing.append('Harness CLI')
print(json.dumps({'ready':not missing,'architecture':arch,'python3':True,'nodeVersion':nv,'dshVersion':dv,'runtimeRoot':root,'missing':missing}))`;
const launchScript = `set -eu
ROOT="$HOME/.local/share/dsh-wsl-workspaces/runtime"
export PATH="$ROOT/node-v${NODE_VERSION}-linux-x64/bin:$PATH"
export DSH_HOME="$HOME/.local/share/dsh-wsl-workspaces/homes/$1"
test -x "$ROOT/node-v${NODE_VERSION}-linux-x64/bin/node" || { echo 'Dedicated WSL runtime is missing. Run setup-runtime.sh in this distribution.' >&2; exit 1; }
exec node "$ROOT/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js" --profile web --patch "$2" --no-open --port 0`;

export class WslBackendManager {
  constructor(options = {}) {
    const stateDirectory = typeof options === 'string' ? options : options.stateDirectory;
    this.stateDirectory = resolve(stateDirectory || defaultStateDirectory());
    this.recentFile = join(this.stateDirectory, 'workspaces.json');
    this.running = new Map();
    this.setups = new Map();
    this.spawnProcess = typeof options === 'object' && options.spawnProcess ? options.spawnProcess : spawn;
    this.setupTimeoutMs = typeof options === 'object' && options.setupTimeoutMs !== undefined ? Math.min(SETUP_TIMEOUT_MS, Math.max(1, options.setupTimeoutMs)) : SETUP_TIMEOUT_MS;
    this.closed = false;
    this.saving = Promise.resolve();
    this.controller = new AbortController();
  }
  assertOpen() { if (this.closed) throw new Error('Plugin is shutting down.'); }
  async execute(args, options = {}) {
    this.assertOpen();
    return exec('wsl.exe', args, { encoding: 'utf8', timeout: 20000, windowsHide: true, maxBuffer: 1024 * 1024, signal: this.controller.signal, ...options });
  }
  async distros() {
    const { stdout } = await this.execute(['--list', '--quiet'], { encoding: 'buffer', timeout: 15000 });
    const decoded = stdout.includes(0) ? stdout.toString('utf16le') : stdout.toString('utf8');
    return { distros: decoded.replaceAll('\0', '').replace(/^\uFEFF/, '').split(/\r?\n/).map(x => x.trim()).filter(Boolean) };
  }
  async validate(distro) {
    text(distro, 'distribution');
    if (!(await this.distros()).distros.includes(distro)) throw new Error('WSL distribution is not installed.');
  }
  async linuxPath(distro, path) {
    const { stdout } = await this.execute(['-d', distro, '--exec', 'wslpath', '-a', '-u', path]);
    return directory(stdout.trim());
  }
  async status(distro) {
    await this.validate(distro);
    // Shell code is fixed; Python source travels as an argument, never interpolation.
    const check = 'if command -v python3 >/dev/null 2>&1; then exec python3 -c "$1"; else printf \'%s\n\' \'{"ready":false,"python3":false,"missing":["python3"]}\'; fi';
    const { stdout } = await this.execute(['-d', distro, '--exec', 'bash', '-c', check, 'dsh-status', statusScript], { timeout: 35000 });
    const result = JSON.parse(stdout);
    const setupScriptWindows = join(packageDirectory, 'setup-runtime.sh');
    const script = await this.linuxPath(distro, setupScriptWindows);
    return { distro, ...result, setupScriptWindows, setupCommand: `wsl.exe -d ${powershellQuote(distro)} --exec bash ${powershellQuote(script)}` };
  }
  // Called only by the Host's explicitly confirmed user route, never action().
  startSetup(distro) {
    this.assertOpen(); text(distro, 'distribution');
    const existing = this.setups.get(distro);
    if (existing && existing.state !== 'failed') return this.setupStatus(distro);
    const record = { distro, state: 'running', log: '', startedAt: new Date().toISOString() };
    this.setups.set(distro, record);
    record.ready = this.runSetup(record);
    return this.setupStatus(distro);
  }
  setupStatus(distro) {
    text(distro, 'distribution');
    const record = this.setups.get(distro);
    if (!record) return { distro, state: 'failed', log: '', error: 'Runtime setup has not been started.' };
    const { state, log, startedAt, finishedAt, error } = record;
    return { distro, state, log, startedAt, ...(finishedAt ? { finishedAt } : {}), ...(error ? { error } : {}) };
  }
  async setup(distro) {
    this.startSetup(distro);
    await this.setups.get(distro).ready;
    return this.setupStatus(distro);
  }
  async runSetup(record) {
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(), this.setupTimeoutMs);
    const signal = AbortSignal.any([this.controller.signal, timeout.signal]);
    let rejectAbort;
    const aborted = new Promise((_, reject) => { rejectAbort = () => reject(new Error(timeout.signal.aborted ? 'Runtime setup exceeded 15 minutes.' : 'Plugin is shutting down.')); signal.addEventListener('abort', rejectAbort, { once: true }); });
    // Consume the abort promise immediately, including errors before a process exists.
    aborted.catch(() => {});
    try {
      await Promise.race([this.validate(record.distro), aborted]);
      const script = await Promise.race([this.linuxPath(record.distro, join(packageDirectory, 'setup-runtime.sh')), aborted]);
      const supervisor = await Promise.race([this.linuxPath(record.distro, join(packageDirectory, 'linux', 'supervise.py')), aborted]);
      this.assertOpen(); signal.throwIfAborted();
      const child = this.spawnProcess('wsl.exe', ['-d', record.distro, '--exec', 'python3', supervisor, 'bash', script], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      record.process = child;
      child.stdin.on('error', () => {});
      record.exited = new Promise(resolveExit => { child.once('exit', resolveExit); child.once('error', resolveExit); });
      // Only complete lines are published: secrets split across chunks cannot leak.
      const append = value => { record.log = (record.log + redactSetupLine(value) + '\n').slice(-SETUP_LOG_LIMIT); };
      const attach = stream => {
        stream.setEncoding('utf8'); let pending = '', dropping = false;
        stream.on('data', chunk => {
          for (const part of chunk.split(/(?<=\n)/)) {
            if (!dropping) pending += part;
            if (pending.length > SETUP_LOG_LIMIT) { pending = ''; dropping = true; }
            if (part.endsWith('\n')) { append(dropping ? '[oversized progress line omitted]' : pending.trimEnd()); pending = ''; dropping = false; }
          }
        });
        stream.on('end', () => { if (pending || dropping) append(dropping ? '[oversized progress line omitted]' : pending); });
      };
      attach(child.stdout); attach(child.stderr);
      const completion = new Promise((resolveDone, reject) => {
        child.once('error', () => reject(new Error('Could not start the WSL runtime installer.')));
        child.once('close', (code, signalName) => code === 0 ? resolveDone() : reject(new Error(`Runtime setup exited (${code ?? signalName ?? 'unknown'}).`)));
      });
      await Promise.race([completion, aborted]);
      signal.throwIfAborted();
      record.state = 'succeeded';
    } catch (error) {
      record.error = redactSetupLine(String(error.message || error)).slice(-2048);
      await this.stopRecord(record);
      record.state = 'failed';
    } finally {
      clearTimeout(timer); signal.removeEventListener('abort', rejectAbort);
      record.finishedAt = new Date().toISOString();
    }
  }
  async list(distro, path) {
    if (path !== undefined && path !== '') directory(path);
    await this.validate(distro);
    const { stdout } = await this.execute(['-d', distro, '--exec', 'python3', '-c', listingScript, path || '']);
    return JSON.parse(stdout);
  }
  async recent() {
    try {
      const rows = JSON.parse(await readFile(this.recentFile, 'utf8'));
      if (!Array.isArray(rows)) throw new Error('Invalid recent-workspace data.');
      return { workspaces: rows.filter(row => row && typeof row.distro === 'string' && typeof row.path === 'string' && row.path.startsWith('/')).slice(0, 100).map(({ distro, path }) => ({ distro, path })) };
    } catch (error) { if (error.code === 'ENOENT') return { workspaces: [] }; throw error; }
  }
  async save(entry) {
    const operation = this.saving.then(async () => {
      const { workspaces } = await this.recent();
      const rows = [entry, ...workspaces.filter(row => row.distro !== entry.distro || row.path !== entry.path)].slice(0, 100);
      await mkdir(this.stateDirectory, { recursive: true });
      const temporary = join(this.stateDirectory, `workspaces-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(rows, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await rename(temporary, this.recentFile);
      } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
    });
    this.saving = operation.catch(() => {});
    return operation;
  }
  async open(distro, path) {
    this.assertOpen(); directory(path);
    const listing = await this.list(distro, path); path = listing.path;
    this.assertOpen();
    const key = createHash('sha256').update(JSON.stringify([distro, path])).digest('hex').slice(0, 24);
    let record = this.running.get(key);
    if (!record) {
      record = {}; this.running.set(key, record);
      record.ready = this.launch(distro, path, key, record).catch(async error => {
        await this.stopRecord(record);
        if (this.running.get(key) === record) this.running.delete(key);
        throw error;
      });
    }
    const result = await record.ready;
    this.assertOpen();
    if (!record.process || record.process.exitCode !== null || record.process.signalCode !== null) throw new Error('WSL backend stopped before opening.');
    await this.save({ distro, path });
    this.assertOpen();
    return { url: result.url, path, distro };
  }
  async launch(distro, path, key, record) {
    const status = await this.status(distro);
    if (!status.ready) throw new Error(`WSL runtime is not ready (${status.missing.join(', ')}). Run the setup command shown by Check runtime first.`);
    const patch = await this.linuxPath(distro, join(packageDirectory, 'bridge.patch.yml'));
    const supervisor = await this.linuxPath(distro, join(packageDirectory, 'linux', 'supervise.py'));
    this.assertOpen();
    const child = spawn('wsl.exe', ['-d', distro, '--cd', path, '--exec', 'python3', supervisor, 'bash', '-c', launchScript, 'dsh-wsl', key, patch], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    record.process = child;
    child.stdin.on('error', () => {});
    record.exited = new Promise(resolveExit => { child.once('exit', resolveExit); child.once('error', resolveExit); });
    const url = await new Promise((resolveReady, reject) => {
      let output = '', errors = '', settled = false;
      const timer = setTimeout(() => finish(new Error('WSL backend did not become ready within 90 seconds.')), 90000);
      const abort = () => finish(new Error('Plugin is shutting down.'));
      this.controller.signal.addEventListener('abort', abort, { once: true });
      const finish = (error, value) => {
        if (settled) return; settled = true; clearTimeout(timer);
        this.controller.signal.removeEventListener('abort', abort);
        error ? reject(error) : resolveReady(value);
      };
      child.on('error', error => finish(error));
      child.on('exit', code => {
        if (this.running.get(key) === record) this.running.delete(key);
        finish(new Error(`WSL backend exited (${code}): ${errors.replace(/token=[^\s]+/g, 'token=[redacted]').slice(-3000)}`));
      });
      child.stderr.on('data', data => { errors = (errors + data).slice(-12000); });
      child.stdout.on('data', data => {
        output = (output + data).slice(-16000);
        const match = output.match(/dsh web:\s*(https?:\/\/[^\s\u001b]+)/);
        if (match) { try { finish(null, validateBackendUrl(match[1]).href); } catch (error) { finish(error); } }
      });
    });
    this.assertOpen();
    const login = await fetch(url, { redirect: 'manual', signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(15000)]) });
    const cookies = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    if (![302, 303].includes(login.status) || !cookies) throw new Error(`WSL backend authentication failed (HTTP ${login.status}).`);
    const response = await fetch(new URL('/api/wsl-initialize', url), { redirect: 'error', method: 'POST', headers: { 'content-type': 'application/json', cookie: cookies }, body: JSON.stringify({ path }), signal: AbortSignal.any([this.controller.signal, AbortSignal.timeout(20000)]) });
    const result = await response.json();
    if (!response.ok || result.platform !== 'linux' || result.path !== path) throw new Error(result.error || 'Linux workspace initialization failed.');
    return { url };
  }
  async action(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected an operation object.');
    if (Object.keys(input).some(key => !['action', 'distro', 'path'].includes(key))) throw new Error('Unknown operation field.');
    if (input.path !== undefined && input.path !== '') directory(input.path);
    if (['list', 'open', 'status'].includes(input.action)) text(input.distro, 'distribution');
    switch (input.action) {
      case 'distros': return this.distros();
      case 'status': return this.status(input.distro);
      case 'list': return this.list(input.distro, input.path);
      case 'open': return this.open(input.distro, directory(input.path));
      case 'recent': return this.recent();
      default: throw new Error('Unknown WSL workspace operation.');
    }
  }
  async stopRecord(record) {
    if (record.stopping) return record.stopping;
    const child = record.process;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    record.stopping = new Promise(resolveStop => {
      const timer = setTimeout(() => { child.kill(); resolveStop(); }, 12000);
      record.exited.then(() => { clearTimeout(timer); resolveStop(); });
      child.stdin.end();
    });
    return record.stopping;
  }
  async dispose() {
    if (this.disposing) return this.disposing;
    this.closed = true; this.controller.abort();
    const records = [...this.running.values(), ...this.setups.values()];
    this.disposing = Promise.allSettled(records.map(async record => {
      await this.stopRecord(record);
      await record.ready?.catch(() => {});
    })).then(async () => { this.running.clear(); await this.saving; });
    return this.disposing;
  }
}
