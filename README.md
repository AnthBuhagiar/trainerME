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
