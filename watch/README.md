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

- `GET /api/watch/today` (and `?minutes=35` to refit today's ride) and `POST /api/watch/checkin {mood}`.
  The payload is built in `src/lib/watch/today.ts`, with labels in plain ASCII for the watch's fonts.
- The watch sends a **watch key** (`Authorization: Bearer …`) instead of a sign-in cookie. Make one in
  Hour Power under **Settings and data, Garmin watch app**. Only its hash is stored (`watch.json` in the rider's
  folder). Making a new key, or **Turn the watch off**, stops the old one.
- The last day fetched is kept on the watch, so it still shows (marked "Not updated") with the phone out of reach.
  Rides can only be started from today's data.

**It needs a server the watch can reach.** The watch's requests go out through the Garmin Connect app on
the phone, with no GitHub sign-in, so a codespace's private address won't work. Use the hosted copy (see
"Host it" in the main README). Don't make a codespace port public to get around this: without sign-in,
anyone with the address could read everything.

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

In the simulator's **File** menu, edit the app's properties (under Edit Persistent Storage in recent SDKs). Set `serverUrl` to your
Hour Power address and `watchKey` to a key from Settings. To try a ride, the **Simulation** menu can feed in power, heart rate
and cadence.

### On your watch

Garmin only lets you edit an app's settings on the phone (Connect IQ app, Hour Power, Settings) for apps
installed from the **Connect IQ Store**. So:

1. **Monkey C: Export Project** makes an `.iq` file.
2. In the [Connect IQ developer dashboard](https://apps.garmin.com/developer/), upload it as a **beta app**.
   A beta app is visible only to you, with no review.
3. Install it from the store link on your phone, then in the Connect IQ app open **Hour Power, Settings**
   and enter the server and watch key.

Copying a `.prg` straight onto the watch (USB, `GARMIN/APPS`) runs it, but there's no way to type the
settings then, so it can only show "Not set up yet".

## Devices

`manifest.xml` lists round watches with enough screen and memory: Forerunner 255, 265, 955 and 965,
fenix 7 (S, X), epix (Gen 2), Venu 2 and 3, and vivoactive 5. Add others from the SDK Manager's list.
Everything is laid out by screen size, so new round watches need no code changes.

## Files

- `source/HourPowerApp.mc`: the app, and saving a ride if it's closed mid-ride
- `source/HourPowerData.mc`: fetching and caching today, the check-in, settings
- `source/PageView.mc`: the four pages, their buttons and menus
- `source/Ride.mc`: recording, sensors, steps, alerts
- `source/RideView.mc`: the ride screen, pause, save, discard
- `source/SummaryView.mc`: after the ride
- `source/Draw.mc`: colours, rings and the self-sizing row layout
