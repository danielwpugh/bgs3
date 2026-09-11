# Development and environment testing

Follow the quick start in README first. Backend environment variables come from root `.env`; frontend values come from `environments/.env.development`, `.env.staging`, or `.env.production`. Vite reserves the word `local` as an env-file suffix, so the local frontend uses Vite's `development` mode. ZIP directories still use `local`.

| Workflow | Command | Purpose |
| --- | --- | --- |
| Both dev servers | `npm run dev` | React hot reload on 5173; Next API/admin on 3000 |
| API/admin only | `npm run dev:backend` | Backend development |
| Static frontend only | `npm run dev:frontend` | Can target a separately running backend |
| Plain static output | `npm run build:frontend` | Vite output under `dist/` |
| Plain static preview | `npm run preview:frontend` | Preview `dist/` before a SALP-path build |
| SALP local ZIP | `npm run build:salp` | Local API URL, SALP structure |
| SALP preview | `npm run preview:salp` | Serve actual packaged fragments and assets |
| Staging ZIP | `npm run build:salp:staging` | Public HTTPS staging API |
| Production ZIP | `npm run build:salp:production` | Public HTTPS production API |
| Local DB, native | `npm run db:local:native` | Persistent isolated PostgreSQL; leave running |
| Local DB, Docker | `npm run db:local` | Detached PostgreSQL 16; use instead of native |
| Apply schema | `npm run db:deploy` | Apply committed migrations |
| Fixtures | `npm run db:seed:test` | Replace local fixture data; default 100k votes |
| Unit checks | `npm test` | API URL/version behavior, CORS, short-cache semantics |
| Browser integration | `npm run test:e2e` | Real DB + production backend + packaged SALP |

Only one server can bind each port. For production-like local testing, stop `npm run dev`, run backend/SALP builds, then use `npm start` and `npm run preview:salp`. The native DB may remain running. Don't use `vite preview` for a SALP build: use the SALP preview server to reconstruct the HTML fragments.

## Data and credentials

`.env.example` provides an isolated local URL and development-only JWT secret. Set a random secret of at least 32 characters on any shared server. Never copy root `.env` into a SALP package. Staging and production need separate databases, secrets, uploaded-image storage, and API origins.

The old `npm run db:seed` is retained for the original admin account workflow; it changes that account's password. Use `db:seed:test` for local fixtures instead. `db:backfill-votes` is the legacy reconciliation script and must run while vote writes are paused; it is not a migration or safe live counter repair.

## Release compatibility checks

1. Build the backend and current ZIP; run automated tests.
2. Run a retained previous ZIP against the new staging backend, including password login, votes, errors, and images.
3. Run the new ZIP against the previous supported backend **that already exposes API v1**.
4. Verify missing players, eliminated players, paused voting, daily limits, and image changes without rebuilding the frontend.
5. Upload to actual SALP staging and check Amazon CSP, allowed API origin, fonts, asset caching, hash routing, and desktop/mobile/living-room environments.

The new ZIP cannot run against the original pre-v1 backend. Deploy the bridge backend first. Extra API response fields are tolerated; removing or changing existing fields requires v2. A changed API version produces a visible error rather than silently interpreting a different response.

## Diagnostics

- API readiness: `/api/v1/health`, including DB schema checks and release ID.
- `/api/v1/players` and `/api/v1/stats` expose `Server-Timing` for handler time.
- Check browser network requests for the configured HTTPS API and `/gp/video/static/sl/lp/<pageId>/` assets.
- Uploaded portraits use the backend origin, not Amazon's static asset origin.
- Match `CORS_ALLOWED_ORIGINS` to the exact frontend origin (scheme, host, port). No paths, wildcards, or `null` origins.
- If a different backend is selected during local testing, clear site storage to discard an old preview token.
- User-facing votes are not automatically retried after timeouts: a response could be lost after the vote committed.
