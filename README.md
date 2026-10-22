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

The codespace stops when idle. For an app that's always there, run Hour Power on a small server: a **DigitalOcean Droplet**, with your domain on **Cloudflare** pointing at it. `deploy/` holds everything: Docker Compose runs the app with its data on a persistent volume, and Caddy gets the HTTPS certificate automatically (Bluetooth trainer control needs HTTPS).

1. **Back up:** in Hour Power (codespace) open **Settings and data → Download backup**.
2. **Droplet:** use an existing one, or create one (Ubuntu 24.04, Basic, 1 GB RAM, Sydney region, about US$6 a month). Open it with **Access → Launch Droplet Console**.
3. **Install Docker and get the code** (paste into the console):
   ```bash
   curl -fsSL https://get.docker.com | sh
   fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab
   git clone https://github.com/AnthBuhagiar/trainerME.git hour-power && cd hour-power
   cp deploy/.env.example deploy/.env && nano deploy/.env
   ```
   (The swap file lets a 1 GB Droplet build the app.) In `deploy/.env` set `DOMAIN` (e.g. `hourpower.yourdomain.com`), your Strava keys, and `SESSION_SECRET` (run `openssl rand -hex 32` to make one). Save with Ctrl+O, Enter, Ctrl+X.
4. **Cloudflare DNS:** add an **A** record, name `hourpower`, value = the Droplet's IP, **Proxy status: DNS only** (grey cloud) so Caddy can get its certificate. You can switch it to Proxied later with SSL/TLS mode **Full (strict)**.
5. **Start it:** `./deploy/deploy.sh`. The first build takes a few minutes.
6. **Strava:** in [Strava API settings](https://www.strava.com/settings/api) set **Authorization Callback Domain** to your `DOMAIN`. (Strava allows one domain, so the codespace can't reconnect after this; it keeps working with the connection it has.)
7. **Sign in:** open `https://DOMAIN` and **Sign in with Strava**. The first Strava account to sign in owns the app; nobody else can.
8. **Restore:** **Settings and data → Restore from a backup** with the file from step 1.
9. **Phone:** open the address and **Add to Home Screen** (Safari: Share → Add to Home Screen; Chrome: ⋮ → Install app).

**Updating:** run `./deploy/deploy.sh` on the Droplet (it pulls `main` and rebuilds). The in-app Update button is only for the codespace.

**Already running other sites on that Droplet?** Leave out the `caddy` service and point your existing web server at the app on port 3000 instead.

## Send workouts to Garmin (via Intervals.icu)

Planned rides can go to your Garmin Connect calendar, then to your watch or head unit, which can run them on a smart trainer.

1. Create a free account at [intervals.icu](https://intervals.icu) and connect Garmin Connect in its settings, allowing it to upload planned workouts.
2. In Intervals.icu, open Settings → Developer Settings and generate an API key.
3. Add it as a Codespaces secret named `INTERVALS_API_KEY` (or put it in `.env.local`), then restart the codespace.
4. In Hour Power, open **Week** → **Send rides to Garmin**. It sends the rest of this week and next week, with watt targets from your current hour power. Sending again replaces what Hour Power sent before; anything you added yourself in Intervals.icu is left alone.

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
