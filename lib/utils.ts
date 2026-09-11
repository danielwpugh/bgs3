/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Rate limiting helper - simple in-memory store (for production, use Redis)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore) if (now > value.resetAt) rateLimitStore.delete(key);
    if (rateLimitStore.size > 20000 && !rateLimitStore.has(identifier)) return false;
  }
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP;
  return 'unknown';
}

/**
 * Returns the current date key for America/Los_Angeles (Pacific Time),
 * formatted as YYYY-MM-DD. Use this for "per day" limits that should
 * reset at midnight Pacific time.
 */
export function getPacificDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  // Defensive fallback (should never happen in supported runtimes).
  if (!year || !month || !day) {
    return '1970-01-01';
  }

  return `${year}-${month}-${day}`;
}

import { access, constants } from 'fs/promises';
import { join } from 'path';
const imageCache = new Map<number, {expires:number; url:string|null}>();

/**
 * Resolve player image URL.
 * - Prefer local files in uploads/players for the player's number (fast, consistent)
 * - Fall back to the stored imageUrl (can be relative or absolute)
 */
export async function resolvePlayerImageUrl(
  playerNumber: number | null,
  storedImageUrl: string | null
): Promise<string | null> {
  const normalizeStored = (url: string | null): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    // If it's an absolute URL or already root-relative, keep it.
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return trimmed;
    }
    // Otherwise treat it as a root-relative path.
    return `/${trimmed}`;
  };

  // If we don't have a playerNumber, we can only return what was stored.
  if (!playerNumber) {
    return normalizeStored(storedImageUrl);
  }

  const cached = imageCache.get(playerNumber);
  if (cached && cached.expires > Date.now()) return cached.url || normalizeStored(storedImageUrl);
  if (imageCache.size > 10000) imageCache.clear();
  // Pad player number to three digits (e.g., 11 -> 011)
  const paddedPlayerNumber = String(playerNumber).padStart(3, '0');

  // Support common formats we have in the repo (png/jpg/jpeg/webp).
  const exts = ['png', 'jpg', 'jpeg', 'webp'];
  for (const ext of exts) {
    const diskPath = join(process.cwd(), 'uploads', 'players', `${paddedPlayerNumber}.${ext}`);
    try {
      await access(diskPath, constants.F_OK);
      const url = `/uploads/players/${paddedPlayerNumber}.${ext}`;
      imageCache.set(playerNumber, {expires:Date.now()+30000,url});
      return url;
    } catch {
      // try next extension
    }
  }

  imageCache.set(playerNumber, {expires:Date.now()+30000,url:null});
  return normalizeStored(storedImageUrl);
}
