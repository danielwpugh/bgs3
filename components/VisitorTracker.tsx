'use client';

import { useEffect } from 'react';

export default function VisitorTracker() {
  useEffect(() => {
    // Track visitor on page load
    // Skip tracking for admin routes
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      
      // Skip tracking for admin routes, API routes, etc.
      if (
        pathname.startsWith('/api') ||
        pathname.startsWith('/admin') ||
        pathname.startsWith('/_next') ||
        pathname.includes('.')
      ) {
        return;
      }

      // Call the tracking API
      fetch('/api/track-visitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch((error) => {
        // Silently fail - don't break the user experience
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to track visitor:', error);
        }
      });
    }
  }, []);

  return null; // This component doesn't render anything
}




















