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
      <WelcomeModal />
      <div
        className="fixed inset-0 w-full z-0 beastgames-main-bg beastgames-bg-mobile-opacity"
        style={{
          backgroundImage: `url(/images/bg.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Subtle overlay to ensure content readability */}
        <div className="absolute inset-0 bg-bg-main/40 pointer-events-none" />
      </div>
      <div className="relative z-10 min-h-screen">
        <div
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          style={{
            backgroundImage: 'url(/images/pink-outline.png)',
            backgroundPosition: 'top center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% auto',
            backgroundAttachment: 'scroll',
            marginTop: '20px',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

