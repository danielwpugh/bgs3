import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import BackgroundWrapper from '@/components/BackgroundWrapper'
import VisitorTracker from '@/components/VisitorTracker'
import FrontendAuthGuard from '@/components/FrontendAuthGuard'
import GoogleAnalytics from '@/components/GoogleAnalytics'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Beast Games',
  description: 'Voting platform and player directory for Beast Games',
  icons: {
    icon: '/images/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/nqz1xtz.css" />
      </head>
      <body className="min-h-screen">
        <GoogleAnalytics />
        <VisitorTracker />
        <Suspense fallback={null}>
          <FrontendAuthGuard>
            <div className="min-h-screen flex flex-col">
              <div className="flex-1">
                <BackgroundWrapper>{children}</BackgroundWrapper>
              </div>
              <footer className="relative z-10 border-t border-white/10 bg-black/30 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-white/80">
                  <span>Voting is for entertainment purposes only.</span>
                  <span className="mx-2 text-white/30">|</span>
                  <a
                    href="https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4 hover:text-white"
                  >
                    Privacy Policy
                  </a>
                </div>
              </footer>
            </div>
          </FrontendAuthGuard>
        </Suspense>
      </body>
    </html>
  )
}

