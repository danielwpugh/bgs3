import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const base='http://127.0.0.1:3000/api/v1';
test('SALP templates load assets, hash navigation, search, and player voting',async({page})=>{
  const failed:string[]=[];
  page.on('pageerror',e=>failed.push(e.message));
  page.on('response',res=>{if(res.status()>=400)failed.push(`${res.status()} ${res.url()}`);});
  await page.addInitScript(()=>{localStorage.setItem('beastgames_welcome_seen_v1','1');localStorage.removeItem('frontend-auth-cache');});
  await page.goto('/');
  await expect(page.getByText('180',{exact:true})).toBeVisible();
  await page.goto('/#/beastdex');
  await page.getByPlaceholder('Search players...').fill('001');
  await expect(page.getByText('Showing 1 of 200 players')).toBeVisible();
  await page.locator('a[href="#/players/fixture-player-1"]').click();
  await expect(page.getByRole('heading',{name:'Test Player 001'})).toBeVisible();
  await page.getByRole('button',{name:'UPVOTE',exact:true}).click();
  await expect(page.getByText('Vote recorded!',{exact:false})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Test Player 001'})).toBeVisible();
  expect(failed).toEqual([]);
});
test('CORS preflight and legacy/v1 shapes, no raw voter data',async({request})=>{
  const options=await request.fetch(base+'/votes',{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:4173','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,x-voter-id'}});
  expect(options.status()).toBe(204);expect(options.headers()['access-control-allow-origin']).toBe('http://127.0.0.1:4173');
  expect((await request.get(base+'/players',{headers:{Origin:'https://evil.test'}})).status()).toBe(403);
  expect((await request.get('http://127.0.0.1:3000/api/v2/players')).status()).toBe(426);
  const legacy=await (await request.get('http://127.0.0.1:3000/api/players')).json();
  const current=await (await request.get(base+'/players')).json();
  expect(current).toEqual(legacy);
  const detail=await (await request.get(base+'/players/fixture-player-1')).json();
  expect(detail.player.votes).toBeUndefined();expect(detail.player.groupNumber).toBeUndefined();
});
test('concurrent same-day votes accept exactly one and update count once',async({request})=>{
  const slug='fixture-player-2';const voter=randomUUID();
  const before=await (await request.get(base+'/players/'+slug)).json();
  const responses=await Promise.all(Array.from({length:5},()=>request.post(base+'/votes',{headers:{'x-voter-id':voter},data:{slug,type:'UPVOTE'}})));
  expect(responses.filter(r=>r.ok())).toHaveLength(1);
  expect(responses.filter(r=>r.status()===400)).toHaveLength(4);
  const after=await (await request.get(base+'/players/'+slug)).json();
  expect(after.upvoteCount).toBe(before.upvoteCount+1);
});
test('mobile SALP template renders without overflowing viewport',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>localStorage.setItem('beastgames_welcome_seen_v1','1'));
  await page.goto('/?client=mobile#/beastdex');
  await expect(page.getByText('Showing 200 of 200 players')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
