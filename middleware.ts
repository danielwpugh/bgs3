import { NextRequest, NextResponse } from 'next/server';
import { allowedOrigin, publicPaths } from './lib/cors';
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const origin = request.headers.get('origin');
  const isPublic = publicPaths.test(path);
  const allowed = allowedOrigin(origin, request.nextUrl.origin, isPublic ? (process.env.CORS_ALLOWED_ORIGINS || '') : '');
  const headers = new Headers({'Vary':'Origin', 'X-API-Version':'1', 'Cache-Control':'no-store'});
  if (origin && allowed && isPublic) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Voter-Id, Authorization');
    headers.set('Access-Control-Expose-Headers', 'X-API-Version, Server-Timing, Retry-After');
    headers.set('Access-Control-Max-Age', '600');
    // Legacy same-origin clients use cookies; SALP uses headers and credentials:omit.
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
  if (!allowed) return NextResponse.json({error:'Origin not allowed'}, {status:403,headers});
  if (path.startsWith('/api/v1/') && !isPublic) return NextResponse.json({error:'Unknown API endpoint'}, {status:404,headers});
  if (/^\/api\/v[0-9]+(?:\/|$)/.test(path) && !path.startsWith('/api/v1/')) return NextResponse.json({error:'Unsupported API version'}, {status:426,headers});
  if (request.method === 'OPTIONS') return new NextResponse(null, {status:204,headers});
  const response = path.startsWith('/api/v1/') ? NextResponse.rewrite(new URL(path.replace('/api/v1/', '/api/') + request.nextUrl.search, request.url)) : NextResponse.next();
  headers.forEach((value,key) => response.headers.set(key,value));
  return response;
}
export const config = {matcher:['/api/:path*']};
