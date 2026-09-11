'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/me');
      if (!res.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      // Call logout API to clear httpOnly cookie
      await fetch('/api/admin/logout', {
        method: 'POST',
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout error:', error);
    }
    // Redirect to home page
    router.push('/');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-main text-fg-main flex items-center justify-center">
        <div className="text-2xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/players', label: 'Manage Players' },
    { href: '/admin/import', label: 'CSV Import' },
    { href: '/admin/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-bg-main text-fg-main">
      <nav className="border-b-2 border-gray-800 bg-gray-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-2xl font-bold text-accent-blue">
                Admin Panel
              </Link>
              <div className="flex gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      pathname === item.href
                        ? 'bg-accent-blue text-bg-main'
                        : 'hover:bg-gray-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Logged in as: {user.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

