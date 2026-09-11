'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if already logged in
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        router.push('/admin');
      }
    } catch (error) {
      // Not logged in
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/admin');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg-main text-fg-main flex items-center justify-center">
      <div className="w-full max-w-md p-8 rounded-lg border-2 border-accent-blue bg-gray-900">
        <h1 className="text-4xl font-bold mb-8 text-center neon-blue-text">
          Admin Login
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block mb-2 text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-accent-blue focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

