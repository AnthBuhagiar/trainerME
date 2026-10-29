#!/usr/bin/env bash
# Move Hour Power to a new address, e.g. hourpower.app. The old address keeps
# working as a permanent redirect, so links already shared still land.
# Usage (as root):  bash change-domain.sh hourpower.app
# Before running: point the new domain's DNS at this server (Cloudflare: an A
# record for the domain, value = this server's IP).
# Safe for other apps on the server: the Caddyfile is backed up, only Hour
# Power's site block is touched, and Caddy only reloads a config that validates.
set -euo pipefail
NEW="${1:?Usage: bash change-domain.sh hourpower.app}"
ENV=/etc/hour-power.env
CADDYFILE=/etc/caddy/Caddyfile

OLD="$(sed -n 's#^APP_URL=https://##p' "$ENV" | head -1)"
PORT="$(sed -n 's#^PORT=##p' "$ENV" | head -1)"
PORT="${PORT:-3100}"
[[ -n "$OLD" ]] || { echo "Couldn't find APP_URL in $ENV." >&2; exit 1; }
[[ "$OLD" != "$NEW" ]] || { echo "Hour Power is already on $NEW."; exit 0; }

backup="${CADDYFILE}.bak-$(date +%Y%m%d%H%M%S)"
cp "$CADDYFILE" "$backup"

# The old site block becomes a redirect; the new one serves the app.
python3 - "$CADDYFILE" "$OLD" "$NEW" "$PORT" <<'PY'
import re, sys
path, old, new, port = sys.argv[1:]
text = open(path).read()
lines, out, i = text.split("\n"), [], 0
found = False
while i < len(lines):
    line = lines[i]
    if re.match(rf"^{re.escape(old)}\s*\{{\s*$", line):
        depth, i = 1, i + 1
        while i < len(lines) and depth:
            depth += lines[i].count("{") - lines[i].count("}")
            i += 1
        out += [f"{old} {{", f"\tredir https://{new}{{uri}} permanent", "}"]
        found = True
        continue
    out.append(line)
    i += 1
body = "\n".join(out)
if not re.search(rf"^{re.escape(new)}\s*\{{", body, re.M):
    body = body.rstrip("\n") + f"\n\n# Hour Power\n{new} {{\n\tencode gzip\n\treverse_proxy 127.0.0.1:{port}\n}}\n"
open(path, "w").write(body)
print("Caddy: " + (f"{old} now redirects to {new}." if found else f"added {new}."))
PY

if ! caddy validate --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1; then
  cp "$backup" "$CADDYFILE"
  echo "The new Caddy config didn't validate; restored the backup. Nothing was changed." >&2
  exit 1
fi
systemctl reload caddy

sed -i "s#^APP_URL=.*#APP_URL=https://${NEW}#" "$ENV"
systemctl restart hour-power
echo "Hour Power now answers at https://${NEW} (and https://${OLD} redirects there)."
echo
echo "Two things left, in your browser:"
echo "  1. Strava API settings (strava.com/settings/api): set Authorization Callback Domain to ${NEW}"
echo "  2. Riders sign in again once on the new address (sign-in is per address)."
echo "If you set up the Strava webhook, subscribe it again with the new callback URL (see README)."
