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

### Several riders
Anyone with Strava can sign in to a hosted Hour Power. Each athlete gets their own folder, `data/athletes/<Strava athlete id>/`, and every page and request reads and writes only the signed-in athlete's folder (with sign-in on, the app refuses to touch data without one). Nobody sees anyone else's rides.

- **Strava's limit:** a new Strava API app allows only its owner. Raise it to 10 athletes yourself at [Strava API settings](https://www.strava.com/settings/api); beyond 10, Strava reviews the app (see `docs/strava-capacity-request.md`).
- **Cap it on the server:** `MAX_ATHLETES=10` in `/etc/hour-power.env` (riders already signed up always get back in).
- **Privacy page** at `/privacy`; add `CONTACT_EMAIL=` to show a contact address.
- **Terms and Conditions** at `/terms` (text in `src/lib/legal/terms.ts`). Riders tick "I agree" on the sign-in page before going to Strava; anyone signed in who hasn't accepted the current version is asked before using the app. Change `TERMS_VERSION` when the terms change and everyone is asked again. `CONTACT_EMAIL` fills the contact line.
- **Delete my account** in Settings removes the rider's folder and revokes Hour Power's Strava access.
- **Webhook (recommended, expected by Strava's review):** removes a rider's data when they remove Hour Power in Strava. Once, on the server:
  ```bash
  source /etc/hour-power.env && curl -X POST https://www.strava.com/api/v3/push_subscriptions \
    -F client_id=$STRAVA_CLIENT_ID -F client_secret=$STRAVA_CLIENT_SECRET \
    -F callback_url=$APP_URL/api/strava/webhook -F verify_token=$STRAVA_WEBHOOK_TOKEN
  ```
  (If `STRAVA_WEBHOOK_TOKEN` is empty, add one first: `openssl rand -hex 16`, then `systemctl restart hour-power`.)
- Data from before this change moves into the first rider's folder on their next visit.
- The server's `INTERVALS_API_KEY` is only used for the rider who runs the server.

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

## Rides from Intervals.icu too

With `INTERVALS_API_KEY` set, every sync also reads your rides from Intervals.icu (power and heart rate included), so Hour Power has a second source besides Strava. The same ride arriving from both is kept once. Rides that Intervals.icu itself got from Strava aren't shared over its API, so this mainly adds rides it receives from Garmin, Wahoo, Zwift and the like: connect those to Intervals.icu directly for the full benefit.

## Use another app instead (optional)

Hour Power plans, runs (Bluetooth trainer control) and records workouts by itself. If you'd rather ride them elsewhere, **Use another app instead** on the Week tab (this week and next) or on any workout sends them to:

- **Intervals.icu**, and from there to Garmin Connect and Zwift (needs `INTERVALS_API_KEY`, below)
- **Zwift**: `.zwo` files for `Documents/Zwift/Workouts/<your id>`; set Zwift's FTP to your training hour power
- **Other trainer apps**: `.erg` files with watt targets
- **Phone calendar**: an `.ics` file for Google or Apple Calendar, each event linking back to the workout

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
