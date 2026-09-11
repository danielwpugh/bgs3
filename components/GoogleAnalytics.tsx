'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: any[]) => void
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname()

  // Track SPA navigations (including when embedded in an iframe).
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return
    if (typeof window === 'undefined') return
    if (typeof window.gtag !== 'function') return

    const qs = window.location.search || ''
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: `${pathname}${qs}`,
    })
  }, [pathname])

  // Only load GA when explicitly configured.
  if (!GA_MEASUREMENT_ID) return null

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());

// send_page_view is handled manually on route changes for App Router SPA navs.
// cookie_flags helps cookies work better when the site is running in an iframe.
gtag('config', '${GA_MEASUREMENT_ID}', {
  send_page_view: false,
  cookie_flags: 'SameSite=None;Secure'
});
        `}
      </Script>
    </>
  )
}


