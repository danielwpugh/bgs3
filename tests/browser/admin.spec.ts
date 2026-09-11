import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('admin login, CSV import, and image upload remain functional',async({request: unauthenticated,playwright})=>{
  const base='http://127.0.0.1:3000';
  const login=await unauthenticated.post(base+'/api/admin/login',{headers:{Origin:base},data:{username:'local_admin',password:'local-beastgames-admin'}});
  expect(login.ok()).toBe(true);
  // Production cookies correctly require HTTPS; explicitly carry this test session over loopback HTTP.
  const cookie=login.headers()['set-cookie'].split(';')[0];
  const request=await playwright.request.newContext({extraHTTPHeaders:{Cookie:cookie,Origin:base}});
  expect((await request.get(base+'/api/admin/me')).ok()).toBe(true);
  const original=(await (await request.get(base+'/api/players/fixture-player-3')).json()).player;
  try {
    const csv=`id,name,slug,team,title\n${original.id},Test Player 003,fixture-player-3,OG,CSV regression test\n`;
    const imported=await request.post(base+'/api/admin/import-csv',{multipart:{csv:{name:'players.csv',mimeType:'text/csv',buffer:Buffer.from(csv)}}});
    expect(imported.ok()).toBe(true);
    const result=await imported.json();expect(result.errors).toEqual([]);
    const updated=(await (await request.get(base+'/api/players/fixture-player-3')).json()).player;
    expect(updated.title).toBe('CSV regression test');
    const uploaded=await request.post(base+'/api/admin/upload-image',{multipart:{image:{name:'test.webp',mimeType:'image/webp',buffer:await readFile('public/images/logo.webp')}}});
    expect(uploaded.ok()).toBe(true);
    const {imageUrl}=await uploaded.json();
    const media=await request.get(base+imageUrl);expect(media.ok()).toBe(true);expect(media.headers()['content-type']).toBe('image/webp');
  } finally {
    const restored=await request.put(base+'/api/admin/players/'+original.id,{data:original});expect(restored.ok()).toBe(true);await request.dispose();
  }
});
