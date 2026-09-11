import {spawn} from 'node:child_process';
import {access,copyFile} from 'node:fs/promises';
try {await access('.env');} catch(error) {if(error.code!=='ENOENT')throw error;await copyFile('.env.example','.env');}
const children=[];let stopping=false;let started=false;
function stop(code=0) {if(stopping)return;stopping=true;process.exitCode=code;for(const child of children)if(child.exitCode===null)child.kill('SIGTERM');}
function run(args, capture=false) {
  const child=spawn(process.execPath,args,{stdio:capture?['inherit','pipe','inherit']:'inherit'});children.push(child);
  child.on('error',error=>{console.error(error.message);stop(1);});
  child.on('exit',code=>{if(!stopping)stop(code||0);});return child;
}
const db=run(['scripts/local-postgres.mjs'],true);
let output='';
db.stdout.on('data',chunk=>{
  process.stdout.write(chunk);output=(output+chunk).slice(-2000);
  if(!started&&!stopping&&output.includes('Local PostgreSQL ready')) {
    started=true;
    run(['node_modules/next/dist/bin/next','dev','-H','127.0.0.1']);
    run(['node_modules/vite/bin/vite.js','--mode','development']);
    console.log('\nLocal UI: http://127.0.0.1:5173 | Admin: http://127.0.0.1:3000/admin\nCtrl-C stops all three services; fixture data is retained.');
  }
});
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
