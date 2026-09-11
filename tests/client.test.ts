import test from 'node:test';
import assert from 'node:assert/strict';
import { assetUrl, mediaUrl, apiFetch } from '../lib/public-client';
test('SALP asset URLs and backend media URLs use separate hosts',()=>{
  (globalThis as any).window={BEASTGAMES_CONFIG:{apiBaseUrl:'https://api.test/api/v1',assetBaseUrl:'/gp/video/static/sl/lp/beastgames/'}};
  assert.equal(assetUrl('/images/logo.png'),'/gp/video/static/sl/lp/beastgames/images/logo.png');
  assert.equal(mediaUrl('/uploads/players/a.webp'),'https://api.test/uploads/players/a.webp');
});
test('API client detects incompatible API and never retries a vote', async()=>{
  const original=globalThis.fetch; let calls=0;
  globalThis.fetch=async (url,init)=>{ calls++; assert.equal(url,'https://api.test/api/v1/votes'); assert.equal(init?.credentials,'omit'); return new Response('{}',{headers:{'X-API-Version':'2'}}); };
  try {await assert.rejects(apiFetch('/api/votes',{method:'POST'}),/requires API v1/); assert.equal(calls,1);} finally{globalThis.fetch=original;}
});
