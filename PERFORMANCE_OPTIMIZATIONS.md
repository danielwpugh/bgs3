# Performance work and measured results

Measurements below are from September 10, 2026, on the local Mac using a production Next build, native PostgreSQL 18, 200 fixture players, and approximately one million votes. They are not DigitalOcean/SALP production guarantees. CI uses PostgreSQL 16. Real player portrait assets were not provided.

## Changes

- Removed per-player database queries from public statistics.
- Replaced loading every vote into Node with a SQL date aggregation. Grouping by the date itself avoids formatting every individual timestamp.
- Read leaderboard/team/total counts from denormalized player counters in a single query.
- Cache daily aggregates for five seconds per process. Concurrent misses share one query; failures are evicted. Player totals still read fresh counters, and accepted votes return the committed count immediately.
- Cached filesystem image resolution (including missing-number lookups) for 30 seconds.
- Removed browser cache-busting timestamps and unnecessary preflight-triggering cache headers from player-list requests. Responses remain `no-store` for freshness and preview privacy.
- Lazy-load player-grid images and route bundles. Disable expensive automatic network probes for every missing portrait.
- Ship optimized WebP UI images with a smaller mobile decorative background. Preserve original source images in the repository; the SALP ZIP contains optimized images.
- Scope public CSS to the SALP app root and use hashed JS/CSS bundles.

## Recorded API results

Read-only HTTP test: 200 requests per endpoint, concurrency 10, default p95 budget 500 ms.

| Dataset / implementation | Players p95 | Stats p95 | HTTP failures |
| --- | ---: | ---: | ---: |
| 100k votes, first SQL rewrite | 55 ms | 100 ms | 0 |
| 1m votes, first SQL rewrite without cache | 52 ms | 974 ms | 0 |
| 1m votes, final date grouping + aggregate cache | 99 ms | 35 ms | 0 |

The uncached million-vote test intentionally failed its 500 ms stats budget and prompted the second optimization. Final stats first-request time was approximately 55 ms; warm p50 was 28 ms through HTTP.

A separate same-database direct-handler comparison used the original `HEAD` stats source and the revised handler. Five original calls took 3,133–4,796 ms. The revised first call took 52 ms and subsequent warm calls took 2–3 ms. This isolates handler behavior and excludes HTTP overhead. The comparison runner and raw original source are retained locally in `.local/`; measured JSON is under `artifacts/performance/stats-before-after.json`.

## Reproduction

Start the isolated database, production API, and SALP preview as described in README. Then:

```bash
TEST_VOTES=1000000 npm run db:seed:test
npm run test:performance
npm run test:page-performance
```

`API_BASE_URL`, `PERF_REQUESTS`, `PERF_CONCURRENCY`, and `PERF_P95_MS` configure the API test. `PREVIEW_TOKEN` can authorize read-only testing of a protected preview. The script checks HTTP failures and fails the process when p95 exceeds the budget. It writes timestamped JSON under `artifacts/performance/`.

The page script records data-ready time, largest-contentful-paint (LCP), transfer bytes visible to Resource Timing, request count, and screenshots. It runs with a 390×844 viewport, with and without simulated 1.6 Mbps download, 150 ms latency, and 4× CPU slowdown. It disables browser cache and dismisses the first-visit welcome modal. It currently reports metrics rather than enforcing a page-load budget. Cross-origin resource sizes may be unavailable without Timing-Allow-Origin; transfer bytes are not an exhaustive network accounting.

The initial mobile run exposed a 12-second LCP from a large decorative image despite statistics appearing within about 2.6 seconds. Responsive background assets were added afterward. After that change, the final run measured ~203 ms data-ready / 220 ms LCP unthrottled, and ~2,671 ms data-ready / 3,176 ms LCP under the mobile throttle. The final ZIP is about 1.6 MB. The latest final measurement is in `artifacts/performance/page-load.json`; repeat this on actual SALP before claiming production page-load performance. Local preview serves assets without assuming Amazon's CDN compression or caching behavior.

## Follow-up work

1. Run the browser performance script on final assets and real SALP staging, both first-visit (welcome modal) and returning-visitor paths; set practical LCP/data-ready budgets.
2. Repeat load tests against the intended droplet size and database using production-sized portraits and realistic concurrent reads/writes. Include sustained runs spanning multiple five-second cache expiries.
3. Check uploaded portrait dimensions and caching; API improvements do not solve oversized portrait downloads.
4. Validate counter consistency before migrating existing data. Reconcile while writes are paused.
5. For sustained larger traffic, consider maintained daily totals or a shared cache instead of repeated per-process SQL aggregation; add distributed rate limiting before multiple app replicas.
6. Profile the admin analytics endpoint separately: this pass optimizes the public landing page and directory, not all historical admin exports/analytics.

The five-second chart staleness is intentional. The daily vote rule uses Pacific dates; daily chart grouping retains UTC dates. They are different reporting boundaries and should be documented or unified in a separately reviewed product change.
