#!/usr/bin/env bash
# Publish the Hour Power website at www.hourpowerapp.cc on the Droplet that already runs Caddy.
# The website is separate from the app: Caddy serves this one static page; the app's site block is never touched.
#
# On the Droplet:
#   curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/site/install-site.sh | sudo bash
#
# It also turns on auto-update: every 15 minutes the Droplet downloads site/index.html from main
# and publishes it if it changed. Safe to re-run. The Caddyfile is backed up, and Caddy only
# reloads a config that validates.
set -euo pipefail
DOMAIN="${DOMAIN:-www.hourpowerapp.cc}"
SITE_DIR=/var/www/hour-power-site
CADDYFILE=/etc/caddy/Caddyfile
SOURCE="${SOURCE:-https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/site/index.html}"

# The updater: downloads the page from GitHub and replaces it only when it changed.
# It never runs code from GitHub, only copies the one HTML page.
cat > /usr/local/bin/hour-power-site-update <<UPDATER
#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$SITE_DIR"
tmp=\$(mktemp)
trap 'rm -f "\$tmp"' EXIT
curl -fsSL "$SOURCE" -o "\$tmp"
grep -q "<title>Hour Power</title>" "\$tmp" || { echo "Downloaded page doesn't look right; kept the current one." >&2; exit 1; }
if cmp -s "\$tmp" "$SITE_DIR/index.html"; then echo "Website already up to date."; exit 0; fi
install -m 644 "\$tmp" "$SITE_DIR/index.html"
echo "Website updated."
UPDATER
chmod 755 /usr/local/bin/hour-power-site-update

# Check GitHub every 15 minutes, like the app's own updater.
cat > /etc/systemd/system/hour-power-site-update.service <<UNIT
[Unit]
Description=Update the Hour Power website from GitHub
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/hour-power-site-update
UNIT
cat > /etc/systemd/system/hour-power-site-update.timer <<UNIT
[Unit]
Description=Check for a new Hour Power website every 15 minutes

[Timer]
OnBootSec=3min
OnUnitActiveSec=15min

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now hour-power-site-update.timer >/dev/null
/usr/local/bin/hour-power-site-update
echo "Auto-update on: the website checks GitHub every 15 minutes."

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
