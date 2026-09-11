#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Use the local fixture database}"
: "${JWT_SECRET:?JWT_SECRET required}"
# Linux CI host networking reaches the PostgreSQL service on loopback.
[[ "$(uname -s)" == Linux ]] || { echo 'Run this Docker smoke test on Linux/CI.'; exit 1; }
name="beastgames-smoke-$$"
image="beastgames-smoke:local"
cleanup() { docker logs "$name" > artifacts/docker.log 2>&1 || true; docker rm -f "$name" >/dev/null 2>&1 || true; }
mkdir -p artifacts
trap cleanup EXIT
docker build -f deploy/Dockerfile -t "$image" .
docker run --rm --network host -e DATABASE_URL "$image" node node_modules/prisma/build/index.js migrate deploy
docker run -d --name "$name" --network host -e DATABASE_URL -e JWT_SECRET -e PORT=3100 \
  --tmpfs /app/uploads:uid=1000,gid=1000,mode=0755 "$image"
SMOKE_BASE_URL=http://127.0.0.1:3100 node scripts/smoke-backend.mjs
