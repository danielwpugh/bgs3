import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedOrigin, publicPaths } from '../lib/cors';
test('CORS accepts only exact configured origins', () => {
  assert.equal(allowedOrigin('https://www.amazon.com','https://api.example.com','https://www.amazon.com'),true);
  for(const origin of ['https://amazon.com.evil.test','null','https://www.amazon.com:444','http://www.amazon.com']) assert.equal(allowedOrigin(origin,'https://api.example.com','https://www.amazon.com'),false);
});
test('versioned public allowlist excludes admin and unrecognized nested paths', () => {
  for(const path of ['/api/v1/players','/api/v1/players/alice','/api/votes','/api/v1/frontend-auth/login']) assert.ok(publicPaths.test(path));
  for(const path of ['/api/v1/admin/login','/api/v1/players/one/two','/api/v2/votes','/api/v1/votes/']) assert.ok(!publicPaths.test(path));
});

test('version bridge preserves queries and rejects unsupported versions and admin aliases', async () => {
  const {NextRequest}=await import('next/server');
  const {middleware}=await import('../middleware');
  const req=new NextRequest('http://localhost:3000/api/v1/stats?top=5');
  const response=middleware(req);
  assert.equal(response.headers.get('x-middleware-rewrite'),'http://localhost:3000/api/stats?top=5');
  assert.equal(middleware(new NextRequest('http://localhost:3000/api/v2/players')).status,426);
  assert.equal(middleware(new NextRequest('http://localhost:3000/api/v1/admin/login')).status,404);
});


test('admin origin uses browser-facing Host and proxy scheme, without allowing Amazon admin requests', async () => {
  const {NextRequest}=await import('next/server');
  const {middleware}=await import('../middleware');
  const local=middleware(new NextRequest('http://localhost:3000/api/admin/login',{headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'}}));
  assert.equal(local.status,200);
  const proxy=(origin: string)=>middleware(new NextRequest('http://localhost:3000/api/admin/login',{headers:{host:'bg-api.lightsailvr.com','x-forwarded-proto':'https',origin}}));
  assert.equal(proxy('https://bg-api.lightsailvr.com').status,200);
  assert.equal(proxy('https://www.amazon.com').status,403);
});
