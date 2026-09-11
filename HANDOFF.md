# Reviewed checkpoint — September 11, 2026

## Latest session

The original work was already committed as `fc85114` ("Pass 1"). This follow-up reviews and fixes the checkpoint; nothing has been pushed or deployed externally.

### Completed and verified

- Fixed PostgreSQL restart: it now reuses the saved cluster instead of rerunning initdb.
- Verified local browser directory rendering and normal admin cookie login after React hydration.
- Added `npm run local` to start the database, backend/admin, and frontend together; Ctrl-C stops the owned processes.
- Fixed standalone/Docker build failure caused by passing an undefined DATABASE_URL into Prisma. A clean build without root `.env` or database credentials now succeeds.
- Set an explicit tracing root and ESLint root so isolated checkouts do not inherit parent-project files/configuration.
- Fixed admin same-origin checks to use the browser-facing Host and proxy scheme; added localhost/proxy regressions.
- Hardened admin JWT identity validation and added a regression test.
- Clean `npm ci`, typecheck, credential-free standalone build, regular backend build, 9 unit tests, and 8 browser/API tests passed.
- Standalone runtime using the Docker file layout passed readiness, v1/legacy responses, admin login, image upload/retrieval; its packaged Prisma CLI reports schema up to date.
- Migration rehearsal passed against a temporary clone of the local database with migration history removed: 200 players, 1,000,010 votes and exact counters preserved. The clone was deleted; source data retained.
- CI now includes the rehearsal and a Linux Docker build/migrate/non-root-runtime smoke test. Workflow/Compose YAML and shell syntax were checked. **Actual Docker/Linux execution and GitHub Actions remain unrun** because Docker/gh are not installed here; no push was performed.
- Both local and staging SALP artifacts were built and their three templates, asset references, and API configurations verified.

### Confirmed staging configuration

API: `https://bg-api.lightsailvr.com/api/v1`
SALP page: `https://www.amazon.com/salp/beastgames-s3contestants`
SALP ID: `beastgames-s3contestants`
CORS origin: `https://www.amazon.com`

The local staging env is written; its reproducible public defaults are checked into `environments/.env.staging.example`. Private backend values belong in the server environment, using `deploy/staging.env.example` as the template. The local development env remains independent. No verified readiness response was obtained from the staging hostname.

Staging ZIP: `artifacts/staging/beastgames-s3contestants_staging_2026-09-11.zip`.
Local ZIP: `artifacts/local/beastgames_local_2026-09-11.zip`.

### Test later today

```bash
npm run local
```

UI: http://127.0.0.1:5173
Admin: http://127.0.0.1:3000/admin
Login: `local_admin` / `local-beastgames-admin`

Use the existing `.env` and fixture data; no install/migration/seed is needed on this Mac. Ctrl-C stops the stack and retains the database. On a fresh checkout, follow README setup first. Do not run `npm run local` alongside separately started database/dev processes.

### Next steps

1. Push the reviewed commit when ready and run the `Validate` GitHub workflow; investigate any Docker/Linux/PostgreSQL 16 differences before releasing. Neither CI execution nor image publication has been claimed as completed.
2. Provision staging and configure DNS/TLS, registry pull access, private database credentials, upload ownership/backups, and JWT secret. See DEPLOYMENT for the recommended **2-vCPU/4-GiB Basic Droplet plus 2-GiB Managed PostgreSQL** (indicative $54.45/month before extras, checked September 11).
3. Clone the real existing database into staging and inspect its actual schema drift before baselining. The successful local rehearsal proves the procedure for a matching schema, not the state of the old DigitalOcean database.
4. Deploy the API bridge first, then upload the staging ZIP to SALP. Verify CSP, exact origin, hash navigation, all client templates, admin, and real uploaded portraits.
5. Repeat event-sized read/write load and mobile/first-visit tests on the actual infrastructure. Local results are not a launch-capacity guarantee; add distributed rate limiting/bot controls and consider HA before public launch.

### Retained measurements

Previous million-vote HTTP run: players p95 ~99 ms, stats p95 ~35 ms, 0 errors at concurrency 10. Original stats handler 3.1–4.8 seconds vs revised ~52 ms cold / 2–3 ms warm in direct-handler tests. Last mobile throttle measurement: ~2.7 seconds data-ready / 3.2 seconds LCP. Daily aggregates intentionally cache for five seconds. See PERFORMANCE_OPTIMIZATIONS for details.

Reports in `artifacts/` are ignored, including `artifacts/migration/rehearsal.json`. The temporary clean-build checkout was removed after validation; its build log is retained at `artifacts/validation/clean-build.log`. Keep `.local/postgres` to preserve fixtures.
