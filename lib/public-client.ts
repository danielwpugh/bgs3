/** Shared by the Next preview and the independently built SALP frontend. */
declare global { interface Window { BEASTGAMES_CONFIG?: { apiBaseUrl: string; assetBaseUrl: string; environment: string; gaMeasurementId?: string } } }
export function assetUrl(path: string): string {
  const base = typeof window !== 'undefined' ? window.BEASTGAMES_CONFIG?.assetBaseUrl : '';
  return base ? `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}` : path;
}
export function mediaUrl(path: string | null | undefined) {
  if (!path || /^(https?:|data:|blob:)/.test(path)) return path;
  const base = typeof window !== 'undefined' ? window.BEASTGAMES_CONFIG?.apiBaseUrl : '';
  return base ? new URL(path, base).href : path;
}
let memoryPreviewToken: string | null = null;
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const config = typeof window !== 'undefined' ? window.BEASTGAMES_CONFIG : undefined;
  const headers = new Headers(init.headers);
  let token = memoryPreviewToken;
  try { token = sessionStorage.getItem('beastgames_preview_token') || memoryPreviewToken; } catch {}
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const url = config ? `${config.apiBaseUrl.replace(/\/$/, '')}${path.replace(/^\/api/, '')}` : path;
  const response = await fetch(url, { ...init, headers, credentials: config ? 'omit' : (init.credentials ?? 'same-origin'), signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
  if (config && response.ok && response.headers.get('X-API-Version') !== '1') throw new Error('This frontend requires API v1. Please check the backend URL.');
  if (path === '/api/frontend-auth/login' && response.ok) {
    const data = await response.clone().json();
    if (data.token) { memoryPreviewToken = data.token; try { sessionStorage.setItem('beastgames_preview_token', data.token); } catch {} }
  }
  if (path === '/api/frontend-auth/logout' && response.ok) {
    memoryPreviewToken = null;
    try { sessionStorage.removeItem('beastgames_preview_token'); localStorage.removeItem('frontend-auth-cache'); } catch {}
  }
  return response;
}

let memoryVoterId: string | null = null;
export function voterId() {
  try { const stored = localStorage.getItem('beastgames_voter_id'); if (stored) return stored; } catch {}
  memoryVoterId ??= crypto.randomUUID();
  try { localStorage.setItem('beastgames_voter_id',memoryVoterId); } catch {}
  return memoryVoterId;
}
