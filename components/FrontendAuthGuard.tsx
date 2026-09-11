'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const AUTH_CACHE_KEY = 'frontend-auth-cache';
const AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

interface AuthCache {
  authenticated: boolean;
  enabled: boolean;
  timestamp: number;
}

export default function FrontendAuthGuard({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasCheckedRef = useRef(false);

  function getReturnUrl() {
    const qs = searchParams?.toString();
    return encodeURIComponent(pathname + (qs ? `?${qs}` : ''));
  }

  function isValidAuthPayload(data: unknown): data is { enabled: boolean; authenticated: boolean } {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return typeof d.enabled === 'boolean' && typeof d.authenticated === 'boolean';
  }

  useEffect(() => {
    // Reset check state when pathname changes (e.g., after login redirect)
    hasCheckedRef.current = false;
    checkAuth();
  }, [pathname]);

  function getCachedAuth(): AuthCache | null {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      if (!cached) return null;
      const parsed: AuthCache = JSON.parse(cached);
      // Check if cache is still valid (within 5 minutes)
      if (Date.now() - parsed.timestamp < AUTH_CACHE_DURATION) {
        return parsed;
      }
      // Cache expired, remove it
      localStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    } catch {
      return null;
    }
  }

  function setCachedAuth(auth: { authenticated: boolean; enabled: boolean }) {
    if (typeof window === 'undefined') return;
    try {
      const cache: AuthCache = {
        ...auth,
        timestamp: Date.now(),
      };
      localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore localStorage errors
    }
  }

  async function checkAuth() {
    // Skip check for admin routes and login page
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/frontend-login')) {
      setIsChecking(false);
      setIsAuthenticated(true);
      return;
    }

    // Always check cache first to avoid unnecessary API calls
    const cached = getCachedAuth();
    if (cached) {
      if (!cached.enabled) {
        // Protection not enabled, allow access
        setIsAuthenticated(true);
        setIsChecking(false);
        hasCheckedRef.current = true;
        // But still verify in the background so enabling the feature server-side
        // takes effect quickly (otherwise a stale cache can bypass for 5 minutes).
        verifyAuthInBackground();
        return;
      }
      if (cached.authenticated) {
        // User is authenticated according to cache
        // Allow access immediately, verify in background
        setIsAuthenticated(true);
        setIsChecking(false);
        hasCheckedRef.current = true;
        // Verify in background to ensure token is still valid
        verifyAuthInBackground();
        return;
      }
    }

    try {
      const res = await fetch('/api/frontend-auth/verify', {
        credentials: 'include', // Important: include cookies
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);

      // If the API is down/misconfigured, never silently bypass protection in production.
      if (!res.ok || !isValidAuthPayload(data)) {
        throw new Error(
          `Invalid frontend-auth verify response (status=${res.status}, ok=${res.ok})`
        );
      }
      
      // Update cache
      setCachedAuth({ authenticated: data.authenticated, enabled: data.enabled });
      
      if (!data.enabled) {
        // Protection not enabled, allow access
        setIsAuthenticated(true);
        setIsChecking(false);
        hasCheckedRef.current = true;
        return;
      }

      if (data.authenticated) {
        // User is authenticated
        setIsAuthenticated(true);
        setIsChecking(false);
        hasCheckedRef.current = true;
      } else {
        // Not authenticated, clear cache and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_CACHE_KEY);
        }
        router.push(`/frontend-login?returnUrl=${getReturnUrl()}`);
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
      // Fail open in development to avoid blocking iteration, but fail closed in production
      // so a broken verify endpoint can't silently disable protection.
      if (process.env.NODE_ENV === 'production') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_CACHE_KEY);
        }
        setIsAuthenticated(false);
        setIsChecking(false);
        hasCheckedRef.current = true;
        router.push(`/frontend-login?returnUrl=${getReturnUrl()}`);
        return;
      }

      setIsAuthenticated(true);
      setIsChecking(false);
      hasCheckedRef.current = true;
    }
  }

  async function verifyAuthInBackground() {
    // Verify auth in background without blocking UI
    // Only verify if cache is getting old (more than 1 minute)
    const cached = getCachedAuth();
    if (cached && cached.enabled && Date.now() - cached.timestamp < 60000) {
      // Cache is fresh, skip verification
      return;
    }

    try {
      const res = await fetch('/api/frontend-auth/verify', {
        credentials: 'include', // Important: include cookies
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (res.ok && isValidAuthPayload(data)) {
        setCachedAuth({ authenticated: data.authenticated, enabled: data.enabled });
      } else {
        // If background verify fails, clear cache so the next foreground check re-evaluates.
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_CACHE_KEY);
        }
        return;
      }
      
      // If auth failed, redirect to login
      if (data.enabled && !data.authenticated) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_CACHE_KEY);
        }
        router.push(`/frontend-login?returnUrl=${getReturnUrl()}`);
      }
    } catch (error) {
      // Ignore background verification errors - don't disrupt user experience
      console.error('Background auth verification failed:', error);
    }
  }

  if (isChecking) {
    // Show loading state while checking
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Will redirect, but show loading in the meantime
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Redirecting...</div>
      </div>
    );
  }

  return <>{children}</>;
}

