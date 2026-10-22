#!/usr/bin/env bash
# Update Hour Power on the server to the latest main and restart it.
#   ./deploy/deploy.sh           app + Caddy (a server with nothing else on ports 80/443)
#   ./deploy/deploy.sh --shared  app only, for a server whose existing web server forwards to it
set -euo pipefail
cd "$(dirname "$0")/.."
git pull --ff-only origin main
services=()
[[ "${1:-}" == "--shared" ]] && services=(app)
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build "${services[@]}"
docker image prune -f >/dev/null
echo "Hour Power is running the latest version."
