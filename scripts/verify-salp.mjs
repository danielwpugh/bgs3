import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
const mode=process.argv[2]||'local';
if(!['local','staging','production'].includes(mode))throw new Error('Invalid mode');
const metadata=JSON.parse(await readFile(`artifacts/${mode}/build.json`,'utf8'));
const root=resolve('artifacts',mode,metadata.pageId);
const prefix=`/gp/video/static/sl/lp/${metadata.pageId}/`;
for(const client of ['desktop','mobile','living_room']) {
  const head=await readFile(`${root}/${client}/en_US/head.html`,'utf8');
  const body=await readFile(`${root}/${client}/en_US/body.html`,'utf8');
  assert.ok(body.includes('id="beastgames-root"'));
  for(const match of (head+body).matchAll(/(?:src|href)="(\/[^\"]+)"/g)) {
    assert.ok(match[1].startsWith(prefix),`${client}: unexpected asset ${match[1]}`);
    await access(root+match[1]);
  }
}
const config=JSON.parse((await readFile(root+prefix+'js/config.js','utf8')).replace(/^window.BEASTGAMES_CONFIG=/,'').replace(/;\s*$/,''));
assert.equal(config.assetBaseUrl,prefix);
assert.ok(config.apiBaseUrl.endsWith('/api/v1'));
if(mode==='local')assert.ok(/^http:\/\/(localhost|127\.0\.0\.1):3000\//.test(config.apiBaseUrl));
if(mode==='staging') {
  assert.equal(config.apiBaseUrl,'https://bg-api.lightsailvr.com/api/v1');
  assert.equal(metadata.pageId,'beastgames-s3contestants');
}
console.log(`Verified ${mode}: all three SALP templates, referenced assets, and API configuration.`);
