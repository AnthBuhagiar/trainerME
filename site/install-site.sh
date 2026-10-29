#!/usr/bin/env bash
# Publish the Hour Power website at www.hourpowerapp.cc on the Droplet that already runs Caddy.
# The website is separate from the app: Caddy serves this one static page; the app's site block is never touched.
#
# On the Droplet:
#   curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/site/install-site.sh | sudo bash
#
# Safe to re-run to publish a new version of site/index.html. The Caddyfile is backed up,
# and Caddy only reloads a config that validates.
set -euo pipefail
DOMAIN="${DOMAIN:-www.hourpowerapp.cc}"
SITE_DIR=/var/www/hour-power-site
CADDYFILE=/etc/caddy/Caddyfile
SOURCE="${SOURCE:-https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/site/index.html}"

mkdir -p "$SITE_DIR"
tmp=$(mktemp)
curl -fsSL "$SOURCE" -o "$tmp"
grep -q "<title>Hour Power</title>" "$tmp" || { echo "Downloaded page doesn't look right; nothing changed." >&2; exit 1; }
install -m 644 "$tmp" "$SITE_DIR/index.html"
rm -f "$tmp"
echo "Website copied to $SITE_DIR."

if grep -q "^${DOMAIN} " "$CADDYFILE"; then
  echo "Caddy already serves ${DOMAIN}; the new page is live."
  exit 0
fi
backup="${CADDYFILE}.bak-$(date +%Y%m%d%H%M%S)"
cp "$CADDYFILE" "$backup"
printf '\n# Hour Power website\n%s {\n\tencode gzip\n\troot * %s\n\tfile_server\n}\n' "$DOMAIN" "$SITE_DIR" >> "$CADDYFILE"
if caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1; then
  systemctl reload caddy
  echo "Added ${DOMAIN} to Caddy. Its HTTPS certificate can take a minute the first time."
else
  cp "$backup" "$CADDYFILE"
  echo "The new Caddy config didn't validate; restored the backup. Nothing else was changed." >&2
  exit 1
fi
