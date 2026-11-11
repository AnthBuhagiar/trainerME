# Hour Power

*Working repo name: trainerME.*

A personal cycling training app built around one number: **hour power** — the best power you can hold for 60 minutes.

Most apps only move your threshold when you do a test or an all-out effort. trainerME estimates hour power
continuously from the evidence in every ride:

- **Shorter efforts** (3–30 min) projected onto a power–duration model.
- **Heart-rate efficiency** — more watts at the same heart rate than your own history.

Every change to the estimate is explained ("why it changed"), shown with a confidence range,
and never silently overwrites the FTP used for training zones.

Built for **time-crunched amateur cyclists** — riders with a full-time job and a family, training around 6 hours a week.

- [`docs/product-strategy.md`](docs/product-strategy.md): positioning, differentiators and roadmap.
- [`docs/market-analysis.md`](docs/market-analysis.md): the competitor PMI analysis that shaped these decisions.

## Data & privacy

This repository is public. Personal Strava data (activities, streams, GPS) is **never committed** —
it lives in `data/`, which is git-ignored.

## Run it in GitHub Codespaces (nothing to install)

1. **Add your Strava keys as Codespaces secrets** (once): GitHub → your avatar → **Settings → Codespaces → Secrets → New secret**.
   Create `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` with the values from
   <https://www.strava.com/settings/api>, and give each access to the **trainerME** repository.
2. On the repo page, switch to the branch `claude/upbeat-noether-2kf703`, then **Code → Codespaces → Create codespace on this branch**.
   It installs everything and starts the app automatically. Open the app at
   `https://<codespace-name>-3000.app.github.dev` (the codespace name is shown at github.com/codespaces),
   or from the **Ports** tab in the editor. You don't need the editor open for the app to run.
3. The app's setup card shows an address like `xxxx-3000.app.github.dev`. Paste that into
   **Authorization Callback Domain** in Strava's API settings.
4. Tap **Connect Strava**, approve, then **Sync**.

Your data stays in the codespace's `data/` folder between sessions (until you delete the codespace).
Open the same `…app.github.dev` address on your phone while signed in to GitHub.
If the codespace was stopped, reopen it from github.com/codespaces and the app restarts.

## Updating

When a new version is pushed, the Today screen shows **Update Hour Power**. Tap it: the app pulls the changes and, if needed, reinstalls packages and restarts itself. (The terminal way still works: `git pull origin claude/upbeat-noether-2kf703`.)

## Host it (always on, on your phone)

The codespace stops when idle. For an app that's always there, run Hour Power on a server. It's set up for a small **DigitalOcean Droplet that already runs Caddy** (e.g. alongside another app), with the domain on **Cloudflare**:

- **GitHub builds it**, not the server: every merge to `main` publishes a ready-to-run release (`.github/workflows/release.yml`).
- **The server just runs it**, as its own user on `127.0.0.1:3100`, capped at 350 MB of memory so other apps on the server are never squeezed, and checks for a new release every 15 minutes.
- **Caddy** serves it on your domain with HTTPS (needed for Bluetooth trainer control).

### Set up (once)
1. **Back up:** in Hour Power (codespace) open **Settings and data → Download backup**.
2. **Cloudflare DNS:** add an **A** record, e.g. name `hourpower`, value = the Droplet's IP. Use the same proxy setting as your other site on that server; if unsure, **DNS only** (grey cloud).
3. **Install:** in the Droplet console (Access → Launch Droplet Console), run, with your domain:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/deploy/install.sh -o install.sh && bash install.sh hourpower.yourdomain.com
   ```
   It installs Node.js 20 if needed, adds a swap file if there's none, creates the service, adds the site to Caddy (backing up the Caddyfile and only reloading if the new config validates), and starts the app.
4. **Keys:** `nano /etc/hour-power.env`, fill in `STRAVA_CLIENT_ID` and `STRAVA_CLIENT_SECRET` (and `INTERVALS_API_KEY` if you use it), save with Ctrl+O, Enter, Ctrl+X, then `systemctl restart hour-power`. The sign-in secret is already generated.
5. **Strava:** in [Strava API settings](https://www.strava.com/settings/api) set **Authorization Callback Domain** to your domain. (Strava allows one domain, so the codespace can't reconnect after this; it keeps working with the connection it has.)
6. **Sign in:** open `https://hourpower.yourdomain.com` and **Sign in with Strava**. The first Strava account to sign in runs the server (the server's Intervals.icu key is theirs). Other riders can sign in too, each with their own data: see **Several riders** below.
7. **Restore:** **Settings and data → Restore from a backup** with the file from step 1.
8. **Phone:** open the address and **Add to Home Screen** (Safari: Share → Add to Home Screen; Chrome: ⋮ → Install app).

### Day to day
- New versions arrive on their own within about 15 minutes of a merge to `main` (or run `/opt/hour-power/update.sh`).
- Logs: `journalctl -u hour-power -n 50`. Status: `systemctl status hour-power`.
- Your data is in `/opt/hour-power/data`; download a backup from Settings now and then.

### Private repository
With the repository private, the server needs a read-only token to download releases:
1. On GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**. Repository access: **Only select repositories → trainerME**. Permissions: **Contents: Read-only**. Copy the token.
2. On the server: `nano /etc/hour-power.env`, add `HOUR_POWER_GITHUB_TOKEN=<the token>`, save. Test with `/opt/hour-power/update.sh` (no output means it's up to date).
3. When the token expires, the update log says so (`journalctl -u hour-power-update -n 20`): make a new one and replace the line.

The install and helper scripts above download from `raw.githubusercontent.com`; with a private repository, add `-H "Authorization: Bearer <token>"` to those `curl` commands, and run `install.sh` as `HOUR_POWER_GITHUB_TOKEN=<token> bash install.sh <domain>`.

### Move to a new address
To run Hour Power on its own domain (e.g. `hourpower.app`):
1. Buy the domain (Cloudflare Registrar sells `.app`) and add an **A** record pointing at the Droplet's IP.
2. On the server:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/deploy/change-domain.sh -o change-domain.sh && bash change-domain.sh hourpower.app
   ```
   The old address becomes a permanent redirect to the new one; other sites on the server aren't touched.
3. In [Strava API settings](https://www.strava.com/settings/api), set **Authorization Callback Domain** to the new domain, and re-subscribe the webhook if you use it. Riders sign in once more on the new address.

### Several riders
Anyone with Strava can sign in to a hosted Hour Power. Each athlete gets their own folder, `data/athletes/<Strava athlete id>/`, and every page and request reads and writes only the signed-in athlete's folder (with sign-in on, the app refuses to touch data without one). Nobody sees anyone else's rides.

- **Strava's limit:** a new Strava API app allows only its owner. Raise it to 10 athletes yourself at [Strava API settings](https://www.strava.com/settings/api); beyond 10, Strava reviews the app (see `docs/strava-capacity-request.md`).
- **Cap it on the server:** `MAX_ATHLETES=10` in `/etc/hour-power.env` (riders already signed up always get back in).
- **Privacy page** at `/privacy`; add `CONTACT_EMAIL=` to show a contact address.
- **Terms and Conditions** at `/terms` (text in `src/lib/legal/terms.ts`). Riders tick "I agree" on the sign-in page before going to Strava; anyone signed in who hasn't accepted the current version is asked before using the app. Change `TERMS_VERSION` when the terms change and everyone is asked again. `CONTACT_EMAIL` fills the contact line.
- **Delete my account** in Settings removes the rider's folder and revokes Hour Power's Strava access.
- **Webhook (recommended, expected by Strava's review):** when a rider removes Hour Power in Strava (confirmed with Strava), their sync stops and their data is deleted 7 days later unless they connect again (see `docs/security.md`). Once, on the server:
  ```bash
  source /etc/hour-power.env && curl -X POST https://www.strava.com/api/v3/push_subscriptions \
    -F client_id=$STRAVA_CLIENT_ID -F client_secret=$STRAVA_CLIENT_SECRET \
    -F callback_url=$APP_URL/api/strava/webhook -F verify_token=$STRAVA_WEBHOOK_TOKEN
  ```
  (If `STRAVA_WEBHOOK_TOKEN` is empty, add one first: `openssl rand -hex 16`, then `systemctl restart hour-power`.)
- **The owner** (admin dashboard, the server's `INTERVALS_API_KEY`) is set with `OWNER_ATHLETE_ID` in `/etc/hour-power.env`: your Strava athlete id (the number in your strava.com/athletes/… address). Nobody becomes owner by signing in first; with no owner set, the admin dashboard is off. A server set up before this keeps the owner it had (`owner.json`) until you set it.
- Data from before several riders moves into the owner's folder on their next visit.
- The server's `INTERVALS_API_KEY` is only used for the rider who runs the server.

### Admin data (owner only)
`/api/admin/stats` returns what the admin dashboard shows: riders (first name and last initial, joined, last used, activities synced, goals, referral code and how many riders joined with it), how much of the plan is done each week, which sessions get swapped, shortened or moved and why, and traffic. Account and usage only: never power, heart rate, weight, check-in answers or routes. Open it signed in as the owner (add `?download=1` to save a file); anyone else gets a 404. A tool outside the browser can send `Authorization: Bearer $ADMIN_TOKEN` instead (`ADMIN_TOKEN` in `/etc/hour-power.env`, at least 32 characters: `openssl rand -hex 32`).

**Traffic** (website and app, by day, country, page, referrer and device) comes from Cloudflare, which already counts every visit at the edge: no tracking script or cookies. In Cloudflare: **My Profile → API Tokens → Create Token → Custom token**, permission **Zone · Analytics · Read** for the domain's zone. Then add to `/etc/hour-power.env`:
```
CLOUDFLARE_API_TOKEN=<the token>
CLOUDFLARE_ZONE_ID=<only if not hourpowerapp.cc: the zone ID, on the domain's Overview page>
```
and `systemctl restart hour-power`. `CLOUDFLARE_ZONE_ID` is optional: it defaults to hourpowerapp.cc's zone. Cloudflare must proxy both addresses (orange cloud) to count them. Active riders are counted from the days each rider opens the app (dates only, kept for 120 days).

### Keep the server patched (whole server)
Security fixes for Ubuntu, PHP, Node.js and everything else installed with `apt` are applied every 6 hours, and services using an updated library are restarted. If a kernel update needs a reboot, the server reboots at 3:30 am Sydney time, only then. This covers **every app on the Droplet**, so make sure the other apps start on boot (`systemctl is-enabled <service>`).
```bash
curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/deploy/server-updates.sh -o server-updates.sh && bash server-updates.sh
```
Check it with `systemctl list-timers 'apt-daily*'` and `tail /var/log/unattended-upgrades/unattended-upgrades.log`.

### Weekly security check, logged to GitHub
Every Monday the server checks for waiting updates, pending reboots, open ports, firewall and SSH settings, failed SSH logins, disk space and a Lynis audit, and commits the report to a GitHub repository: `reports/<server>/<date>.md`, with an index in `reports/<server>/README.md`.
1. Create a **private** repository (e.g. `server-security-log`) with a README, so the reports aren't public.
2. Create a [fine-grained token](https://github.com/settings/personal-access-tokens/new): only that repository, **Contents: Read and write**.
3. On the server (the token is asked for and kept in `/etc/security-scan.env`, readable by root only):
   ```bash
   curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/deploy/install-security-scan.sh -o install-security-scan.sh && bash install-security-scan.sh AnthBuhagiar/server-security-log
   ```
   It runs the first check straight away. Run one any time with `systemctl start security-scan`.

A server with nothing else on it can instead use `deploy/docker-compose.yml` (app plus its own Caddy): `./deploy/deploy.sh`.

## Trainer and heart rate

Pair your smart trainer and heart-rate strap once in **Settings and data → Trainer and heart rate**. They're remembered on that phone: in Chrome the workout connects to them by itself once they're switched on; in browsers that can't do that (Bluefy), the chooser lists only your paired device, so it's one tap. It's Bluetooth only, since browsers can't use ANT+; trainers and straps with ANT+ almost always have Bluetooth too. A strap that allows two Bluetooth connections (most recent Garmin, Wahoo and Polar straps) can talk to the phone and a watch at the same time.

### Mini player
Mid-ride, tap **Mini player** on the workout dashboard and the workout floats in a corner as a picture-in-picture tile (like YouTube): drag it, pinch to resize, tap play/pause or next to pause or skip a step. While it's showing, the browser treats the page as playing media, so the ride and the trainer keep running while you use other apps. It works where browsers offer video picture-in-picture (Chrome on Android, Windows and Mac). iPhone browsers that do Bluetooth (Bluefy) don't, so there the ride keeps time and catches up when you come back.

## Rides from Intervals.icu too

With `INTERVALS_API_KEY` set, every sync also reads your rides from Intervals.icu (power and heart rate included), so Hour Power has a second source besides Strava. The same ride arriving from both is kept once. Rides that Intervals.icu itself got from Strava aren't shared over its API, so this mainly adds rides it receives from Garmin, Wahoo, Zwift and the like: connect those to Intervals.icu directly for the full benefit.

## Use another app instead (optional)

Hour Power plans, runs (Bluetooth trainer control) and records workouts by itself. If you'd rather ride them elsewhere, **Use another app instead** on the Week tab (this week and next) or on any workout sends them to:

- **Garmin Connect**, straight to the rider's calendar and on to their watch or Edge (needs Garmin developer keys, below)
- **Intervals.icu**, and from there to Garmin Connect and Zwift (needs `INTERVALS_API_KEY`, below)
- **Zwift**: `.zwo` files for `Documents/Zwift/Workouts/<your id>`; set Zwift's FTP to your training hour power
- **Other trainer apps**: `.erg` files with watt targets
- **Phone calendar**: an `.ics` file for Google or Apple Calendar, each event linking back to the workout

## Send workouts straight to Garmin Connect

With a Garmin Connect Developer Program app, each rider connects their own Garmin account once and planned rides go straight to their Garmin Connect calendar, with watt targets from their hour power and repeats kept as repeats. The watch or Edge picks them up at its next sync and can run them on a smart trainer. No Intervals.icu account needed.

1. In the [Garmin developer portal](https://developer.garmin.com/gc-developer-program/), open your app and copy its **consumer key** and **consumer secret**.
2. Add them as Codespaces secrets (or in `.env.local`, or `/etc/hour-power.env` on a server) named `GARMIN_CLIENT_ID` and `GARMIN_CLIENT_SECRET`, then restart.
3. In the app's settings in the portal, set the **redirect URL** to `<your app address>/api/garmin/callback`, e.g. `https://hourpower.example.com/api/garmin/callback`. A codespace's address changes with each codespace, so register the one you're using (or use a hosted copy).
4. On a hosted copy, set the **deregistration** and **user permission change** notification URLs to `<your app address>/api/garmin/webhook?token=<GARMIN_WEBHOOK_TOKEN>` (from `/etc/hour-power.env`; add one with `openssl rand -hex 24` if it's missing), so a rider removing Hour Power in Garmin Connect is forgotten here too. Notifications without the token are refused.
5. In Hour Power: **Settings and data → Garmin Connect → Connect Garmin**, approve on Garmin's page (allow workouts), then **Week → Use another app instead → Garmin Connect: Send**, or the same on any ride.

Sending again replaces what Hour Power sent before for those days; workouts you made in Garmin Connect yourself are never touched. Once rides are sent, Hour Power keeps them up to date: a check-in (tired, short on time, day off), a swap, days away, new targets or the plan adapting after a sync replaces the changed rides on Garmin straight away, so the watch has the session as it now stands at its next sync. Only the days you sent are kept up to date, and past days are left alone (`src/lib/garmin/resync.ts`). Disconnecting (or deleting your account) removes Hour Power's access on Garmin. Garmin's API addresses are in `src/lib/garmin/client.ts`; if a call starts failing, compare them with the current docs in the developer portal.

## Garmin watch app (Hour Power Lite)

**Paused.** Sending workouts to Garmin Connect (above) covers riding, with ERG, and keeps up with check-ins; the watch app is kept for later and hasn't been built with the Connect IQ SDK yet.

A Connect IQ app for round Garmin watches, in `watch/`: hour power, today's session with watt targets, the morning check-in and the goal countdown, and riding the session on the wrist (power against target, time left, heart rate, cadence), saved to Garmin Connect. Everything goes through the phone, so watches without their own data or Wi-Fi work, and the watch never signs in: it shows a code once, you enter it in Hour Power on your phone (**Settings and data, Garmin watch app**), and it's linked. It works with a hosted copy only: the watch can't get past a codespace's GitHub sign-in. Building it and getting it onto a watch: `watch/README.md`.

## Send workouts to Intervals.icu

Planned rides can go to your Garmin Connect calendar, then to your watch or head unit, which can run them on a smart trainer.

1. Create a free account at [intervals.icu](https://intervals.icu) and connect Garmin Connect in its settings, allowing it to upload planned workouts.
2. In Intervals.icu, open Settings → Developer Settings and generate an API key.
3. Add it as a Codespaces secret named `INTERVALS_API_KEY` (or put it in `.env.local`), then restart the codespace.
4. In Hour Power, open **Week** → **Use another app instead** → **Intervals.icu: Send**. It sends the rest of this week and next week, with watt targets from your current hour power. Sending again replaces what Hour Power sent before; anything you added yourself in Intervals.icu is left alone.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer and git.

```bash
git clone https://github.com/AnthBuhagiar/trainerME.git
cd trainerME
git checkout claude/upbeat-noether-2kf703
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
```

Open `.env.local` and paste your **Client ID** and **Client Secret** from
<https://www.strava.com/settings/api> (Authorization Callback Domain must be `localhost`).
Never commit `.env.local`.

```bash
npm run dev
```

Open <http://localhost:3000>, tap **Connect Strava**, approve, then **Sync**. Strava limits
requests per 15 minutes, so a full history downloads over a few syncs; the app tells you
how many rides are left.

To use it on your phone, keep `npm run dev` running and open `http://<your-computer's-IP>:3000`
on the same Wi-Fi (connect Strava from the computer first).

Your data is stored in `data/` on your computer and is never committed.
