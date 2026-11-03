import test from 'node:test';
import assert from 'node:assert/strict';
import {apply} from '../index.js';
let route, tool;
const effects=[];
const ctx={effect:f=>effects.push(f()),connection:{fetch:{register:r=>route=r}},tools:{register:t=>tool=t}};
test('setup confirmation is user-route only',async t=>{
 if(process.platform!=='win32'){t.skip('Windows Host plugin');return;}
 apply(ctx);
 try{
  assert(!tool.parameters.properties.action.enum.includes('setup-start'));
  const response=await route.fetch(new Request('http://localhost/api/wsl-workspace',{method:'POST',body:JSON.stringify({action:'setup-start',distro:'unused',confirmed:false})}));
  assert.equal(response.status,400); assert.match((await response.json()).error,/confirmation/);
 }finally{for(const effect of effects)if(typeof effect==='function')await effect();}
});
