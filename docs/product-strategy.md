# Hour Power (trainerME) — Product Strategy & Plan

*Builds on [`market-analysis.md`](market-analysis.md). Last updated October 2026.*

## 1. Positioning

> **Get faster on 6 hours a week, with no FTP tests.**

trainerME is the hour-power app for **time-crunched amateur cyclists**: riders aged roughly 30–55
with a full-time job and a family, training 4–8 hours a week, who have outgrown free plans but don't
want a coach's demands or prices.

The founding user profile, taken from real Strava history:

| Pattern | Evidence |
|---|---|
| Weekday sessions after work and family time | Indoor rides start ~7:30–8 pm, ~60 min |
| Long ride timed around the family | Saturday starts ~5 am, 2.5–3.5 h |
| Social and unplanned rides happen | "Ride with dad", "with Joe and dad", "Wet, wet, wet!" |
| Strength alongside cycling | 1–2 gym sessions/week |
| Total volume | ~5–7 h/week |
| Current tools | JOIN plans, Strava, MyWhoosh, two power sources (indoor + outdoor) |

### Core promise
1. **One number that matters:** hour power, front and centre, with **the rider's own goal** (an event, a power target, a climb, a challenge ride or anything else) giving it a purpose.
2. **Every ride counts:** the estimate improves from any ride, not just tests or prescribed workouts.
3. **Built around your life:** the plan fits the hours you have, and life stress counts as load.
4. **Honest and explained:** a confidence range and a reason for every change.

## 2. Differentiators

Ranked by defensibility (how hard they are to copy).

### A. The hour-power engine (high defensibility)
| # | Feature | What it does |
|---|---|---|
| A1 | **Every-ride hour-power estimate** | Combines (1) best 3–30 min efforts on a 2-parameter critical-power curve, (2) watts at a fixed heart rate on steady minutes compared with the rider's own history, and (3) how well power holds up in the last hour of long rides, which adjusts FTP to hour power. |
| A2 | **Condition-corrected heart rate** | Corrects heart rate for temperature (Strava `temp` stream), recent load and time of day before comparing, so a hot day doesn't read as lost fitness. |
| A3 | **Indoor/outdoor power reconciliation** | Learns the offset between power sources (e.g. outdoor CoospoRide vs indoor trainer) from heart rate at matched power, giving one consistent hour-power number. |
| A4 | **Confidence range** | Shows "201 W ± 6 W". The range narrows with fresh strong evidence and widens as evidence ages. |
| A5 | **Published accuracy** | Back-tests predictions against real long/hour efforts (e.g. Bowral Classic 2025, Saturday long rides) and publishes the error. |

### B. Built for time-crunched riders (medium–high defensibility)
| # | Feature | What it does |
|---|---|---|
| B1 | **Time-budget planning** | The app **reads the rider's usual week from their own Strava history** (last 12 weeks, recent weeks weighted more): fixed-day slots with typical start time and length, plus flexible habits like "gym 1× a week, evenings, any day". The rider can adjust them. The app builds the week with the most expected hour-power gain for that time and shows each session's value. |
| B2 | **Session shrinking** | When a 60-min slot becomes 35 min, one tap gives the best 35-min version and shows how much benefit was kept. |
| B3 | **No catch-up of missed sessions** | Missed sessions are dropped, not crammed into the weekend. |
| B4 | **Life stress counts as load** | One-tap daily check-in (sleep, stress, kids sick, big work week), plus HRV/resting HR if available, adjusts the plan. |
| B5 | **Time-off forecasts** | "Your 10-day holiday costs ~6 W of hour power; you'll regain it in ~3 weeks." |
| B6 | **Calendar awareness** *(optional)* | Reads family/work calendars, suggests realistic slots and plans recovery around busy weeks and holidays. |
| B7 | **Late-night-friendly sessions** | Evening sessions are tuned for the most stimulus per minute, without hard efforts so late that they wreck sleep. |
| B8 | **Gym-aware scheduling** | **Two strength sessions a week by default** for every rider (E5). If history shows fewer, the least regular indoor ride is swapped for strength (outdoor and long rides never are). Strength is placed so it doesn't blunt the key ride. |

### D. Goals — whatever the rider is working towards (high value, medium defensibility)

Every rider sets **their own goal**, whatever it is, and the whole plan bends towards it. Nothing about
goals is hard-coded to the founding rider: goal types are a generic model so any user can define any goal.
Hour power stays the headline number; the goal gives it a purpose and a deadline.

#### Goal types

| Type | Examples | Measured by | How the plan leans |
|---|---|---|---|
| **Event** | Gran fondo, sportive, hill climb, time trial, crit, gravel race, charity ride | Finish time, average speed/power, placing, or "finish strong" | Course-specific demands, rehearsal rides, taper (D2–D8) |
| **Performance** | Hour power 220 W, FTP 230 W, 4 W/kg, 20-min power 250 W, 5-min power 300 W | The chosen power metric (estimated continuously, A1) | Sessions targeting that duration |
| **Segment or climb** | A local climb under 10 min, a Strava segment PR, a club TT course | Segment time, or the power needed for it | Efforts matched to the segment's length and gradient |
| **Challenge ride** | First 100 km / 160 km, a 200 km day, Everesting, a multi-day tour | Distance, climbing or duration completed | Long-ride progression, durability, fuelling practice |
| **Consistency** | Ride 3× a week, 5,000 km this year, 150 h this year | Count, distance or hours over a period | Realistic weekly targets within the time budget; no punishing streaks |
| **Comeback** | Back to previous fitness after illness, injury or a new baby | Hour power vs a chosen past baseline | Conservative ramp, extra recovery |
| **Custom** | Anything else | Rider picks a metric (any of the above, or a manual check-in such as "how strong I felt") and a target | General build, plus progress tracking on the chosen metric |

#### Goal model (every goal, any type)

| Field | Notes |
|---|---|
| Name | Rider's own words, e.g. "Bowral Classic 2026", "Sub-10 on Mt Keira", "First 200 km" |
| Type | One of the types above |
| Target metric and value | e.g. finish time 5:45, hour power 220 W, 3 rides/week |
| Deadline or date | An event date, or a "by" date for open goals; open-ended allowed for consistency goals |
| Priority | **A** (the plan bends towards it), **B** (trained through), or **C** (tracked only) |
| Details | Type-specific fields (event route, segment, distance, baseline) — see D-1 for events |
| Starting point | Captured automatically from current data when the goal is set |

A rider can have **one A goal** at a time plus any number of B and C goals. When an A goal is finished,
the app proposes the next one (D10). Typical year: 2–3 A goals, each 4–6 months apart.

Every goal type gets the same four things:
1. **Progress / readiness** on the goal's own metric (D4 generalised).
2. **Plan bias**: the week builder leans sessions towards what the goal needs (D6 generalised).
3. **Realism check** at setup and monthly, within the rider's time budget (D9).
4. **Review** when the deadline passes or the goal is met (D10).

#### Event goals in detail

Events are the most common A goal for this audience and get the richest support. Example for the
founding rider:

Example for the founding rider: **Bowral Classic** — 151 km, ~2,140 m climbing, ridden 19 Oct 2025 in
~6 h 13 min moving. That ride is already in the data, so it doubles as a baseline for next year's attempt.

| # | Feature | What it does |
|---|---|---|
| D1 | **Set a goal event** | Enter the ride details manually, import a route file, or both (full spec in section D-1 below). One active goal at a time, with the next one queued. |
| D2 | **Event demands** | Turns the course into requirements: expected duration, the power needed for the target time (from weight, elevation and hour power), the share of hour power sustainable for that long (from late-ride power holding), and the key climbs' length and gradient. |
| D3 | **Backwards plan from the date** | Phases (base → build → specific → taper) are laid out backwards from the event, **inside the rider's time budget (B1)**. A 5-month gap gets a full build; a 6-week gap gets a sharpened short version. |
| D4 | **Event readiness score** | Alongside hour power: "Bowral readiness 72%", built from hour power vs required power, long-ride durability, climbing-specific efforts and training consistency. Shows what's holding it back. |
| D5 | **Key rehearsal rides** | Saturday long rides become event rehearsals: event-pace efforts on climbs, rides of similar length, fuelling practice. Flagged as "key ride" so life admin can be planned around them. |
| D6 | **Event-specific sessions** | The week builder biases sessions towards the event type: long sweet spot and durability for a gran fondo, 10–30 min threshold for a hill climb, steady 40–60 min efforts for a TT. |
| D7 | **Taper and event week** | A taper scaled to the rider's load, an event-week checklist (kit, bike check, sleep, travel) and family logistics notes. |
| D8 | **Pacing and fuelling plan** | Climb-by-climb power targets from hour power and course profile, carbohydrate per hour, and bottle/food plan. Exportable to the bike computer. |
| D9 | **Goal realism check** | At setup and monthly: "At 6 h/week, a sub-6 h Bowral is realistic (needs ~X W, you're tracking to Y W)" or "stretch — consider 6 h 15". Adjusts honestly instead of failing silently. |
| D10 | **Post-event review and next goal** | Compares the result with the plan and the prediction, updates the model (it was a real long effort), celebrates the outcome, then proposes the next goal and a recovery block. The yearly cycle becomes 2–3 goal blocks. |
| D11 | **Life-aware goal calendar** | Family holidays, work crunches and school events are blocked out first, so goal blocks are realistic (links to B6). |

#### D-1. Event goal setup specification

For event goals (and segment or challenge goals with a route), the rider can describe the goal
**manually**, by **importing the route**, or both. A file fills in what it can,
manual entries override it, and anything missing is estimated and marked as an estimate.

**Manual inputs**

| Field | Required | Notes |
|---|---|---|
| Event name | Yes | e.g. "Bowral Classic 2026" |
| Date and start time | Yes | Start time drives expected temperature and the taper/sleep plan |
| Event type | Yes | Gran fondo, sportive, hill climb, time trial, challenge ride, other |
| Distance (km) | Yes, unless a route is imported | |
| Total climbing (m) | Yes, unless a route is imported | |
| Target | Optional | Any one of: finish time, average speed, average power, or "just finish strong". If blank, the app proposes a realistic target (D9). |
| Surface | Optional | Road, gravel, mixed; adjusts rolling resistance and speed estimates |
| Riding style | Optional | Solo or bunch; drafting changes the power needed |
| Rider + bike weight (kg) | Optional | Defaults to Strava profile weight plus a typical bike weight |
| Expected conditions | Optional | Temperature and wind; defaults to historical averages for the date and place |
| Previous attempt | Optional | Link a past Strava activity of the same event (e.g. Bowral Classic, 19 Oct 2025) as a baseline |
| Priority | Optional | "A" goal (plan bends towards it) or "B" event (trained through, minor taper) |

**Route import**

| Source | Phase |
|---|---|
| GPX file upload | MVP |
| TCX and FIT course files | Phase 2 |
| Strava route or Strava activity of a previous attempt | Phase 2 |
| Links from RideWithGPS and Komoot | Phase 3 |

From an imported route the app derives:
- Distance, total climbing and an elevation profile.
- **Detected climbs**: start/end km, length, average and maximum gradient, and a difficulty score, which become the key climbs in D2 and D8.
- Flat, rolling and descending sections, for pacing and fuelling points.
- Start location, used for the weather defaults.

**Derived goal (shown on save)**
- Estimated finish time at current fitness, and at projected fitness on the event date.
- Power needed for the target, overall and on each key climb, as a share of hour power.
- Feasibility: realistic, stretch or unlikely on the current time budget (D9), with a suggested adjustment.
- Weeks available, and how they split into base, build, specific and taper (D3).

**Data handling**
Route files and goal details are personal data. They are stored with the rider's other data in the
git-ignored `data/` folder and never committed to the public repository.

### E. Fuelling (high value for long real rides)

Under-fuelling is the most common way amateurs lose a long ride, and it is easy to fix with a plan.
Targets follow established sports-nutrition guidance (to be cited in `docs/training-science.md`):
little or none needed under ~1 h, roughly 30–60 g carbohydrate per hour for 1–2.5 h, and up to
~90 g/h for rides over ~2.5 h, using mixed glucose and fructose sources, with the gut trained up
to higher intakes over several weeks.

| # | Feature | What it does |
|---|---|---|
| E1 | **Per-ride fuel target** | Every planned ride over ~75 min shows g carbs/hour and a total, scaled to its duration and intensity (e.g. "Sat 3 h · fuel 70 g/h · ~210 g"). |
| E2 | **Practical translation** | Turns grams into real items the rider chooses ("2 bottles of mix + 1 gel + 1 bar"), with a reminder to drink and eat every 15–20 min. |
| E3 | **Gut training progression** | Long rehearsal rides step the target up gradually towards the event target, so 80–90 g/h on the day isn't a first. |
| E4 | **Event fuel plan** | From the imported route: where to eat before climbs, feed zones/cafés, bottle refills, and the pre-event carb day. Exports to the bike computer with the pacing plan (D8). |
| E5 | **Post-ride fuel check** | One tap after long rides: "Ran out of energy? / Stomach OK?" Adjusts future targets and helps explain late-ride power fades in the durability model. |
| E6 | **Fuel-aware durability** | When a long ride faded but was under-fuelled, the "why it changed" log says so instead of marking fitness down. |

### C. Experience (lower defensibility, high value)
| # | Feature | What it does |
|---|---|---|
| C1 | **Hour-power main screen** | Current estimate ± range, goal (e.g. 220 W by 30 Nov), watts still to go, projected trend. |
| C2 | **"Why it changed" log** | Every change attributed: "+3 W: 8-min effort on 7 Oct beat your curve; +1 W: power at 140 bpm up 4% over 6 weeks; −2 W: no hard efforts for 18 days." |
| C3 | **One decision a day** | "Today: 45 min, 3×10 at 195 W, or rest. Both are fine." Deep analysis is tucked away. |
| C4 | **Sunday summary** | Weekly push/email: hour power ±W, why, and next week placed into the rider's slots. |
| C5 | **"On track" consistency score** | A rolling score instead of streaks, which punish parents. |
| C6 | **Test-as-you-train sessions** | Suggests workouts that also reduce uncertainty in the estimate (e.g. 2×12 min at a set HR), so a dedicated test is never needed. |
| C7 | **Hour Attempt mode** | Optional real hour effort (indoor or a long climb); the app predicts the result first, then compares. |
| C8 | **Back-by-time rides** | "Back by 8:30" → a session and distance that fits, with a live turn-around prompt. |
| C9 | **Partner view** | A shared view of this week's riding slots and total hours away. |
| C10 | **Event goals** | Superseded by the full Goal Event feature set (section D). |
| C11 | **Works with JOIN/Zwift** | Reads JOIN's planned workouts from Strava descriptions to report whether the plan is moving hour power. |
| C12 | **Never overwrites zones silently** | New estimates are offered for Accept/Decline before replacing the FTP used for training. |

### F. Growth and pricing
| # | Feature | What it does |
|---|---|---|
| F1 | **Referral codes** | Every rider gets a 4-character code (no look-alike characters, no vowels) to share from Settings, as a code or a sign-in link that fills it in. A new rider enters their recommender's code when they sign up, or once later in Settings before they start paying. Riders see only a count of who joined with their code, never who. *Built; dormant until billing.* |
| F2 | **Refer six, ride free** | When six riders who joined with a rider's code are subscribed (any active subscription, including riders free through their own referrals), that rider's subscription is free for a year, applied automatically. It starts straight away, or when time already paid for runs out (a yearly subscriber finishes the year they paid for). At the end of each free year it renews if six are still subscribed; if not, payment starts again, and a new free year starts the day they're back to six. In the last month of a free year, if they're short, an encouraging pop-up on Today once a week says how many riders they need. **Free for life** once six of their riders have each been subscribed for 24 months in total (breaks allowed), even if those riders later leave. *Logic built and tested (`src/lib/referral`); billing calls `recordSubscriptionPeriod` for every paid month or year and checks `isFreeFromReferrals`. No scheduled job needed: rewards are worked out from subscription periods when needed.* |
| F3 | **Low-price subscription** | **5.99 a month or 59 a year, tax included, in the rider's own currency.** Plain 5.99 / 59 in AUD, USD, GBP, EUR, NZD and CAD; other currencies keep the digits and move by a power of ten to land closest to what A$5.99 buys in Australia (purchasing power): e.g. ¥599 / ¥5,900, ₩5,990 / ₩59,000, Rp 59,900 / Rp 590,000. 33 currencies; anywhere else US$. Currency from the rider's country (Cloudflare's CF-IPCountry). Method, full table and outliers in `docs/pricing.md`; code in `src/lib/billing/plans.ts`, shown in Settings → Subscription. Well under JOIN and TrainerRoad, with a free hour-power-only tier. Billed on the web first (Stripe or Paddle, set tax-inclusive); Apple in-app purchase only when an iOS app ships. |

## 3. Roadmap

### Phase 1 — MVP (personal use, founding rider)
Goal: a trustworthy hour-power number and a week that fits real life.

- [ ] Data pipeline: Strava activities + streams → per-ride summaries (power curve, minute-by-minute power and heart rate, temperature). Personal data stays git-ignored.
- [ ] **A1** hour-power engine (critical-power curve + watts at fixed heart rate + late-ride power holding).
- [ ] **A4** confidence range.
- [ ] **C1** hour-power main screen and **C2** "why it changed" log.
- [ ] **B1** time-budget week builder, **B2** session shrinking, **B3** no catch-up.
- [ ] **C3** daily recommendation.
- [ ] **B4** one-tap life-stress check-in.
- [ ] **C12** accept/decline new FTP.
- [ ] Generic **goal model** (any type, any user), with Event, Performance, Challenge and Custom types in the MVP.
- [ ] **D1** event goal setup: manual inputs (distance, climbing, date, target time) and **GPX import** with climb detection (D-1).
- [ ] **D3** backwards plan from the date (feeding the week builder), and a basic **D9** realism check.
- [ ] **E1** per-ride fuel target and **E2** practical translation.

### Phase 2 — Accuracy and life fit
- [ ] **A2** condition-corrected heart rate.
- [ ] **A3** indoor/outdoor power reconciliation.
- [x] **A5** back-testing against long efforts; publish accuracy (Progress → How accurate is it?).
- [ ] **C4** Sunday summary.
- [x] **B5** time-off forecasts: away and busy days, planned months ahead (Plan tab).
- [ ] **B8** gym-aware scheduling and **B7** evening session tuning.
- [ ] **C5** "on track" score.
- [ ] **D2** event demands from the route, **D4** readiness score, **D5** key rehearsal rides, **D6** event-specific sessions.
- [ ] **E3** gut training progression and **E5** post-ride fuel check.
- [ ] Route import from TCX/FIT course files and from Strava routes or a previous attempt's activity.
- [ ] Segment/climb, Consistency and Comeback goal types; multiple B/C goals alongside the A goal.

### Phase 3 — Family and integrations
- [ ] **B6** calendar awareness.
- [ ] **C8** back-by-time rides.
- [ ] **C9** partner view.
- [ ] **C11** JOIN/Zwift companion mode.
- [ ] **C6** test-as-you-train sessions and **C7** Hour Attempt mode.
- [ ] Route import from RideWithGPS and Komoot links.
- [ ] **D7** taper and event week, **D8** pacing and fuelling plan, **D10** post-event review and next goal, **D11** life-aware goal calendar.
- [ ] **E4** event fuel plan and **E6** fuel-aware durability.

### Phase 4 — Go to market (if validated)
Onboarding target for the average rider: **Sign in with Strava → Connect Garmin → set a goal.** No accounts elsewhere, no keys, nothing to install.

- [ ] **Hosted web app** with real accounts and a database (replacing the codespace and the local JSON store). Prerequisite for everything below.
- [ ] **Connect Garmin directly** (Garmin Connect Developer Program, Training API): one button and an approval page, then workouts land on the rider's Garmin Connect calendar and sync to their watch or head unit, as JOIN's do. The **primary export route**.
  - Gate: access is free but only for *approved business developers*; new requests were reported paused in 2026. Needs a business identity (e.g. an ABN and a website) and an application. Check developer.garmin.com for the current status.
- [ ] **Connect Intervals.icu** (its OAuth sign-in, not API keys) as the fallback route for Wahoo, Zwift and riders Garmin doesn't cover. Today's personal build uses an API key.
  - Done for the personal build: rides are read from Intervals.icu with the API key as a second source (deduplicated with Strava). Next: register an Intervals.icu OAuth app for a "Sign in with Intervals.icu" button.
- [ ] **TrainingPeaks** sign-in and data: needs TrainingPeaks partner API approval (closed API).
- [ ] **Strava capacity:** a new Strava API app allows 1 athlete, self-serve up to 10; beyond that Strava reviews the app (no guaranteed timeline, webhooks expected). Multi-user is built: raise to 10 in Strava's API settings now; the review request is drafted in `docs/strava-capacity-request.md`.
- [ ] Direct Garmin / Wahoo / FIT-file import (don't rely on Strava alone; see risks).
- [x] **Multi-user accounts** on the hosted app: Sign in with Strava for anyone, a folder per athlete, delete-my-account, privacy page, Strava deauthorisation webhook, optional `MAX_ATHLETES` cap. *Still JSON files on one server; a database comes when riders outgrow it.*
- [ ] Onboarding from a time budget instead of an FTP test.
- [ ] **F3** pricing: 5.99/month or 59/year, tax included, in the rider's own currency, scaled by a power of ten for weaker currencies (`docs/pricing.md`), well below JOIN/TrainerRoad; free tier showing hour power only. Plans defined and shown in Settings; billing itself not built. Web billing first (Stripe or Paddle), then Apple in-app purchase if an iOS app ships.
- [x] **F1** referral codes and the recommender field at sign-up.
- [ ] **F2** refer six, ride free (yearly check, free for life at six riders × 24 months): switch on with billing (`BILLING_OPEN` in `src/lib/referral/referral.ts`). Add the reward rules to the terms when subscriptions open.
- [ ] Coach dashboard; monthly W/kg hour-power leaderboard (estimated, with range).
- [ ] **Calendar-to-trainer player** (once hosted). *The Bluetooth workout player itself is built (Ride it on my trainer, FTMS ERG control); what remains is the .ics feed linking to it.* Each planned session becomes a calendar event (.ics feed) linking to a built-in workout player, which controls the smart trainer over Bluetooth (ERG mode): "Tap the calendar event, ride the workout, nothing to install." Not offered by JOIN or Strava. Limits: a live feed needs a hosted app; Bluetooth needs Chrome (Android/desktop) or Bluefy on iPhone; usually only one device controls the trainer at a time.

## 4. Go-to-market

| Element | Plan |
|---|---|
| Message | "Get faster on 6 hours a week, with no FTP tests." |
| Proof | Published estimate accuracy, and "watts gained per hour trained". |
| Price | 5.99/month or 59/year in the rider's own currency (A$, US$, £, €), well under JOIN (€16.99/month or €119.99/year, checked 29 Oct 2026) and TrainerRoad, and marketed on that gap: even in the dearest countries for Hour Power it costs under half of JOIN monthly and a quarter to two-thirds of it yearly (`docs/pricing.md`). The value is less wasted time and less guilt, not more workouts. |
| Growth engine | Riders recruit riders: keep six riders you referred subscribed and your subscription is free, checked each year; six riders who stay two years make it free for life (F1, F2). Every rider has a code to share from Settings, and new riders enter it at sign-up instead of a discount code. Bunch rides and club mates are the natural audience. |
| Channels | Local clubs, gran fondo events (e.g. Bowral Classic), Strava clubs, parent/dad cycling communities. Beta testers get their codes now, so their mates are counted from day one of billing. |
| Wedge | Companion to JOIN/Zwift first ("the hour-power layer on top of the plan you already follow"), full planner second. |

## 5. Risks

| Risk | Mitigation |
|---|---|
| Strava API terms (as recalled, since late 2024) limit third-party apps to showing a rider their own data and bar using it to train AI models; check the current terms. | Fine for personal use. Build direct Garmin/Wahoo/FIT import before any public launch. |
| A badly wrong estimate destroys trust | Confidence range from day one; back-testing; accept/decline before zones change. |
| Experience features (C) are easy to copy | Build the defensible engine (A) and time-budget planning (B) first. |
| Heart-rate signal is noisy (heat, caffeine, sleep) | Steady-minute filtering, condition correction (A2), long rolling windows. |
| Two power sources disagree | Power-source reconciliation (A3). |
| Garmin or Strava developer access is refused or delayed | Apply early with a working hosted beta; keep Intervals.icu and file export (.fit/.zwo) as fallbacks so the product works without either approval. |
