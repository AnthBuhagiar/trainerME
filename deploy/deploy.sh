#!/usr/bin/env bash
# Update Hour Power on the server to the latest main and restart it.
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only origin main
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
docker image prune -f >/dev/null
echo "Hour Power is running the latest version."
