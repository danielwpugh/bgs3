import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const requests = Number(process.env.PERF_REQUESTS || 200);
const concurrency = Number(process.env.PERF_CONCURRENCY || 10);
const budget = Number(process.env.PERF_P95_MS || 500);
if (![requests,concurrency,budget].every(n=>Number.isInteger(n)&&n>0) || concurrency>200 || requests>100000) throw new Error('Invalid performance parameters');
const headers = process.env.PREVIEW_TOKEN ? {Authorization:`Bearer ${process.env.PREVIEW_TOKEN}`} : {};
const results = [];
for(const path of ['/players','/stats?top=5&days=30']) {
  async function once() {
    const start=performance.now();
    const res=await fetch(base+path,{headers,signal:AbortSignal.timeout(15000)});
    const body=await res.arrayBuffer();
    if(!res.ok)throw new Error(`${path}: HTTP ${res.status}`);
    return {ms:performance.now()-start,bytes:body.byteLength};
  }
  const cold=await once();
  let index=0, failures=0; const samples=[];
  await Promise.all(Array.from({length:concurrency},async()=>{while(index++<requests){try{samples.push((await once()).ms);}catch{failures++;}}}));
  samples.sort((a,b)=>a-b);
  const percentile=p=>samples[Math.min(samples.length-1,Math.ceil(samples.length*p)-1)]??Infinity;
  const result={path,requests,concurrency,coldMs:cold.ms,bytes:cold.bytes,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),failures,budgetMs:budget};
  results.push(result);console.log(result);
  if(failures||result.p95Ms>budget)process.exitCode=1;
}
await mkdir('artifacts/performance',{recursive:true});
await writeFile(`artifacts/performance/${Date.now()}.json`,JSON.stringify({base,measuredAt:new Date().toISOString(),results},null,2));
