import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import scopeCss from './scripts/scope-css.mjs';
import path from 'node:path';
export default defineConfig(({mode, command}) => {
  const env = loadEnv(mode, path.resolve('environments'), 'VITE_');
  const salp = process.env.SALP_BUILD === '1';
  const pageId = process.env.SALP_PAGE_ID || 'beastgames';
  if (!/^[a-z0-9-]+$/.test(pageId)) throw new Error('Invalid SALP_PAGE_ID');
  const apiBaseUrl = process.env.VITE_API_BASE_URL || env.VITE_API_BASE_URL || (mode === 'development' || command === 'serve' ? 'http://localhost:3000/api/v1' : '');
  const url = new URL(apiBaseUrl);
  if (!url.pathname.endsWith('/api/v1') || url.search || url.hash || url.username || url.password) throw new Error('API URL must end in /api/v1');
  if (mode !== 'development' && command !== 'serve' && (url.protocol !== 'https:' || /localhost|example\./.test(url.hostname))) throw new Error('Set a real HTTPS VITE_API_BASE_URL for this environment');
  const base = salp ? `/gp/video/static/sl/lp/${pageId}/` : '/';
  return {
    css:{postcss:{plugins:[tailwind(),autoprefixer(),scopeCss()]}},
    root: 'frontend', publicDir: '../public', base, envDir: '../environments',
    plugins: [react(), {name:'public-config', transformIndexHtml() {return [{tag:'script',attrs:{src:`${base}js/config.js`},injectTo:'head-prepend'}];}, generateBundle() {this.emitFile({type:'asset',fileName:'js/config.js',source:`window.BEASTGAMES_CONFIG=${JSON.stringify({apiBaseUrl,assetBaseUrl:base,environment:mode,gaMeasurementId:process.env.VITE_GA_MEASUREMENT_ID || env.VITE_GA_MEASUREMENT_ID || undefined})};`});}, configureServer(server) {server.middlewares.use('/js/config.js', (_req,res) => {res.setHeader('Content-Type','application/javascript');res.end(`window.BEASTGAMES_CONFIG=${JSON.stringify({apiBaseUrl,assetBaseUrl:base,environment:mode,gaMeasurementId:process.env.VITE_GA_MEASUREMENT_ID || env.VITE_GA_MEASUREMENT_ID || undefined})};`);});}}],
    resolve: {alias: [{find:'@',replacement:path.resolve('.')},{find:'next/link',replacement:path.resolve('frontend/navigation.tsx')},{find:'next/navigation',replacement:path.resolve('frontend/navigation.tsx')},{find:'next/image',replacement:path.resolve('frontend/image.tsx')}]},
    server:{host:'127.0.0.1',port:5173,strictPort:true}, preview:{host:'127.0.0.1',port:4173,strictPort:true},
    build:{outDir:'../dist',emptyOutDir:true,rollupOptions:{output:{entryFileNames:'js/[name]-[hash].js',chunkFileNames:'js/[name]-[hash].js',assetFileNames: asset => asset.name?.endsWith('.css') ? 'css/[name]-[hash][extname]' : 'images/[name]-[hash][extname]'}}},
  };
});
