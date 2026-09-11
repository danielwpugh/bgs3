import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3100';
const url=new URL(base);
if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('Smoke writes require a loopback target');
async function get(path,init={}) {
  const res=await fetch(base+path,{...init,signal:AbortSignal.timeout(10000)});
  assert.ok(res.ok,`${path}: HTTP ${res.status}`);return res;
}
for(let attempt=0;attempt<60;attempt++) {
  try {await get('/api/v1/health');break;}catch(error){if(attempt===59)throw error;await new Promise(r=>setTimeout(r,1000));}
}
const health=await (await get('/api/v1/health')).json();assert.equal(health.apiVersion,1);
const legacy=await (await get('/api/players')).json();
const current=await (await get('/api/v1/players')).json();assert.deepEqual(current,legacy);
assert.equal(current.players.length,200);
const login=await get('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'local_admin',password:'local-beastgames-admin'})});
const cookie=login.headers.get('set-cookie').split(';')[0];
await get('/api/admin/me',{headers:{Cookie:cookie}});
const form=new FormData();form.set('image',new Blob([await readFile('public/images/logo.webp')],{type:'image/webp'}),'smoke.webp');
const upload=await (await get('/api/admin/upload-image',{method:'POST',headers:{Cookie:cookie},body:form})).json();
assert.equal((await get(upload.imageUrl)).headers.get('content-type'),'image/webp');
console.log('Backend smoke passed: readiness, v1/legacy, admin session, image upload and retrieval.');
