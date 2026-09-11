# Backend releases and SALP rollout

## Architecture and boundary

SALP hosts only static public UI and assets. DigitalOcean hosts Next.js 15 API/admin, uploads, and PostgreSQL (prefer a managed database or a separately maintained database service). Use a dedicated HTTPS API hostname. Keep the database private; publish the app only through a TLS reverse proxy. Static deployment must never include backend secrets.

Public routes have additive `/api/v1/` aliases; legacy `/api/` continues to work. `/api/v1/health` reports readiness. Admin routes are not exposed through the versioned public namespace and do not receive cross-origin access.

CORS uses exact configured origins. Set all actual Amazon origins from which the SALP instance runs, and any approved staging origins, in `CORS_ALLOWED_ORIGINS`. Confirm the actual origin in the browser. No wildcard Amazon subdomain matching is assumed. Also configure SALP CSP `connect-src` for the API, `img-src` for uploaded images, and the existing Adobe Typekit stylesheet/font hosts if required by the SALP integration. The supplied Terminal List README establishes packaging conventions; actual Amazon acceptance must still be tested on SALP.

Optional GA4 is configured with `VITE_GA_MEASUREMENT_ID` in the frontend environment (leave blank to disable); hash route pageviews are tracked without sending preview credentials. Allow the analytics hosts in SALP CSP if enabling it. The Next preview retains `NEXT_PUBLIC_GA_MEASUREMENT_ID`.

The frontend uses credentials-free public requests and a browser-generated UUID header for voting. The optional shared preview password uses a scoped JWT in session storage, so third-party cookie blocking does not break login. The API itself now enforces preview protection on players, stats, and votes. Admin uses its existing same-origin HttpOnly cookie. This shared preview password is not per-user authorization; static JS and assets are always downloadable.

## First deployment: existing database

The original repository had a Prisma schema but no migration history. The new `20260911000000_baseline` creates that full schema **for an empty database only**. Do not blindly apply it to the existing production DB.

1. Take a verified database backup and copy existing `uploads/` to persistent storage. Test this process on a staging clone first.
2. Compare the existing schema with the checked-in schema:

   ```bash
   npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > schema-review.sql
   ```

3. Review the SQL. Apply required additive changes separately and verify data. Do not run `db push --accept-data-loss`. Verify counter columns, vote type/identity columns, indexes, settings, and `OG` enum support.
4. With voting and admin vote writes paused, reconcile denormalized counters (`npm run db:backfill-votes`) and confirm totals against the Vote table. The legacy backfill is not safe during concurrent writes.
5. Only once the existing schema matches the baseline, mark it applied without executing CREATE TABLE statements:

   ```bash
   npx prisma migrate resolve --applied 20260911000000_baseline
   npm run db:deploy
   ```

6. Resume writes after readiness, admin login, images, voting, and totals pass staging checks.

For an empty database, `npm run db:deploy` applies the baseline directly. Subsequent schema changes must use new committed migrations; do not edit the baseline after deployment.

## Droplet preparation

Install Docker Engine with Compose v2, Nginx, and TLS certificates. Place `deploy/compose.yaml` at `/opt/beastgames/compose.yaml`. Create `/opt/beastgames/uploads/players`, owned by container UID 1000, and copy existing uploads there. Keep `/opt/beastgames/backend.env` readable only by the deployment operator:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@PRIVATE_DATABASE_HOST/beastgames?schema=public
JWT_SECRET=REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
CORS_ALLOWED_ORIGINS=https://ACTUAL_SALP_ORIGIN
NEXT_PUBLIC_SITE_URL=https://YOUR_API_HOST
```

Never commit this file. Use a different secret/database on staging. Include `deploy/nginx.conf.example` inside the appropriate HTTPS server block. The app binds only to loopback on the droplet; Nginx owns the public ports. Preserve uploaded files across every release. Back them up independently of images.

## Build, publish, and update

The manually dispatched `Build release artifacts` GitHub workflow builds a SALP ZIP for the selected GitHub environment and pushes `ghcr.io/<owner>/<repo>/backend:<commit-sha>`. Configure `VITE_API_BASE_URL` as a GitHub environment variable. Configure environment protection rules if desired. It **builds/publishes artifacts only**; it does not contact DigitalOcean or upload to SALP.

For a manual backend image build:

```bash
docker build --platform linux/amd64 -f deploy/Dockerfile -t YOUR_REGISTRY/beastgames-backend:COMMIT_SHA .
docker push YOUR_REGISTRY/beastgames-backend:COMMIT_SHA
```

Use the architecture of your droplet. Sign the droplet in to the image registry with a read-only pull credential. Copy `scripts/deploy-backend.sh` to the droplet. After reviewing the release, run there (or over your normal SSH connection):

```bash
bash /opt/beastgames/deploy-backend.sh YOUR_REGISTRY/beastgames-backend:COMMIT_SHA
```

The script pulls the immutable image, applies migrations using the image's pinned Prisma CLI, replaces the service, waits for database-backed health, and restores the previous application image on failed startup. It records `current-image` and `previous-image`. A single-instance replacement can briefly interrupt traffic; this is not a zero-downtime blue/green deployment. On the first container migration there is no previous recorded image to restore: keep the old PM2 service/config available until initial verification succeeds.

For later manual rollback, run the same script with the previous immutable image. **Database migrations are not reversed automatically.** Expand/contract schema changes are necessary for rollback to work. A failed migration stops the script before the app replacement and requires operator review.

## Independent release policy

1. Deploy the v1-capable backend bridge while the existing iframe still runs.
2. Verify `/api/v1/health`, allowlisted CORS, legacy API behavior, admin, uploads, and preview login.
3. Build/upload the SALP ZIP pointing at that backend; test on Amazon staging before production.
4. Retain the last two frontend ZIPs and backend image tags. Preserve uploaded assets and old hash-named frontend assets for in-flight browser sessions if SALP supports it.
5. Keep API v1 fields, types, meanings, and error semantics stable. Add optional fields rather than removing/renaming fields. New breaking behavior gets `/api/v2`, while v1 remains supported through frontend propagation and rollback windows.
6. Deploy additive DB migration + backward-compatible backend before the new frontend. Remove old columns/contracts only after old clients are retired.

A public client never retries a vote automatically. Its stable UUID supports browser daily limits, but deleting storage or choosing a new UUID can evade browser identity limits. The current burst limiter is process-local, not distributed anti-fraud protection. Before horizontal scaling or a high-profile public launch, add a shared rate limiter/bot-control strategy and load test the actual droplet/database size. The daily vote concurrency lock is already database-backed across processes.

## Still requires deployment-specific verification

Actual API hostname, Amazon origins/page ID/CSP, DigitalOcean credentials, database baseline state, TLS, persistent uploads, registry access, and SALP acceptance are environment-specific. No external deployment is performed by the local setup. Docker image execution is covered by the supplied workflow design but must be run on a Docker-capable machine; local native tests do not substitute for a container smoke test.
