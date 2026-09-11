import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { resolve, parse } from 'node:path';
export async function optimizeAssets() {
  await sharp('public/images/pink-outline.png').resize({width:640}).webp({quality:80}).toFile('public/images/pink-outline-mobile.webp');
  for(const file of await readdir('public/images')) {
    if(!/\.(png|jpg)$/.test(file))continue;
    const source=resolve('public/images',file);
    const target=resolve('public/images',parse(file).name+'.webp');
    const sourceStat=await stat(source);
    try {if((await stat(target)).mtimeMs>=Math.max(sourceStat.mtimeMs,(await stat(new URL(import.meta.url))).mtimeMs))continue;}catch{}
    await sharp(source).resize({width:file==='favicon.png'?64:file==='pink-outline.png'?1280:file==='logo.png'?800:1920,withoutEnlargement:true}).webp({quality:85}).toFile(target);
  }
}
await optimizeAssets();
