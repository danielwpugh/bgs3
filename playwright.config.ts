import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',workers:1,fullyParallel:false,timeout:30000,
  reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4173',browserName:'chromium',...(process.env.CI ? {} : {channel:'chrome' as const}),trace:'retain-on-failure'},
  webServer:[
    {command:'npm start -- -H 127.0.0.1',url:'http://127.0.0.1:3000/api/health',reuseExistingServer:!process.env.CI,timeout:120000},
    {command:'node scripts/preview-salp.mjs',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
  ],
});
