"use client";

import { mediaUrl } from '@/lib/public-client';
import React, { useEffect, useMemo, useRef } from "react";

type PlayerImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "onError"
> & {
  src?: string | null;
  alt: string;
  /** Rendered when `src` is missing/null/empty */
  placeholder?: React.ReactNode;
  /** Extra info to print alongside the error */
  context?: Record<string, unknown>;
  /** Log a console error when `src` is missing (default: true) */
  logMissingSrc?: boolean;
  /**
   * After an image error, attempt a lightweight fetch probe (HEAD, then GET)
   * to capture HTTP status/details (default: true).
   */
  diagnoseFetch?: boolean;
};

function toAbsoluteUrl(url: string): string {
  try {
    return new URL(url, window.location.href).toString();
  } catch {
    return url;
  }
}

function pickHeaders(h: Headers, keys: string[]) {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = h.get(k);
    if (v != null) out[k] = v;
  }
  return out;
}

async function probeUrl(url: string) {
  const absoluteUrl = toAbsoluteUrl(url);
  const common = {
    cache: "no-store" as const,
    credentials: "same-origin" as const,
  };

  // Try HEAD first (cheap), then fall back to a small GET.
  try {
    const res = await fetch(absoluteUrl, { method: "HEAD", ...common });
    return {
      method: "HEAD",
      url: res.url,
      redirected: res.redirected,
      status: res.status,
      statusText: res.statusText,
      headers: pickHeaders(res.headers, [
        "content-type",
        "content-length",
        "cache-control",
        "etag",
        "last-modified",
      ]),
    };
  } catch (headErr) {
    try {
      const res = await fetch(absoluteUrl, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        ...common,
      });
      return {
        method: "GET (Range 0-0)",
        url: res.url,
        redirected: res.redirected,
        status: res.status,
        statusText: res.statusText,
        headers: pickHeaders(res.headers, [
          "content-type",
          "content-length",
          "cache-control",
          "etag",
          "last-modified",
          "accept-ranges",
          "content-range",
        ]),
        headError: String(headErr),
      };
    } catch (getErr) {
      return {
        method: "HEAD/GET failed",
        url: absoluteUrl,
        headError: String(headErr),
        getError: String(getErr),
      };
    }
  }
}

export function PlayerImage({
  src,
  alt,
  placeholder,
  context,
  logMissingSrc = false,
  diagnoseFetch = false,
  ...imgProps
}: PlayerImageProps) {
  const missingKey = useMemo(() => {
    const c = context ? JSON.stringify(context) : "";
    return `${alt}::${c}`;
  }, [alt, context]);

  const missingLoggedRef = useRef<Set<string>>(new Set());
  const errorLoggedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const isMissing = src == null || String(src).trim() === "";
    if (!logMissingSrc || !isMissing) return;
    if (missingLoggedRef.current.has(missingKey)) return;
    missingLoggedRef.current.add(missingKey);

    console.error("[PlayerImageMissingSrc] No image URL provided", {
      src,
      alt,
      context,
      location: typeof window !== "undefined" ? window.location.href : undefined,
    });
  }, [alt, context, logMissingSrc, missingKey, src]);

  if (src == null || String(src).trim() === "") {
    return <>{placeholder ?? null}</>;
  }

  return (
    <img
      loading="lazy"
      decoding="async"
      {...imgProps}
      src={mediaUrl(src) ?? undefined}
      alt={alt}
      onError={(e) => {
        const img = e.currentTarget;
        const attemptedSrc = img.currentSrc || img.src || String(src);
        const key = `${attemptedSrc}::${alt}`;
        if (errorLoggedRef.current.has(key)) return;
        errorLoggedRef.current.add(key);

        const payload = {
          srcProp: src,
          attemptedSrc,
          alt,
          context,
          img: {
            currentSrc: img.currentSrc,
            src: img.src,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            complete: img.complete,
          },
          location: window.location.href,
          referrer: document.referrer || undefined,
        };

        console.error("[PlayerImageLoadError] Image failed to load", payload);

        if (!diagnoseFetch) return;
        // Fire-and-forget: extra detail for prod debugging.
        void probeUrl(attemptedSrc).then(
          (probe) => {
            console.error("[PlayerImageLoadError] Probe result", {
              ...payload,
              probe,
            });
          },
          (probeErr) => {
            console.error("[PlayerImageLoadError] Probe threw", {
              ...payload,
              probeError: String(probeErr),
            });
          }
        );
      }}
    />
  );
}












