'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function FrontendLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if already authenticated
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/frontend-auth/verify', {
        credentials: 'include', // Important: include cookies
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.authenticated) {
        // Already authenticated, redirect to home or return URL
        const returnUrl = searchParams.get('returnUrl') || '/';
        router.push(returnUrl);
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/frontend-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include', // Important: include cookies
        cache: 'no-store',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid password');
      }

      // Update cache immediately with authenticated state
      // This ensures the guard will see authenticated state even before API check
      if (typeof window !== 'undefined') {
        const cache = {
          authenticated: true,
          enabled: true,
          timestamp: Date.now(),
        };
        localStorage.setItem('frontend-auth-cache', JSON.stringify(cache));
      }

      // Small delay to ensure cookie is processed by browser
      await new Promise(resolve => setTimeout(resolve, 300));

      // Redirect to home or return URL using router (client-side navigation)
      // This preserves the cookie and cache state
      const returnUrl = searchParams.get('returnUrl') || '/';
      router.push(returnUrl);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to login');
      setLoading(false);
      // Clear cache on error
      if (typeof window !== 'undefined') {
        localStorage.removeItem('frontend-auth-cache');
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-fg-main">
      <div className="w-full max-w-md px-4">
        <div className="p-8 rounded-lg border-2 border-accent-blue bg-gray-900">
          <h1 className="text-3xl font-bold mb-2 text-center">Enter Password</h1>
          <p className="text-sm text-gray-400 mb-6 text-center">
            This site is password protected for development testing
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-900 text-red-200 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

