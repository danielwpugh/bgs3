'use client';

import { usePathname } from 'next/navigation';
import WelcomeModal from '@/components/WelcomeModal'

export default function BackgroundWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const isLoginPage = pathname?.startsWith('/frontend-login');

  // Don't apply background to admin routes or login page
  if (isAdminRoute || isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        document.getElementById('main-content')?.focus();
      }}>Skip to main content</a>
      <WelcomeModal />
      <div aria-hidden="true" className="fixed inset-0 z-0 beastgames-main-bg pointer-events-none" />
      <main id="main-content" tabIndex={-1} className="relative z-10 min-h-screen">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </>
  );
}

