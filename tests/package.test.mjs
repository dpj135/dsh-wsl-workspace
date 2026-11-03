import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WslBackendManager, validateBackendUrl } from '../backend.js';
const root = new URL('../', import.meta.url);
test('package metadata and runtime files are distributable', async () => {
 const p = JSON.parse(await readFile(new URL('package.json',root)));
 assert.equal(p.name,'dsh-wsl-workspace'); assert.equal(p.license,'MIT');
 assert.equal(p.dsh.bundle.patch,'./cordis.patch.yml');
 assert(!p.scripts.prepare && !p.scripts.postinstall);
 for (const f of ['index.js','client.js','backend.js','bridge.js','bridge.patch.yml','linux/supervise.py','linux/index.js','linux/package.json','icon.svg','README.md','README.en.md','setup-runtime.sh']) await access(new URL(f,root));
});
test('English and Chinese resources have matching keys and embedded content', async () => {
 const en=JSON.parse(await readFile(new URL('locale/en.json',root))), zh=JSON.parse(await readFile(new URL('locale/zh.json',root)));
 assert.deepEqual(Object.keys(en).sort(),Object.keys(zh).sort());
 const client=await readFile(new URL('client.js',root),'utf8');
 const match=client.match(/const dictionaries = (.*);/); assert(match);
 assert.deepEqual(JSON.parse(match[1]),{en,zh});
});
test('backend login URLs reject external sites and malformed credentials', () => {
 assert.equal(validateBackendUrl('http://127.0.0.1:12345/?token=example').port,'12345');
 for(const u of ['https://example.com/?token=x','http://user:pass@127.0.0.1:123/?token=x','http://127.0.0.1/?token=x','http://127.0.0.1:123/?token=','http://127.0.0.1:123/other?token=x']) assert.throws(()=>validateBackendUrl(u));
});
test('recent state is separate from package and strips unrelated fields', async () => {
 const directory=await mkdtemp(join(tmpdir(),'dsh-wsl-test-'));
 const manager=new WslBackendManager({stateDirectory:directory});
 try {
  await manager.save({distro:'Test Linux',path:'/test'});
  assert.deepEqual(await manager.recent(),{workspaces:[{distro:'Test Linux',path:'/test'}]});
  await assert.rejects(manager.action({action:'setup-start',distro:'Test Linux'}));
  await manager.dispose(); await assert.rejects(manager.open('Test Linux','/test'));
 } finally {await manager.dispose();await rm(directory,{recursive:true,force:true});}
});
