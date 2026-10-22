#!/usr/bin/env bash
# Download the latest Hour Power release from GitHub and switch to it if it's new.
set -euo pipefail
REPO="AnthBuhagiar/trainerME"
BASE=/opt/hour-power
URL="https://github.com/${REPO}/releases/download/latest/hour-power.tar.gz"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL -o "$tmp/release.tar.gz" "$URL"
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
