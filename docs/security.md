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
