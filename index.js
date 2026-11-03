import { WslBackendManager, defaultStateDirectory } from './backend.js';
export const inject = ['connection', 'tools'];
export function apply(ctx) {
  if (process.platform !== 'win32') throw new Error('WSL workspace launcher must run on Windows.');
  const manager = new WslBackendManager({ stateDirectory: defaultStateDirectory() });
  ctx.effect(() => () => manager.dispose());
  ctx.connection.fetch.register({ path: '/api/wsl-workspace', methods: ['POST'], requestBody: 'buffered', async fetch(request) {
    try {
      const raw = await request.text();
      if (raw.length > 16384) throw new Error('Request too large.');
      return Response.json(await manager.action(JSON.parse(raw)), { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
  }});
  ctx.tools.register({
    name: 'wsl_workspace',
    description: 'List WSL distributions, check the dedicated Linux runtime, browse Linux directories, list recent WSL workspaces, or start a fixed Linux workspace backend. WSL opens in an independent browser backend and does not move this conversation. Setup is explicit and never automatic.',
    parameters: { type: 'object', properties: {
      action: { type: 'string', enum: ['distros', 'status', 'list', 'recent', 'open'] },
      distro: { type: 'string', description: 'Installed WSL distribution; required for status, list, and open.' },
      path: { type: 'string', description: 'Absolute Linux directory; required for open, optional for list.' }
    }, required: ['action'], additionalProperties: false },
    output: { schema: { type: 'object' }, render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }] },
    timeoutMs: 120000,
    async execute(args) {
      const result = await manager.action(args);
      if (result.url) {
        const clean = new URL(result.url); clean.search = '';
        return { ...result, url: clean.href, note: 'Use the WSL workspace picker Open in browser button to authenticate; launch credentials are never included in tool output.' };
      }
      return result;
    }
  });
}
