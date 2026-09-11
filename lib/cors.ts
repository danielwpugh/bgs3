export const publicPaths = /^\/api\/(?:v1\/)?(?:players(?:\/[^/]+)?|stats|votes|settings|track-visitor|health|frontend-auth\/(?:login|logout|verify))$/;
export function allowedOrigin(origin: string | null, ownOrigin: string, configured: string): boolean {
  return !origin || origin === ownOrigin || configured.split(',').map(s => s.trim()).filter(Boolean).includes(origin);
}
