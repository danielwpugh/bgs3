'use client'

import { assetUrl } from '@/lib/public-client';
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'


const WELCOME_SEEN_KEY = 'beastgames_welcome_seen_v1'

// Supply a public asset path or a hosted video URL when the welcome video is ready.
export default function WelcomeModal({ videoSrc }: { videoSrc?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [logoMissing, setLogoMissing] = useState(false)
  const [thumbnailMissing, setThumbnailMissing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showPending, setShowPending] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

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
    const previousFocus = document.activeElement as HTMLElement | null
    // Isolate the dialog from the page in both rendering shells.
    const siblings: { element: HTMLElement; inert: boolean }[] = []
    let branch: HTMLElement | null = dialogRef.current
    while (branch?.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          siblings.push({ element: sibling, inert: sibling.inert })
          sibling.inert = true
        }
      }
      branch = branch.parentElement
    }
    closeRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
      if (event.key === 'Tab') {
        const buttons = closeRef.current?.closest('[role="dialog"]')?.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), video')
        if (!buttons?.length) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      siblings.forEach(({ element, inert }) => { element.inert = inert })
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
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
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Close welcome"
        tabIndex={-1}
        onClick={close}
      />

      <div className="relative z-[61] w-full max-w-4xl my-6 md:my-10 max-h-[calc(100svh-3rem)]">
        <button
          type="button"
          ref={closeRef}
          onClick={close}
          aria-label="Close welcome"
          className="z-10 absolute -top-3 -right-3 md:-top-4 md:-right-4 rounded-full bg-black/80 text-white w-10 h-10 md:w-12 md:h-12 border border-white/30 hover:border-white/70 hover:bg-black/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue flex items-center justify-center leading-none"
        >
          <FontAwesomeIcon icon={faXmark} className="text-xl" />
        </button>

        <section className="welcome-panel">
          <header className="welcome-header">
            <h2 id="welcome-title" className="welcome-title">Welcome to</h2>
            <Image
              src={assetUrl(logoMissing ? '/images/logo.png' : '/images/logo-welcome-modal.png')}
              onError={() => setLogoMissing(true)}
              alt="Beast Games World Champions"
              width={1300}
              height={228}
              priority
              className="welcome-logo"
            />
          </header>
          <div className="welcome-content">
            <p className="welcome-subtitle">Watch the welcome video to get started!</p>
            {isPlaying && videoSrc ? (
              <video
                className="welcome-media"
                src={assetUrl(videoSrc)}
                poster={assetUrl('/images/video-thumb.png')}
                controls
                autoPlay
                playsInline
                tabIndex={0}
                aria-label="Welcome video"
              />
            ) : (
              <button
                type="button"
                className="welcome-media"
                aria-label={videoSrc ? 'Play welcome video' : 'Welcome video coming soon'}
                onClick={() => videoSrc ? setIsPlaying(true) : setShowPending(true)}
              >
                {!thumbnailMissing && <Image
                  onError={() => setThumbnailMissing(true)}
                  src={assetUrl('/images/video-thumb.png')}
                  alt=""
                  width={646}
                  height={373}
                  priority
                  className="welcome-thumbnail"
                />}
                <span className="welcome-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M5 3.5a1.5 1.5 0 0 1 2.3-1.27l14 8.5a1.5 1.5 0 0 1 0 2.54l-14 8.5A1.5 1.5 0 0 1 5 20.5z" /></svg>
                </span>
                {showPending && <span className="welcome-pending" role="status">Welcome video coming soon</span>}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
