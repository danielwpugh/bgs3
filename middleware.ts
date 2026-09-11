import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware handles front-end password protection for development testing
// Note: We check the cookie here, and the actual settings check happens in a server component
// to avoid Prisma issues in Edge runtime
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip protection for:
  // - Admin routes
  // - API routes
  // - Static files
  // - The login page itself
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/frontend-login') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // IMPORTANT:
  // Don't verify or delete the cookie in middleware. Middleware runs in the Edge runtime,
  // and depending on host configuration, its env may not match the Node runtime used by
  // route handlers. If secrets ever differ, we'd end up wiping a valid session on every request.
  //
  // FrontendAuthGuard + /api/frontend-auth/verify are the source of truth.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

