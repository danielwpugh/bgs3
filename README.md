# Beast Games: SALP frontend + DigitalOcean backend

The public UI is a static React/Vite application packaged for Amazon SALP. The existing Next.js application runs the API, PostgreSQL access, image uploads, and admin interface on DigitalOcean. No iframe or frontend Node server is needed on SALP.

## Test locally today — September 11, 2026

The saved database is configured with 200 players and approximately one million votes. From this repository, run:

```bash
npm run local
```

This starts the saved PostgreSQL database, API/admin, and frontend together. Open **http://127.0.0.1:5173** for the UI and **http://127.0.0.1:3000/admin** for admin (`local_admin` / `local-beastgames-admin`). Ctrl-C stops all three; data stays on disk. Do not start the separate database/dev commands at the same time. On a fresh machine, complete the setup below first.

The reviewed checkpoint fixes database restart and credential-free image builds. Clean installation/build, standalone runtime, migration rehearsal, and browser checks are recorded in [HANDOFF.md](HANDOFF.md). No external deployment has been made. Docker/Linux and GitHub Actions execution still require a Docker-capable machine or pushing the committed workflow.

Staging is configured for `https://bg-api.lightsailvr.com/api/v1`, Amazon origin `https://www.amazon.com`, and page ID `beastgames-s3contestants`. `npm run build:salp:staging` produces the corresponding ZIP. Local builds keep their own localhost configuration. The [deployment notes](DEPLOYMENT.md) include the recommended DigitalOcean Droplet/database sizes and the existing-database baseline procedure.

## Local quick start

Use Node 22 LTS and npm. From this repository:

```bash
npm ci
cp .env.example .env  # only on first setup; keep any existing credentials
npm run db:generate
npm run db:local:native
```

Leave that terminal running. This starts an isolated PostgreSQL instance bound to `127.0.0.1:5433`, retaining data under `.local/postgres`. Docker users can instead run `npm run db:local` (PostgreSQL 16). Do not run both on the same port.

In another terminal:

```bash
npm run db:deploy
npm run db:seed:test
npm run dev
```

- Public frontend: http://127.0.0.1:5173
- Backend/admin: http://127.0.0.1:3000/admin
- API readiness: http://127.0.0.1:3000/api/v1/health
- Fixture admin: `local_admin` / `local-beastgames-admin`

Fixtures create 200 players and 100,000 votes. They refuse remote databases, database names not ending in `_local`, and databases containing non-fixture players. Re-running replaces **all fixture players/votes/settings** and resets the local admin password. For heavier testing: `TEST_VOTES=1000000 npm run db:seed:test`. Portraits/uploads from the previous server are not included in this repository.

## Build and preview the actual SALP package

```bash
npm run build:salp
npm run preview:salp
```

Open http://127.0.0.1:4173. This preview reconstructs the page from the packaged `head.html` and `body.html` and serves the actual SALP asset paths. Add `?client=mobile` or `?client=living_room` to test those templates. Player navigation uses `#/players/<slug>`, so reloads do not need server rewrites.

The local ZIP is under `artifacts/local/`. **It points to localhost and is only for local testing.** For a SALP upload, build against a reachable HTTPS API:

```bash
cp environments/.env.staging.example environments/.env.staging
# Edit VITE_API_BASE_URL to the real staging API, ending in /api/v1
npm run build:salp:staging
```

Use `.env.production` and `npm run build:salp:production` for production. These files live in `environments/`, separate from the backend `.env`. Only public API configuration belongs in them. Builds reject missing URLs, localhost, and insecure HTTP outside local mode. `SALP_PAGE_ID` defaults to `beastgames`; change it only to the page ID assigned in SALP.

```text
artifacts/staging/beastgames_staging_YYYY-MM-DD.zip
└── beastgames/
    ├── desktop/en_US/{head,body}.html
    ├── mobile/en_US/{head,body}.html
    ├── living_room/en_US/{head,body}.html
    └── gp/video/static/sl/lp/beastgames/
        ├── css/
        ├── js/
        └── images/
```

The three templates share a responsive app. UI styles are scoped to `#beastgames-root`. Hashed JS/CSS names prevent stale chunk reuse. `js/config.js` contains the public environment configuration; templates load it before the app. The ZIP contains no admin code, database credentials, or API server.

## Validation

```bash
npm run typecheck
npm test
npm run build:backend
npm run build:salp
npm run test:e2e
```

Browser tests use Google Chrome locally and Playwright Chromium in CI. The tests start the production API and SALP preview if those ports are free; stop development servers first. Use **only the local fixture database**: tests submit votes and temporarily change preview-password settings. CI provisions a PostgreSQL 16 service and builds the ZIP as an artifact.

For performance tests, start `npm start` and `npm run preview:salp`, then:

```bash
npm run test:performance
npm run test:page-performance
```

See [PERFORMANCE_OPTIMIZATIONS.md](PERFORMANCE_OPTIMIZATIONS.md) for methodology, results, thresholds, and remaining limitations. See [DEPLOYMENT.md](DEPLOYMENT.md) for the first migration of an existing database, image releases, rollback, and staggered frontend/backend updates. [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) explains the development and testing matrix.

## Source layout

- `frontend/`: static entry point and hash-navigation adapters; lazily loads existing public screens.
- `app/`, `components/`: shared public screens plus Next-only admin and route handlers.
- `lib/public-client.ts`: explicit API, asset, and backend media URL handling.
- `app/api/`: legacy `/api/*` handlers; public `/api/v1/*` aliases are handled in middleware.
- `prisma/migrations/`: committed schema baseline for new databases.
- `scripts/`: packaging, SALP preview, fixtures, load tests, deployment.
- `deploy/`: backend Docker image, Compose configuration, Nginx example.

The older unversioned API and Next public pages remain available during transition. New public clients use API v1. Admin stays same-origin on the backend.
