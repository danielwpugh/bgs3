import { build } from 'vite';
import './optimize-assets.mjs';
import { mkdir, readFile, writeFile, cp, rm, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const mode = process.argv[2] || 'local';
if (!['local','staging','production'].includes(mode)) throw new Error('Environment must be local, staging, or production');
const pageId = process.env.SALP_PAGE_ID || 'beastgames';
if (!/^[a-z0-9-]+$/.test(pageId)) throw new Error('Invalid SALP_PAGE_ID');
process.env.SALP_BUILD = '1';
await build({mode: mode === 'local' ? 'development' : mode});
const output = resolve('artifacts', mode);
const root = join(output,pageId);
await rm(root,{recursive:true,force:true});
const base = `gp/video/static/sl/lp/${pageId}`;
await mkdir(join(root,base),{recursive:true});
const html = await readFile('dist/index.html','utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/i)?.[1];
if (!head || !body) throw new Error('Missing head/body in Vite HTML');
for (const client of ['desktop','mobile','living_room']) {
  const target = join(root,client,'en_US'); await mkdir(target,{recursive:true});
  await writeFile(join(target,'head.html'),head+'\n'); await writeFile(join(target,'body.html'),body+'\n');
}
for (const dir of await readdir('dist')) {
  if (dir === 'index.html') continue;
  if (!['css','js','images'].includes(dir)) throw new Error(`SALP disallows output folder: ${dir}`);
  await cp(join('dist',dir),join(root,base,dir),{recursive:true,filter: source => !/\.(png|jpg)$/.test(source)});
}
// Zip contains exactly one page-id root. Build metadata lives outside the SALP package.
const date = new Date().toISOString().slice(0,10);
const zip = `${pageId}_${mode}_${date}.zip`;
await rm(join(output,zip),{force:true});
const result = spawnSync('zip',['-qr',zip,pageId],{cwd:output,stdio:'inherit'});
if (result.status !== 0) throw new Error('zip failed (install the zip CLI)');
await writeFile(join(output,'build.json'),JSON.stringify({pageId,environment:mode,builtAt:new Date().toISOString(),archive:zip},null,2));
console.log(`SALP archive: ${join(output,zip)}`);
