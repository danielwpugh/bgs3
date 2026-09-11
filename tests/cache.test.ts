import test from 'node:test';
import assert from 'node:assert/strict';
import {shortCache} from '../lib/short-cache';
test('concurrent misses share work and failed work can be retried',async()=>{
 const cached=shortCache<number>(1000);let calls=0;
 const load=async()=>{calls++;return 42;};
 assert.deepEqual(await Promise.all([cached('a',load),cached('a',load),cached('a',load)]),[42,42,42]);assert.equal(calls,1);
 await assert.rejects(cached('b',async()=>{throw new Error('offline');}));
 assert.equal(await cached('b',load),42);assert.equal(calls,2);
});
test('expired data reloads',async()=>{
 const cached=shortCache<number>(0);let n=0;
 assert.equal(await cached('a',async()=>++n),1);
 assert.equal(await cached('a',async()=>++n),2);
});
