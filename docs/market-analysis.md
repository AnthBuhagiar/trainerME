# Hour Power (trainerME) — Market Analysis (PMI)

*Researched October 2026. Prices are as reported by third-party sources or app stores and should be
re-checked on each vendor's site before relying on them.*

## 1. What we are building (the yardstick)

trainerME is a cycling training app with three non-negotiables:

1. **Goal:** improve FTP and **hour power** (the best power you can hold for 60 minutes).
2. **Interface:** hour power is the headline number, front and centre.
3. **Inference:** the hour-power estimate should move *between* tests and long efforts, using
   evidence that other apps ignore:
   - improvements in **shorter efforts** (3–30 min) projected onto a power-duration model, and
   - improvements in **heart-rate efficiency** — more watts at the same heart rate than your own history.

Every product below is scored against those three points, using **PMI**:

- **Plus** — what it does well / what we should learn from
- **Minus** — weaknesses, especially versus our goal
- **Interesting** — neither good nor bad, but worth knowing or borrowing

At the end there is a comparison matrix and a list of the gaps trainerME can own.

---

## 2. Products assessed

| # | Product | Category | Reported price |
|---|---------|----------|----------------|
| 1 | JOIN | Adaptive plan app (what you use now) | ~€9.99/mo, ~€89.99/yr |
| 2 | TrainerRoad | Adaptive plans + AI FTP detection | ~S$29.98/mo (SG App Store); US price not confirmed |
| 3 | Xert | Fitness-signature modelling | ~$14.99/mo, ~$99.95/yr |
| 4 | intervals.icu | Analytics platform | Free (optional supporter/Patreon) |
| 5 | WKO5 | Desktop power analytics | ~$179 (sources disagree: one-off vs yearly) |
| 6 | TrainingPeaks | Training log / PMC / coach platform | ~$19.95/mo, ~$134.99/yr |
| 7 | Strava | Social + basic analytics | Subscription (feature split unconfirmed) |
| 8 | Garmin Connect / Edge | Device-based FTP detection | Free with device |
| 9 | Zwift | Virtual riding + workouts | ~£17.99/mo |
| 10 | Wahoo SYSTM | Workouts + 4DP testing | Subscription |
| 11 | GoldenCheetah | Open-source desktop analytics | Free |
| 12 | AI Endurance | Per-athlete ML "digital twin" | ~$20/mo, ~$200/yr |
| 13 | Humango | AI coach (multisport) | Tiered after 30-day trial |
| 14 | Athletica | AI coach with science transparency | Tiered, free trial |
| 15 | MyWhoosh | Free virtual platform + plans | Free |
| 16 | Rouvy | Real-route virtual riding | ~$179.99/yr promo (list ~$239.88) |

---

## 3. PMI per product

### 1. JOIN
**Plus**
- Plans adapt to your availability and to how each workout went, which suits a busy schedule
  (your weekday evening + Saturday long ride pattern is exactly what JOIN is built for).
- Large library (~400 workouts across road, MTB and gravel); integrates with Garmin, Strava, TrainingPeaks, Wahoo and Zwift.
- "JOIN level" is a simple single number that rises over time (yours went ~11 → 14.3, Aug–Oct 2026).
- Cheap.

**Minus**
- JOIN level is an opaque internal score, not watts, so you can't translate it to FTP or hour power.
- No published model of hour power; does not show how a short-effort PR or a better HR response moves your threshold.
- Outdoor "anything goes" rides are scored, but their information is not fed back into a threshold estimate you can see.
- Light on analysis: no power-duration curve, no HR-efficiency trend.

**Interesting**
- Writes a workout summary into the Strava description. That makes JOIN's plan visible to trainerME for free:
  we can parse *planned* versus *detected* workout type from your Strava history.
- Recently added running sessions to cycling plans.

### 2. TrainerRoad
**Plus**
- **AI FTP Detection:** estimates FTP from recent workouts *and* outside rides without a ramp test.
  It is the closest commercial match to our "infer, don't test" idea.
- **AI FTP Prediction:** forecasts FTP ~28 days ahead from your planned calendar, which is a motivating forward-looking number.
- Adaptive Training is trained on a very large dataset (reportedly 250M+ workouts); includes fatigue management.
- Company claims it overestimates less often than a 20-minute test (vendor claim, not independently verified).

**Minus**
- It is still an *FTP* model; hour power isn't the headline, and time-to-exhaustion isn't the focus.
- Black box: users report the prediction moving 8 W after one easy endurance ride, with no explanation.
- Expensive compared with JOIN, and indoor-first in culture.

**Interesting**
- Uses power, heart rate and RPE as model inputs, so HR is already treated as signal, which validates our approach.
- The ability to say "your FTP is X, trending to Y by date Z" is a strong UI pattern to borrow for hour power.

### 3. Xert
**Plus**
- **Fitness Signature** (Threshold Power, High Intensity Energy, Peak Power) is updated continuously from every ride,
  explicitly to avoid formal tests.
- Models "breakthroughs": a ride that exceeds the model raises it immediately.
- Strong modelling depth for a fair price.

**Minus**
- Needs near-maximal efforts to move Threshold Power, so sub-maximal rides (most of yours) don't raise it.
- Users report the curve fitting overestimating HIE and therefore *underestimating* threshold.
- Dense, jargon-heavy UI; hard to see the one number that matters.
- No heart-rate-efficiency pathway.

**Interesting**
- Its threshold slowly decays when you don't hit max efforts. That's realistic, but frustrating without a sub-maximal
  signal to counter it. That is exactly the gap our HR-efficiency model fills.

### 4. intervals.icu
**Plus**
- Free, fast and very deep. Has eFTP, power-duration curves, a fitness/fatigue/form chart, **Efficiency Factor**
  (NP ÷ HR) and **aerobic decoupling**, so all the raw ingredients we need.
- eFTP uses a Morton 3-parameter curve family fitted from real-world data and any max effort ≥ 3 min (configurable).
- Excellent Strava/Garmin sync; open API.

**Minus**
- eFTP only moves on **max** efforts that beat the current curve; otherwise it decays. Sub-maximal improvements are ignored.
- EF and decoupling are shown as separate charts; they never feed back into the FTP estimate.
- A low minimum-duration setting can inflate eFTP for anaerobically strong riders (one user saw 298 W vs 253 W
  depending on the setting).
- Built as an analyst's tool: lots of data, not a single clear target.

**Interesting**
- Its open API could be a fallback data source if Strava access becomes restrictive.
- Proves riders want EF/decoupling; nobody has turned it into an "your hour power went up 4 W because…" statement.

### 5. WKO5 (TrainingPeaks)
**Plus**
- Gold standard power-duration modelling: **mFTP** fitted to your full curve (90-day window), plus **TTE**
  (time to exhaustion at FTP), FRC and Pmax.
- TTE is conceptually the closest thing to "hour power" in the market: it says *how long* you can hold FTP.
- Personalised iLevels and power phenotypes.

**Minus**
- Desktop app, steep learning curve, expensive.
- mFTP can be pushed up by strong short efforts; users report large swings when short-duration residuals change.
- TTE is only trustworthy if you actually do long max efforts, which is exactly what you rarely do.
- No HR-based pathway.

**Interesting**
- "mFTP + TTE" framing: if TTE < 60 min, hour power < FTP. We should show both FTP and TTE-adjusted hour power.

### 6. TrainingPeaks
**Plus**
- Industry-standard PMC (CTL / ATL / TSB) and huge plan marketplace; coaches use it.
- Reliable sync with almost every device.

**Minus**
- No automatic FTP or hour-power estimation in the core product (per reviews).
- Premium needed for the PMC; ~$135/yr.
- No adaptive logic; the plan is a static calendar.

**Interesting**
- One 2026 review reports Garmin acquired TrainingPeaks (single source, unverified). If true, expect Garmin's
  FTP detection to appear there.

### 7. Strava
**Plus**
- Where all your data already lands (586 activities since 2021); best social layer.
- Power curve and Fitness & Freshness exist.

**Minus**
- Estimated FTP is widely reported as running high (one rider ~20 W above a 20-min-based figure) and lagging
  (≈6-week averaging window).
- Fitness & Freshness is a simplified Banister model; users say it penalises planned rest.
- No modelling of hour power at all.

**Interesting**
- Your current Strava "focus" field (Build FTP, expires 30 Nov) is a goal object we can read and show in trainerME.

### 8. Garmin Connect / Edge
**Plus**
- Detects FTP **using heart rate and power together** during steady, hard rides, the only mainstream product doing
  HR-informed threshold detection.
- Guided ~15–20-minute stepped test option; prompts you to accept/decline a new FTP.

**Minus**
- Auto rule is mostly "95% of a new 20-min PR exceeds current FTP", so it needs a hard effort.
- Users report it **underestimating** (one ~30 W below a demonstrated hour-long average) and lagging.
- Locked to Garmin hardware (you record with a different device; your rides show "CoospoRide" and MyWhoosh).

**Interesting**
- Accept/Decline prompt is good UX: the athlete stays in control of the number used for zones.

### 9. Zwift
**Plus**
- Detects FTP from any ride; algorithm now considers efforts from 8 to 60 minutes, not just 20 minutes.
- Huge motivation through social and racing.

**Minus**
- Only ever increases FTP, never decreases, so it can drift unrealistically high.
- Indoor-only; outdoor rides are ignored.
- No HR modelling; no hour-power view.

**Interesting**
- The 8–60 min lookup curve is a simple, robust approach we can replicate as a "sanity floor" for the estimate.

### 10. Wahoo SYSTM (4DP)
**Plus**
- 4DP profile (5 s NM, 1 min AC, 5 min MAP, FTP) gives a richer picture than FTP alone; workout targets are set
  per dimension.
- Rider-type classification is engaging.

**Minus**
- Requires a brutal 1-hour Full Frontal test (or Half Monty ramp) every 8–12 weeks.
- Results vary day to day (one user: 299 W Half Monty vs 282 W Full Frontal).
- Nothing updates between tests.

**Interesting**
- Its four-number profile maps neatly onto the short-effort inputs our model already extracts
  (5 s, 1 min, 5 min, 20 min); we can show a 4DP-style radar for free, without a test.

### 11. GoldenCheetah
**Plus**
- Free, open source, implements many CP models (2-parameter, 3-parameter, Morton, bioenergetic "CPCheetah").
- Great reference implementation for our maths.

**Minus**
- Desktop only, dated UX.
- Model choice changes results materially; a 2023 study found 3-parameter models overestimated 4-min TTE, and
  2-parameter (work-time, power-1/time) fits were the valid ones.

**Interesting**
- That study is a direct design input: for an hour-power estimate built from 3–20 min efforts, start with a
  2-parameter CP fit plus a fatigue/durability adjustment, not a 3-parameter fit.

### 12. AI Endurance
**Plus**
- Builds a per-athlete model ("digital twin") of how *you* respond to training, a step beyond population curves.
- Uses HRV-based DFA α1 for threshold estimation from heart-rate data (requires chest strap).

**Minus**
- ~$200/yr; benefit claims are largely unverified independently.
- Running-first heritage; cycling power modelling is less of a focus.

**Interesting**
- DFA α1 is a credible *third* sub-maximal signal (alongside power curve and HR efficiency). Your Strava streams
  do not include RR intervals, so it is a later-phase idea only.

### 13. Humango
**Plus**
- Conversational AI coach (Hugo) that re-plans around life events; multisport.

**Minus**
- Focus is scheduling, not threshold modelling; no hour-power concept.
- Plan quality reviews are mixed.

**Interesting**
- Chat-based "why did my plan change?" explanations are a good pattern for explaining estimate changes.

### 14. Athletica
**Plus**
- Publishes the science and principles behind its program, which is rare and builds trust.
- Baseline test sets personalised zones.

**Minus**
- Limited customisation; still test-anchored.

**Interesting**
- Transparency as a feature: trainerME should show *which rides moved the estimate and by how much*.

### 15. MyWhoosh
**Plus**
- Completely free, structured plans and assessments; you already use it (Jan 2026 rides).

**Minus**
- Little documented about FTP estimation; no analytics depth.

**Interesting**
- Free platforms set price expectations; trainerME's value must be the *insight*, not the workouts.

### 16. Rouvy
**Plus**
- Real-world route video; good for long steady indoor efforts (useful for actual hour-power attempts).

**Minus**
- Paid; entertainment-led; FTP handling is standard test-based.

**Interesting**
- A route-based "hour power attempt" (e.g. a 60-min real climb) is a fun way to validate trainerME's estimate.

---

## 4. Comparison matrix

Legend: ✅ yes · ◐ partial · ❌ no

| Product | Hour power is headline | FTP without a test | Uses short efforts (3–30 min) | Uses HR efficiency to move threshold | Explains *why* it changed | Outdoor rides count | Cost |
|---|---|---|---|---|---|---|---|
| JOIN | ❌ | ◐ (opaque level) | ❌ | ❌ | ❌ | ✅ | $ |
| TrainerRoad | ❌ | ✅ | ✅ | ◐ (HR is an input) | ❌ | ✅ | $$$ |
| Xert | ❌ | ✅ | ✅ (max only) | ❌ | ◐ | ✅ | $$ |
| intervals.icu | ❌ | ✅ (eFTP) | ✅ (max only) | ❌ (EF shown separately) | ◐ | ✅ | Free |
| WKO5 | ◐ (TTE) | ✅ (mFTP) | ✅ | ❌ | ◐ | ✅ | $$$ |
| TrainingPeaks | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | $$ |
| Strava | ❌ | ◐ (runs high) | ◐ | ❌ | ❌ | ✅ | $$ |
| Garmin | ❌ | ✅ | ◐ (20-min) | ✅ | ❌ | ✅ | Device |
| Zwift | ❌ | ✅ | ✅ (8–60 min) | ❌ | ❌ | ❌ | $$ |
| Wahoo SYSTM | ❌ | ❌ (test) | ❌ | ❌ | ❌ | ❌ | $$ |
| GoldenCheetah | ❌ | ✅ (CP) | ✅ | ❌ | ◐ | ✅ | Free |
| AI Endurance | ❌ | ✅ | ◐ | ✅ (DFA α1) | ◐ | ✅ | $$$ |
| Humango | ❌ | ◐ | ❌ | ❌ | ◐ | ✅ | $$ |
| Athletica | ❌ | ❌ (test) | ❌ | ❌ | ✅ | ✅ | $$ |
| MyWhoosh | ❌ | ◐ | ❌ | ❌ | ❌ | ❌ | Free |
| Rouvy | ❌ | ❌ (test) | ❌ | ❌ | ❌ | ❌ | $$ |
| **trainerME (target)** | **✅** | **✅** | **✅ (incl. sub-max)** | **✅** | **✅** | **✅** | Personal |

---

## 5. Where trainerME can win

1. **Hour power as the hero metric.** No product puts 60-minute power front and centre. Most say "FTP" and quietly
   assume FTP = hour power (it often isn't; WKO5's TTE shows many riders hold FTP for < 60 min).
2. **Sub-maximal evidence counts.** Every tool except Garmin (and partly TrainerRoad) waits for a max effort.
   trainerME should move the estimate on:
   - **Power–duration evidence:** best 3/5/8/12/20/30-min efforts fitted to a 2-parameter CP model, projected to 60 min
     with a durability factor learned from your own long rides.
   - **Heart-rate efficiency:** watts produced at a fixed heart rate (e.g. 140 bpm) on steady minutes, compared with
     your rolling history. If you produce 5% more power at the same HR, that is evidence threshold has risen, even on
     an endurance ride.
3. **Explainability.** Show a "why it changed" ledger: *"+3 W: 8-min effort on Oct 7 sat above your curve; +1 W:
   power at 140 bpm up 4% over 6 weeks"*. Athletica and Humango show people value this; nobody does it for threshold.
4. **Confidence, not false precision.** Display a range (e.g. 196 W ± 6 W) that narrows as fresh evidence arrives and
   widens with time since the last strong signal (Xert/intervals-style decay, but visible).
5. **Works alongside JOIN.** Read JOIN's planned-versus-detected workout from Strava descriptions so trainerME can
   say whether the plan is actually moving hour power.

## 6. Design inputs carried into the build

| Insight | Source product | trainerME decision |
|---|---|---|
| 2-param CP fits predict TTE better than 3-param | GoldenCheetah / 2023 IJSM study | Start with 2-parameter CP from 3–20 min efforts |
| Short min-duration inflates estimates | intervals.icu | Ignore efforts < 3 min for threshold |
| Only-increase logic drifts high | Zwift | Allow decay and decreases, but show them |
| HR + power detection works | Garmin | Power-at-fixed-HR efficiency signal |
| Accept/decline new FTP | Garmin | Estimate never silently overwrites the FTP used for zones |
| Forward prediction motivates | TrainerRoad | Hour-power trend line projected to goal date (30 Nov) |
| TTE matters | WKO5 | Show FTP and hour power separately; durability factor |
| Transparency builds trust | Athletica | "Why it changed" ledger |

## Sources

- [Best TrainerRoad Alternatives 2026 (aitoolsbakery)](https://aitoolsbakery.com/?p=18460)
- [Xert beta program announcement (Slowtwitch)](https://forum.slowtwitch.com/t/xert-beta-program-advanced-power-data-analytics-1/715844)
- [Sufferlandrians using Xert (Wahoo forum)](https://wahoox.forum.wahoofitness.com/t/sufferlandrians-using-xert-to-track-fitness/3702?page=3)
- [eFTP: how does it work (intervals.icu forum)](https://forum.intervals.icu/t/eftp-how-does-it-work/5851)
- [How accurate is eFTP (intervals.icu forum)](https://forum.intervals.icu/t/how-accurate-is-eftp/1639)
- [Intervals.icu eFTP (TrainerRoad forum)](https://trainerroad.com/forum/t/intervals-icu-eftp/36899/15)
- [Efficiency Factor (intervals.icu forum)](https://forum.intervals.icu/t/efficiency-factor/38610)
- [Aerobic decoupling calculation (intervals.icu forum)](https://forum.intervals.icu/t/aerobic-decoupling-calculation-question/1823)
- [TrainerRoad AI FTP Prediction](https://www.trainerroad.com/blog/new-how-to-predict-your-ftp-with-trainerroad-ai-ftp-prediction-trainerroad-ai/)
- [Introducing TrainerRoad AI](https://www.trainerroad.com/blog/introducing-trainerroad-ai/)
- [Single endurance workout drops AI FTP prediction by 8W (TrainerRoad forum)](https://www.trainerroad.com/forum/t/single-endurance-workout-execution-drops-ai-ftp-prediction-by-8w/110914)
- [TrainerRoad on the App Store (SG)](https://apps.apple.com/sg/app/id934224107)
- [WKO5 advanced power analysis (ctyeh)](https://ctyeh.com/articles/705?lang=en)
- [WKO5 vs TrainingPeaks (ctyeh)](https://ctyeh.com/articles/958?lang=th)
- [Using power curve to detect increases in FTP (TrainerRoad forum)](https://www.trainerroad.com/forum/t/using-power-curve-to-detect-increases-in-ftp/52824?page=2)
- [Did WKO5 calculate a wrong FTP (TrainerRoad forum)](https://www.trainerroad.com/forum/t/did-wko5-calculate-a-wrong-ftp-from-20-min-test/25573)
- [Best cycling training apps (JOIN)](https://join.cc/cycling-tips/best-cycling-training-apps)
- [JOIN Cycling Coach App reviews (JustUseApp)](https://justuseapp.com/en/app/1167933055/join-cycling-coach-app/reviews)
- [join.cc](https://join.cc)
- [Garmin: Getting your FTP estimate](https://www8.garmin.com/manuals/webhelp/marqcaptain/EN-US/GUID-B40A5128-C382-4F10-AD38-39649C42EF35.html)
- [Garmin forum: FTP autodetected below average power](https://forums.garmin.com/sports-fitness/cycling/f/edge-540-series/420674/why-is-ftp-autodetected-at-less-than-my-actual-average-power/1974556)
- [Edge FTP guide (GPS Eesti)](https://www.gpseesti.ee/abi/rattasoiduteadus/fusioloogilised-naitajad/funktsionaalne-energialavend-ftp)
- [Strava estimated FTP (TrainerRoad forum)](https://www.trainerroad.com/forum/t/strava-estimated-ftp/16919)
- [Strava Fitness & Freshness (TrainerRoad forum)](https://www.trainerroad.com/forum/t/strava-fitness-freshness-helpful-or-a-gimmick/45959)
- [Strava estimated FTP (Singletrack)](https://singletrackworld.com/forum/bike-forum/strava-estimated-ftp)
- [Zwift update 1.79 (Zwift Insider)](https://zwiftinsider.com/update-1-79-0-136993)
- [Adjust your FTP (Zwift Insider)](https://zwiftinsider.com/adjust-your-ftp/)
- [Zwift support: FTP test](https://support.zwift.com/es/ftp-test-HypJnI_NH.md)
- [Wahoo SYSTM review (road.cc)](https://road.cc/content/review/wahoo-systm-training-app-290899)
- [What is SYSTM (Wahoo)](https://au.wahoofitness.com/blog/what-is-systm/)
- [Half Monty vs Full Frontal (Wahoo forum)](https://wahoox.forum.wahoofitness.com/t/half-monty-vs-full-frontal-ftp-differences/12550)
- [Running critical power: model comparison (IJSM 2023)](https://www.thieme-connect.de/products/all/doi/10.1055/a-2069-2192)
- [GoldenCheetah 2-param vs 3-param (Fast Talk Labs)](https://forums.fasttalklabs.com/t/golden-cheetah-2-parameter-vs-3-parameter-model/7249)
- [AI Endurance review 2026 (sensai.fit — competitor-written)](https://www.sensai.fit/blog/ai-endurance-review-2026)
- [Humango review (Fueled by Lolz)](https://fueledbylolz.com/2024/08/28/humango-review/)
- [Athletica pricing](https://www.athletica.ai/pricing)
- [AI triathlon training thoughts (Slowtwitch)](https://forum.slowtwitch.com/t/triathlon-ai-training-thoughts-tridot-humango-athletica-2peaks-triq/831893)
- [Zwift vs MyWhoosh vs Rouvy 2026 (T3)](https://t3.com/active/cycling/zwift-vs-mywhoosh-vs-rouvy)
- [Rouvy referral pricing](https://rouvy.com/referral/buddy/training)
- [TrainingPeaks pricing](https://www.trainingpeaks.com/blog/trainingpeaks-pricing/)
- [TrainingPeaks review 2026 (aitoolsbakery)](https://aitoolsbakery.com/?p=18459)
- [TrainingPeaks pricing 2026 (Runner's Picks)](https://www.runnerspicks.com/blog/trainingpeaks-pricing-2026-which-plan/)
