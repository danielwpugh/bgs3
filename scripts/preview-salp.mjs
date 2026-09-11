import { loadEnv } from 'vite';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const mode=process.argv[2]||'local';
if(!['local','staging','production'].includes(mode))throw new Error('Invalid environment');
const env=loadEnv(mode==='local'?'development':mode,resolve('environments'),'VITE_');
const pageId=process.env.SALP_PAGE_ID||env.VITE_SALP_PAGE_ID||'beastgames';
if(!/^[a-z0-9-]+$/.test(pageId))throw new Error('Invalid page ID');
const root=resolve('artifacts',mode,pageId);
const types={'.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.html':'text/html'};
createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/') {
      const client=url.searchParams.get('client')||'desktop';
      if(!['desktop','mobile','living_room'].includes(client))throw new Error('Invalid client');
      const head=await readFile(resolve(root,client,'en_US/head.html'),'utf8');
      const body=await readFile(resolve(root,client,'en_US/body.html'),'utf8');
      res.setHeader('Content-Type','text/html');res.end(`<!doctype html><html lang="en"><head>${head}</head><body>${body}</body></html>`);return;
    }
    const file=resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+sep))throw new Error('Invalid path');
    res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
    res.end(await readFile(file));
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log(`SALP ${mode} preview at http://127.0.0.1:4173`));
