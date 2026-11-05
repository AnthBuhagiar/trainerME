# Hour Power Lite: the Garmin watch app

A Connect IQ watch app built from the mock-up in `docs/design/watch-lite/`. It reads the
rider's day from their Hour Power server and rides today's session on the wrist.

| Page | What it shows | Start button |
|------|---------------|--------------|
| Today | Date, hour power and its range, the week ring (done against planned), today's session, the goal countdown | Ride today's session |
| Session | The workout, its shape, the main target in watts, how long | Ride it. **Menu** (hold Up): change the length ("Only 35 min?") |
| Check-in | Good, Tired, Short on time or Off today, and what that does | Answer. The plan changes as it does in the app |
| Goal | Days to go, distance and climbing, finish time at today's hour power, target time | |

Up and Down move between pages; Back goes to Today, then leaves.

**Riding**: the watch records a cycling activity (indoor on the trainer, outdoor with GPS) and steps
through the workout: watts (3 s average) against the target with a zone bar, time left in the step, heart rate,
cadence and what's next. It beeps and buzzes at each change. **Start** laps on to the next step; **Back** pauses
and offers Resume, Save or Discard. Saved rides go to Garmin Connect, then to Strava if the two are linked,
and Hour Power picks them up at its next Strava sync (that's when hour power updates).

Power, heart rate and cadence come from the sensors paired with the watch (Settings, Sensors and
accessories on the watch). The watch app **doesn't control the trainer** (no ERG): set the trainer to the
watts shown, or for ERG send the workout to Garmin Connect from the app and run it in the watch's own
workout player.

## How it talks to Hour Power

Everything goes **through the phone**: the watch's requests travel over Bluetooth to the Garmin Connect
app, which passes them on. So it works on watches without their own data or Wi-Fi, and the watch never
signs in.

**Linking (once).** Open Hour Power on the watch: it shows a code like `K7P-42Q`. On your phone, in Hour
Power, go to **Settings and data, Garmin watch app**, enter the code and tap **Link**. Within a few seconds
the watch has its own key and shows your day. Nothing to type in Garmin Connect. A code works once and
runs out after ten minutes (the watch gets a new one). Linking another watch replaces the old one;
**Unlink the watch** stops it at once and it goes back to showing a code.

- `POST /api/watch/link` gives the watch a code and a token only it holds; it checks
  `GET /api/watch/link` with that token every 3 s until the code is entered
  (`POST /api/watch/link/confirm`, signed in), then collects its key (`src/lib/watch/link.ts`).
- After that, `GET /api/watch/today` (`?minutes=35` refits today's ride) and `POST /api/watch/checkin {mood}`,
  sending the key as `Authorization: Bearer …`. The payload is built in `src/lib/watch/today.ts`, with labels in
  plain ASCII for the watch's fonts. Only the key's hash is stored (`watch.json` in the rider's folder).
- The last day fetched is kept on the watch, so it still shows (marked "Not updated") with the phone out of reach.
  Rides record without the phone and reach Garmin Connect at the next sync. Rides can only be started from today's data.

**It needs a server the watch can reach.** The Garmin Connect app can't get past a codespace's GitHub
sign-in, so use the hosted copy (see "Host it" in the main README). Don't make a codespace port public to
get around this: without sign-in, anyone with the address could read everything.

**Set the server before building.** The hosted address is built into the app: put it in
`resources/settings/properties.xml` as the `serverUrl` default (e.g. `https://hourpower.example.com`).
It's only an address, nothing secret. Store installs can change it in the app's settings in Connect IQ.

## Build and run

You need Garmin's Connect IQ SDK and a developer key. Garmin's site needs a sign-in, so none of this runs
in the repo's checks: the server side is tested there, the watch code is built here.

1. Install [Visual Studio Code](https://code.visualstudio.com/) and the **Monkey C** extension (Garmin).
2. Run **Monkey C: Verify Installation**. It offers the **SDK Manager**: sign in, download the latest SDK
   and the devices you want (at least your own watch).
3. Run **Monkey C: Generate a Developer Key** (once). Keep the `.der` file out of the repo (it's git-ignored).
4. Open the `watch/` folder. **Monkey C: Build for Device** builds a `.prg` for one watch;
   **Run** opens it in the simulator.

### Try it in the simulator

Run it: the simulator shows a link code. Enter it in Hour Power (Settings, Garmin watch app) and the simulator
links like a watch. To try a ride, the simulator's **Simulation** menu can feed in power, heart rate and cadence.

### On your watch

With the server built in, nothing needs typing on the phone, so either works:

- **Copy it on**: **Monkey C: Build for Device** for your watch, connect the watch by USB and copy the `.prg`
  into `GARMIN/APPS`. Quickest for your own watch.
- **Beta app** (for other riders, or updates from the store): **Monkey C: Export Project** makes an `.iq` file;
  upload it in the [Connect IQ developer dashboard](https://apps.garmin.com/developer/) as a beta app (visible
  only to you, no review) and install it from the store link on your phone.

Then open Hour Power on the watch and link it with the code.

## Devices

`manifest.xml` lists round watches with enough screen and memory: Forerunner 255, 265, 955 and 965,
fenix 7 (S, X), epix (Gen 2), Venu 2 and 3, and vivoactive 5. Add others from the SDK Manager's list.
Everything is laid out by screen size, so new round watches need no code changes.

## Files

- `source/HourPowerApp.mc`: the app, and saving a ride if it's closed mid-ride
- `source/HourPowerData.mc`: linking, fetching and caching today, the check-in
- `source/PageView.mc`: the four pages, their buttons and menus
- `source/Ride.mc`: recording, sensors, steps, alerts
- `source/RideView.mc`: the ride screen, pause, save, discard
- `source/SummaryView.mc`: after the ride
- `source/Draw.mc`: colours, rings and the self-sizing row layout
