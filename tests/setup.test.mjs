import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {WslBackendManager} from '../backend.js';

function fixture(options={}) {
  const children=[], calls=[];
  const manager=new WslBackendManager({...options,spawnProcess:(file,args,opts)=>{
    calls.push({file,args,opts});
    const child=new EventEmitter();
    child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.exitCode=null;child.signalCode=null;
    child.finish=(code=0)=>{if(child.exitCode!==null)return;child.exitCode=code;child.stdout.end();child.stderr.end();child.emit('exit',code);setImmediate(()=>child.emit('close',code));};
    child.stdin.on('finish',()=>child.finish(143));child.kill=()=>child.finish(137);
    children.push(child);return child;
  }});
  manager.validate=async distro=>{if(distro!=='Test Linux')throw new Error('Invalid distribution');};
  manager.linuxPath=async (_distro,path)=>path.endsWith('supervise.py')?'/mnt/path with spaces/supervise.py':'/mnt/path with spaces/setup-runtime.sh';
  const started=async()=>{for(let i=0;i<20&&!children.length;i++)await new Promise(r=>setImmediate(r));assert.equal(children.length,1);return children[0];};
  return {manager,children,calls,started};
}

test('explicit setup starts once, uses fixed supervised argv, polls, and succeeds',async()=>{
  const f=fixture();
  try {
    assert.equal(f.children.length,0);
    assert.equal(f.manager.startSetup('Test Linux').state,'running');
    f.manager.startSetup('Test Linux');
    const child=await f.started();
    assert.deepEqual(f.calls[0].args,['-d','Test Linux','--exec','python3','/mnt/path with spaces/supervise.py','bash','/mnt/path with spaces/setup-runtime.sh']);
    assert.equal(f.calls[0].file,'wsl.exe');assert.equal(f.calls[0].opts.stdio[0],'pipe');
    child.stdout.write('Downloading runtime\n');
    assert.match(f.manager.setupStatus('Test Linux').log,/Downloading/);
    child.finish();
    const result=await f.manager.setup('Test Linux');assert.equal(result.state,'succeeded');assert(result.finishedAt);
    f.manager.startSetup('Test Linux');assert.equal(f.children.length,1);
    await assert.rejects(f.manager.action({action:'setup',distro:'Test Linux'}),/Unknown/);
  } finally {await f.manager.dispose();}
});

test('progress is bounded and split credentials never appear in polling',async()=>{
  const f=fixture();try {
    f.manager.startSetup('Test Linux');const child=await f.started();
    child.stdout.write('token=split');assert.equal(f.manager.setupStatus('Test Linux').log,'');
    child.stdout.write('secret\nhttps://user:password@example.com/a\nBearer abcdef\nghp_secretvalue\n');
    let log=f.manager.setupStatus('Test Linux').log;
    for(const secret of ['splitsecret','password@','abcdef','ghp_secretvalue'])assert(!log.includes(secret));
    child.stdout.write('x'.repeat(10000));assert(!f.manager.setupStatus('Test Linux').log.includes('xxxx'));
    child.stdout.write('\n');for(let i=0;i<1000;i++)child.stderr.write('bounded progress\n');
    assert(f.manager.setupStatus('Test Linux').log.length<=8192);
    child.finish();await f.manager.setup('Test Linux');
  }finally {await f.manager.dispose();}
});

test('invalid distribution fails before spawning; failed setup can retry',async()=>{
  const f=fixture();try {
    const invalid=await f.manager.setup('Unknown');assert.equal(invalid.state,'failed');assert.equal(f.children.length,0);
    f.manager.startSetup('Test Linux');const child=await f.started();child.finish(1);
    const failed=await f.manager.setup('Test Linux');assert.equal(failed.state,'failed');assert.match(failed.error,/exited/);
    assert.equal(f.manager.startSetup('Test Linux').state,'running');
  }finally {await f.manager.dispose();}
});

test('dispose closes pipe and waits for installer, including pending validation',async()=>{
  const f=fixture();f.manager.startSetup('Test Linux');const child=await f.started();await f.manager.dispose();
  assert(child.stdin.writableEnded);assert.equal(f.manager.setupStatus('Test Linux').state,'failed');
  assert.throws(()=>f.manager.startSetup('Test Linux'),/shutting down/);
  const g=fixture();g.manager.validate=()=>new Promise(()=>{});g.manager.startSetup('Test Linux');await g.manager.dispose();assert.equal(g.children.length,0);assert.equal(g.manager.setupStatus('Test Linux').state,'failed');
});

test('bounded installer timeout stops only its supervised process',async()=>{
  const f=fixture({setupTimeoutMs:15});try {
    const result=await f.manager.setup('Test Linux');assert.equal(result.state,'failed');assert.match(result.error,/exceeded/);assert(f.children[0].stdin.writableEnded);
    assert(!f.calls.some(call=>call.args.includes('--terminate')||call.args.includes('--shutdown')));
  }finally {await f.manager.dispose();}
});
