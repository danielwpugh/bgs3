import {test,expect} from '@playwright/test';
import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
const db=new PrismaClient();
test.afterAll(()=>db.$disconnect());
test('password preview works cross-origin without cookies and protects the data API',async({page,request})=>{
  // Runs only on the local fixture DB. Restore the setting even if assertions fail.
  const url=new URL(process.env.DATABASE_URL || 'postgresql://localhost/beastgames_local');
  if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_local'))throw new Error('Local fixtures required');
  const settings=await db.settings.findFirstOrThrow();
  await db.settings.update({where:{id:settings.id},data:{frontendPasswordEnabled:true,frontendPassword:await bcrypt.hash('preview-test',10)}});
  try {
    expect((await request.get('http://127.0.0.1:3000/api/v1/players')).status()).toBe(401);
    await page.goto('/#/beastdex');
    await expect(page.getByRole('heading',{name:'Enter Password'})).toBeVisible();
    await page.locator('input[type="password"]').fill('preview-test');
    await page.getByRole('button',{name:'Enter',exact:true}).click();
    await expect(page.getByText('Showing 200 of 200 players')).toBeVisible();
    expect(await page.context().cookies('http://127.0.0.1:3000')).toEqual([]);
  } finally {await db.settings.update({where:{id:settings.id},data:{frontendPasswordEnabled:settings.frontendPasswordEnabled,frontendPassword:settings.frontendPassword}});}
});
test('API failure produces a retry state instead of invented zero totals',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('beastgames_welcome_seen_v1','1'));
  await page.route('**/api/v1/stats?**',route=>route.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:4173','X-API-Version':'1','Access-Control-Expose-Headers':'X-API-Version'},json:{error:'Unavailable'}}));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Unable to load statistics');
  await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
});
test('living-room template and scoped CSS preserve the SALP host shell',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('beastgames_welcome_seen_v1','1'));
  await page.goto('/?client=living_room');
  await expect(page.locator('#beastgames-root')).toBeVisible();
  const margin=await page.evaluate(()=>{const p=document.createElement('p');p.id='host-shell';p.textContent='Amazon host';document.body.prepend(p);return getComputedStyle(p).marginTop;});
  expect(margin).not.toBe('0px');
});
