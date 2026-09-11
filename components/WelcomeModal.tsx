'use client'

import { assetUrl } from '@/lib/public-client';
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'

const WELCOME_SEEN_KEY = 'beastgames_welcome_seen_v1'

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(WELCOME_SEEN_KEY)
      if (!seen) setIsOpen(true)
    } catch {
      // If storage is unavailable, fail "closed" (don’t block the app).
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen])

  function close() {
    try {
      window.localStorage.setItem(WELCOME_SEEN_KEY, '1')
    } catch {
      // ignore
    }
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Close welcome"
        onClick={close}
      />

      <div className="relative z-[61] w-full max-w-4xl my-6 md:my-10 max-h-[calc(100svh-3rem)]">
        <button
          type="button"
          onClick={close}
          aria-label="Close welcome"
          className="absolute -top-3 -right-3 md:-top-4 md:-right-4 rounded-full bg-black/80 text-white w-10 h-10 md:w-12 md:h-12 border border-white/30 hover:border-white/70 hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white flex items-center justify-center leading-none"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xl" />
        </button>

        <button
          type="button"
          onClick={close}
          aria-label="Close welcome"
          className="block w-full max-h-[calc(100svh-3rem)] overflow-y-auto rounded-xl border border-white/20 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {/* Desktop */}
          <div className="hidden md:block">
            <Image
              src={assetUrl("/images/welcome-desktop.webp")}
              alt="Welcome"
              width={1600}
              height={900}
              priority
              className="w-full h-auto select-none"
            />
          </div>

          {/* Mobile */}
          <div className="block md:hidden">
            <Image
              src={assetUrl("/images/welcome-mobile.webp")}
              alt="Welcome"
              width={900}
              height={1600}
              priority
              className="w-full h-auto select-none"
            />
          </div>
        </button>
      </div>
    </div>
  )
}


