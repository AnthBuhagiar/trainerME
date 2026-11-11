#!/usr/bin/env bash
# Download the latest Hour Power release from GitHub and switch to it if it's new.
#
# Public repository: downloads straight from the release page.
# Private repository: needs a read-only GitHub token in /etc/hour-power.env:
#   HOUR_POWER_GITHUB_TOKEN=github_pat_...
# (fine-grained, this repository only, Contents: read-only). The token is never printed
# and never put on a command line, so other users on the server can't see it.
set -euo pipefail
REPO="AnthBuhagiar/trainerME"
BASE=/opt/hour-power
ASSET=hour-power.tar.gz
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

token="${HOUR_POWER_GITHUB_TOKEN:-}"
if [[ -z "$token" && -r /etc/hour-power.env ]]; then
  token=$(sed -n 's/^HOUR_POWER_GITHUB_TOKEN=//p' /etc/hour-power.env | tail -n 1 | tr -d "\r\"' ")
fi

if [[ -n "$token" ]]; then
  # The token goes in a header file only this script can read (the temp folder is private).
  printf 'Authorization: Bearer %s\n' "$token" > "$tmp/auth"
  api="https://api.github.com/repos/${REPO}"
  if ! curl -fsSL -H @"$tmp/auth" -H "Accept: application/vnd.github+json" -o "$tmp/release.json" "$api/releases/tags/latest"; then
    echo "GitHub refused the release lookup. Check HOUR_POWER_GITHUB_TOKEN in /etc/hour-power.env: it may have expired, or not have read access to ${REPO}." >&2
    exit 1
  fi
  id=$(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const a=(r.assets||[]).find(a=>a.name===process.argv[2]);if(!a)process.exit(1);console.log(a.id)' "$tmp/release.json" "$ASSET") || {
    echo "The latest release has no ${ASSET}." >&2
    exit 1
  }
  # curl drops the token when GitHub redirects the download to its file storage.
  curl -fsSL -H @"$tmp/auth" -H "Accept: application/octet-stream" -o "$tmp/release.tar.gz" "$api/releases/assets/$id"
  rm -f "$tmp/auth"
else
  curl -fsSL -o "$tmp/release.tar.gz" "https://github.com/${REPO}/releases/download/latest/${ASSET}"
fi

tar -xzf "$tmp/release.tar.gz" -C "$tmp"
new=$(cat "$tmp/hour-power/VERSION")
current=$(cat "$BASE/current/VERSION" 2>/dev/null || echo none)
if [[ "$new" == "$current" ]]; then
  exit 0
fi
mkdir -p "$BASE/releases"
rm -rf "$BASE/releases/$new"
mv "$tmp/hour-power" "$BASE/releases/$new"
chown -R hourpower:hourpower "$BASE/releases/$new" # lets Next write its own cache
ln -sfn "$BASE/releases/$new" "$BASE/current"
systemctl restart hour-power
# Keep the two newest releases.
ls -1dt "$BASE"/releases/* | tail -n +3 | xargs -r rm -rf
echo "Hour Power updated: $current -> $new"
