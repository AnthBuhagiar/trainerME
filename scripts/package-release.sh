#!/usr/bin/env bash
# After `next build`: assemble the standalone server with its static files into hour-power.tar.gz.
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf release && mkdir -p release
cp -r .next/standalone release/hour-power
# Belt and braces: personal data and secrets must never ship.
rm -rf release/hour-power/data release/hour-power/.env*
if find release/hour-power -name 'strava-tokens.json' -o -name 'activities.json' | grep -q .; then
  echo "Refusing to package: personal data found in the build" >&2
  exit 1
fi
mkdir -p release/hour-power/.next
cp -r .next/static release/hour-power/.next/static
cp -r public release/hour-power/public
git rev-parse --short HEAD > release/hour-power/VERSION 2>/dev/null || date +%s > release/hour-power/VERSION
tar -czf release/hour-power.tar.gz -C release hour-power
echo "release/hour-power.tar.gz ($(du -h release/hour-power.tar.gz | cut -f1), version $(cat release/hour-power/VERSION))"
