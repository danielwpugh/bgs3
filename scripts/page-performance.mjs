import { chromium } from '@playwright/test';
import { mkdir,writeFile } from 'node:fs/promises';
const browser=await chromium.launch(process.env.CI?{}:{channel:'chrome'});
const results=[];
await mkdir('artifacts/performance',{recursive:true});
try {
 for(const slow of [false,true]) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{localStorage.setItem('beastgames_welcome_seen_v1','1');window.__lcp=0;new PerformanceObserver(list=>{window.__lcp=list.getEntries().at(-1).startTime;}).observe({type:'largest-contentful-paint',buffered:true});});
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  if(slow){await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});}
  const start=Date.now();
  await page.goto(process.env.FRONTEND_URL||'http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
  await page.getByText('180',{exact:true}).waitFor();
  const ready=Date.now()-start;
  await page.waitForLoadState('networkidle');
  results.push({profile:slow?'mobile-1.6Mbps-150ms-4xCPU':'desktop-local',readyMs:ready,...await page.evaluate(()=>({lcpMs:window.__lcp,requests:performance.getEntriesByType('resource').length,transferBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0)}))});
  await page.screenshot({path:`artifacts/performance/${slow?'mobile':'desktop'}.png`,fullPage:true});
  await page.close();
 }
 console.log(JSON.stringify(results,null,2));await writeFile('artifacts/performance/page-load.json',JSON.stringify(results,null,2));
} finally {await browser.close();}
