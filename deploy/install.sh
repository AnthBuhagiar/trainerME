#!/usr/bin/env bash
# One-time setup of Hour Power on a server that already runs Caddy (e.g. a shared Droplet).
# Usage (as root):  bash install.sh hourpower.yourdomain.com
# Safe for other apps on the server: runs as its own user, on 127.0.0.1 only, memory-capped;
# the Caddyfile is backed up and only reloaded if the new config validates.
set -euo pipefail
DOMAIN="${1:?Usage: bash install.sh hourpower.yourdomain.com}"
PORT="${PORT:-3100}"
RAW="https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/deploy"
BASE=/opt/hour-power

if ss -ltn | grep -q ":${PORT} "; then
  echo "Port ${PORT} is already in use. Re-run with another, e.g.: PORT=3200 bash install.sh ${DOMAIN}" >&2
  exit 1
fi

# Node.js 20+ (the server.js runtime). Leave an existing new-enough Node alone.
if ! command -v node >/dev/null || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# A swap file gives a 1 GB server breathing room (skipped if there is swap already).
if [[ -z "$(swapon --show)" ]]; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

id hourpower >/dev/null 2>&1 || useradd --system --home "$BASE" --shell /usr/sbin/nologin hourpower
mkdir -p "$BASE/data" "$BASE/releases"
chown -R hourpower:hourpower "$BASE/data"

curl -fsSL -o "$BASE/update.sh" "$RAW/update.sh" && chmod 755 "$BASE/update.sh"
for unit in hour-power.service hour-power-update.service hour-power-update.timer; do
  curl -fsSL -o "/etc/systemd/system/$unit" "$RAW/$unit"
done

if [[ ! -f /etc/hour-power.env ]]; then
  umask 077
  cat > /etc/hour-power.env <<ENV
PORT=${PORT}
APP_URL=https://${DOMAIN}
SESSION_SECRET=$(openssl rand -hex 32)
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
INTERVALS_API_KEY=
ENV
  echo "Created /etc/hour-power.env"
fi

# Add the site to Caddy, keeping a backup and only reloading a config that validates.
CADDYFILE=/etc/caddy/Caddyfile
if ! grep -q "^${DOMAIN} " "$CADDYFILE"; then
  cp "$CADDYFILE" "${CADDYFILE}.bak-$(date +%Y%m%d%H%M%S)"
  printf '\n# Hour Power\n%s {\n\tencode gzip\n\treverse_proxy 127.0.0.1:%s\n}\n' "$DOMAIN" "$PORT" >> "$CADDYFILE"
  if caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1; then
    systemctl reload caddy
    echo "Added ${DOMAIN} to Caddy."
  else
    echo "The new Caddy config didn't validate; restoring the backup. Nothing else on the server was changed." >&2
    cp "$(ls -1t ${CADDYFILE}.bak-* | head -1)" "$CADDYFILE"
    exit 1
  fi
fi

systemctl daemon-reload
"$BASE/update.sh" || true
systemctl enable --now hour-power hour-power-update.timer
echo
echo "Done. Next: put your Strava keys in /etc/hour-power.env (nano /etc/hour-power.env), then: systemctl restart hour-power"
echo "Then open https://${DOMAIN}"
