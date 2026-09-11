# Pause checkpoint — September 10, 2026

## Current status

Work is saved in this working tree, uncommitted. No changes were deployed to DigitalOcean or Amazon. Local services were stopped for the break; database contents and build artifacts are retained. Read README first for startup commands.

Implemented:

- Vite static public frontend sharing existing React screens, with hash navigation and API/media URL separation.
- SALP ZIP generator with desktop/mobile/living_room en_US templates and css/js/images asset routing.
- Separate frontend development/staging/production configuration; runtime public config in the package.
- Versioned public API bridge (`/api/v1`) while retaining legacy `/api` and Next public pages.
- Exact-origin CORS, credentials-free SALP voting, preview JWT header support, and server-side preview data protection.
- Database-backed locking for simultaneous same-day votes; bounded short caches and read-path optimizations.
- Responsive WebP assets and scoped CSS. Optional GA4 configuration for the static frontend.
- New-database migration baseline, guarded fixtures, native local PostgreSQL or Docker Compose setup.
- Docker backend build, deployment/rollback script, Nginx example, CI and manually dispatched release-artifact workflows.
- README, LOCAL_DEVELOPMENT, DEPLOYMENT, and PERFORMANCE_OPTIMIZATIONS updated.

## Validation completed

- `npm run typecheck`: passed for backend and frontend.
- `npm test`: 7 passed.
- `npm run build:backend`: passed on Next.js 15.5.25. Existing hook/image lint warnings remain non-fatal.
- `npm run build:salp`: passed. Latest local ZIP: `artifacts/local/beastgames_local_2026-09-11.zip` (~1.6 MB).
- `npm run test:e2e`: 8 passed: admin login/CSV/image upload, preview password without cookies, API failure/retry, living-room CSS isolation, navigation/search/voting, CORS/version/legacy shape, concurrent daily limits, mobile layout.
- `npm run test:performance`: final million-vote HTTP run passed a 500 ms p95 budget. Player list p95 ~99 ms; stats p95 ~35 ms; no failures at 10 concurrent requests, 200 requests/endpoint.
- Same-database original stats handler: 3.1–4.8 seconds; revised handler ~52 ms cold, 2–3 ms warm. These are local measurements, not production claims.
- Final page measurement: 390×844 viewport, unthrottled ~203 ms data-ready / 220 ms LCP; 1.6 Mbps, 150 ms latency, 4× CPU slowdown ~2,671 ms data-ready / 3,176 ms LCP. Returning visitor; welcome modal dismissed. Actual portraits are absent.
- Last dependency install reported zero npm audit vulnerabilities. Next updated from 14 to patched 15; PostCSS override and CSV/Sharp/test-runner updates are in the lockfile.
- `git diff --check`: passed.

Raw reports/screenshots: `artifacts/performance/`. Playwright report/traces: `playwright-report/` and `test-results/`. Those directories are ignored. The original-handler comparison source/runner is under `.local/`, also ignored.

## Pick up here

1. **Review the changes and commit a checkpoint.** No commit was created. Check the split's shared-screen/Next adapters and the API compatibility policy before treating this as release-ready.
2. **Run from a clean install/CI and smoke-test Docker.** Docker is not installed locally; the container, registry push, GitHub workflows, and droplet rollback have not been executed. Verify `npm ci`, a clean typecheck/build, PostgreSQL 16 CI, standalone runtime, uploads ownership, and migrations inside the image. `.dockerignore` excludes local DB and secrets.
3. **Review UI and performance with real portraits.** The synthetic fixture has 200 players and ~1m votes but no real portrait dataset. Check first-visit welcome images, desktop and actual SALP living-room behavior, uploaded images, slow connections, and long tests covering multiple cache expirations. The mobile LCP result still exceeds a 2.5-second goal; investigate font/CDN compression and image scheduling before defining an enforced budget.
4. **Configure a staging target.** Supply actual HTTPS API hostname, exact Amazon frontend origins, SALP page ID and CSP requirements, and an isolated staging database/uploads. Fill `environments/.env.staging`; build `npm run build:salp:staging`. The current ZIP points to localhost and is not suitable for a SALP upload.
5. **Rehearse the existing-database migration on a staging clone.** Read DEPLOYMENT carefully. The new baseline creates an empty DB; existing production needs schema comparison, reviewed additive updates, paused-write counter reconciliation, then marking the baseline applied. Never run this baseline blindly on the existing production database.
6. **Deploy the compatibility bridge backend first.** Verify legacy iframe behavior, `/api/v1/health`, CORS, admin, and uploads. Then upload the new SALP frontend. Keep prior ZIP/image artifacts for rollback; retain API v1 semantics.
7. **Before large-scale rollout**, add distributed rate limiting/bot-control as appropriate. The browser UUID can be reset and the burst limiter is process-local. Admin historical analytics has not been performance-reworked.

## Resume locally

Terminal 1:

```bash
npm run db:local:native
```

Terminal 2:

```bash
npm run dev
```

Public UI: http://127.0.0.1:5173
Admin: http://127.0.0.1:3000/admin
Fixture admin: `local_admin` / `local-beastgames-admin`

Root `.env` already contains local-only configuration. Database data persists in `.local/postgres`; reseeding is optional and replaces fixture data. For production-style package testing, stop dev servers, build backend/SALP, then use `npm start` and `npm run preview:salp`, or let the browser-test runner start them.

## Implementation notes

- Daily chart/today aggregates can lag up to 5 seconds; player counters and accepted-vote responses are fresh. Daily limit uses Pacific dates; chart buckets use UTC.
- Existing database deployments must have correct denormalized counters; legacy fallback queries for missing schema were removed from public read paths in favor of explicit migration/readiness checks.
- Native local PostgreSQL is version 18; Compose and CI use version 16. SQL is intended to work on both, but CI must still be run.
- Backend source keeps the legacy public pages during transition; the Vite dependency graph excludes admin/API modules from the SALP ZIP.
- Browser admin API test explicitly carries the issued Secure cookie on loopback HTTP. Real production admin access requires HTTPS; normal local admin development uses `npm run dev`.
- Stage/prod builds, real SALP acceptance, and real DigitalOcean rollout remain unverified.
