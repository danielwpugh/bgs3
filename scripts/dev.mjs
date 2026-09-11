import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-H','127.0.0.1'],{stdio:'inherit'}),
  spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','development'],{stdio:'inherit'}),
];
let stopping = false;
function stop(code=0) {if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
for(const child of children) {child.on('exit',code=>stop(code||0));child.on('error',error=>{console.error(error.message);stop(1);});}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
