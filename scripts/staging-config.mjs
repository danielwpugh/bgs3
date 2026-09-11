import { writeFile, mkdir } from 'node:fs/promises';
const [api, originList, pageId='beastgames'] = process.argv.slice(2);
if(!api||!originList)throw new Error('Usage: npm run configure:staging -- https://STAGING_API/api/v1 https://SALP_ORIGIN[,https://ANOTHER_ORIGIN] [page-id]');
const url=new URL(api);
if(url.protocol!=='https:'||url.pathname!=='/api/v1'||url.search||url.hash||url.username||url.password||/localhost|example\.|your-domain|^127\./.test(url.hostname))throw new Error('Use the real HTTPS staging API origin ending in /api/v1');
const origins=originList.split(',').map(value=>{const o=new URL(value);if(o.protocol!=='https:'||o.origin!==value)throw new Error('CORS values must be exact HTTPS origins with no path');return o.origin;});
if(!/^[a-z0-9-]+$/.test(pageId))throw new Error('Invalid SALP page ID');
// Exclusive creation prevents accidentally replacing a configured staging target.
await writeFile('environments/.env.staging',`VITE_API_BASE_URL=${url.href}\nVITE_GA_MEASUREMENT_ID=\nVITE_SALP_PAGE_ID=${pageId}\n`,{flag:'wx'});
await mkdir('artifacts/staging',{recursive:true});
await writeFile('artifacts/staging/backend-public.env',`CORS_ALLOWED_ORIGINS=${origins.join(',')}\nNEXT_PUBLIC_SITE_URL=${url.origin}\n`);
console.log('Staging frontend configured. Copy artifacts/staging/backend-public.env values into the staging backend environment; add its private DATABASE_URL and JWT_SECRET separately.');
