#!/usr/bin/env bash
set -euo pipefail
# Run on the droplet after downloading deploy/compose.yaml, or invoke over SSH.
image="${1:?Usage: bash scripts/deploy-backend.sh registry/image:immutable-tag}"
[[ "$image" =~ ^[a-zA-Z0-9./:_@-]+$ ]] || { echo 'Invalid image reference'; exit 1; }
cd /opt/beastgames
export BACKEND_IMAGE="$image"
previous=$(cat current-image 2>/dev/null || true)
docker compose -f compose.yaml pull api
# Migrations must be additive while older frontend/backend versions are supported.
docker compose -f compose.yaml run --rm --no-deps api node node_modules/prisma/build/index.js migrate deploy
if docker compose -f compose.yaml up -d --wait --wait-timeout 120 api; then
  printf '%s\n' "$image" > current-image
  printf '%s\n' "$previous" > previous-image
else
  echo 'Health check failed; restoring previous application image (database is not reversed).'
  if [[ -n "$previous" ]]; then export BACKEND_IMAGE="$previous"; docker compose -f compose.yaml up -d --wait --wait-timeout 120 api; fi
  exit 1
fi
