# Security notes

What protects a hosted Hour Power, and what's knowingly left open.

## Dependencies

- CI (`.github/workflows/ci.yml`) runs `npm run audit:ci` on every pull request. It fails on any high or critical npm advisory that isn't accepted in `security/audit-allowlist.json`; each accepted one carries a reachability note and a review date, after which it fails again.
- Dependabot (`.github/dependabot.yml`) opens weekly update pull requests for npm packages and GitHub Actions.

### Known advisories (November 2026)

| Advisory | Severity | Where | Why it isn't reachable |
|---|---|---|---|
| GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 | high | postcss 8.4.31 bundled by next@15 | Build-time only, on the app's own CSS. Overriding to postcss 8.5 breaks `next/font`; fixed by Next 16. Accepted until 2027-02-01. |
| GHSA-qx2v-qp2m-jg93, GHSA-fxqj-rqcc-2cmp | moderate | same postcss | Same as above. |
| GHSA-g3hv-75wg-m249 | moderate | minimatch 10 under typescript-eslint (lint only) | Dev tooling; globs come from the repo's own config, never from riders. No typescript-eslint release accepts the fixed minimatch 11 yet. |

## Credentials at rest

- Riders' Strava and Garmin tokens (`strava-tokens.json`, `garmin-tokens.json` in each rider's folder) are encrypted with AES-256-GCM (`src/lib/data/secrets.ts`) using `TRAINERME_SECRET_KEY` (32 bytes, `openssl rand -hex 32`). Each file stores the key's id with the ciphertext.
- Files written before encryption are read as they are and encrypted on that first read, so existing riders keep syncing and sending.
- Changing the key: set the new one as `TRAINERME_SECRET_KEY` and the old one in `TRAINERME_SECRET_KEY_PREVIOUS` (comma-separated); files move to the new key as they're read. A file whose key the server doesn't have reads as "not connected" and the rider connects again.
- Without a key the tokens stay plaintext (still 0600) and a hosted server logs a setup warning. Adding the key to an existing server: `echo "TRAINERME_SECRET_KEY=$(openssl rand -hex 32)" | sudo tee -a /etc/hour-power.env && sudo systemctl restart hour-power`, and keep a copy of the key somewhere safe.
- Data folders are 0700 and files 0600 (`src/lib/data/store.ts`); the systemd unit sets `UMask=0077` and the Docker image runs with `umask 077`.
- Backups (`src/lib/data/backup.ts`) never contain or restore `strava-tokens.json`, `garmin-tokens.json` or `watch.json`.
- Garmin error replies are never logged or shown: only the HTTP status and, when it looks like one, Garmin's short error code (`garminErrorSummary`).
