# Hour Power — Training Science

*Version 1.3 · October 2026 · next review January 2027*

This is the evidence behind every workout and planning rule in Hour Power. Workouts in
`src/lib/plan/library.ts` reference these entries by ID, and the app shows the reason for each
session. Evidence is reviewed quarterly: new studies are added, weak claims are downgraded or
removed, and changes are logged at the bottom.

**Confidence levels**
- **Strong** — meta-analysis or multiple controlled trials, read at abstract/primary-record level.
- **Moderate** — controlled trial(s) or an established review; some details only from secondary summaries.
- **Practice** — widely used coaching practice with limited direct trial evidence. Used, but labelled as such.

Targets are expressed as a percentage of the rider's **hour power** (which plays the role FTP plays
in other apps).

---

## E1 · Intensity distribution — mostly easy, a little hard
**Confidence: Moderate**

- Observational work by Seiler on elite endurance athletes found roughly 80% of sessions at low
  intensity and ~20% hard, with little time at threshold; often quoted as ~75–80% low, ~5% threshold,
  ~15–20% high. Seiler notes the split counts **sessions**, not minutes.
- Stöggl & Sperlich (2014) compared polarised, threshold, high-volume and high-intensity training in
  48 well-trained endurance athletes over 9 weeks; the polarised group improved VO2peak, time to
  exhaustion and peak power most. Critics note the comparison groups were extreme (e.g. threshold-only).
- Stöggl & Sperlich (2015, *Frontiers in Physiology*) reviewed training intensity distribution and
  found world-class athletes tend towards polarised or pyramidal distributions.

**How Hour Power uses it:** at most 2 hard sessions in a normal week (3 in a short, high-priority block),
the rest easy; for a ~6 h/week rider a **pyramidal** split (some threshold/sweet spot) is allowed because
low-volume riders get less from pure volume (see E6).

## E2 · Short intervals for VO2max — 30/15s
**Confidence: Moderate** (results details from secondary summaries)

- Rønnestad et al. (2015, *Scand J Med Sci Sports*): trained cyclists did 10 weeks of effort-matched
  short intervals (3 sets of 13 × 30 s on / 15 s off) or long intervals (4 × 5 min on / 2.5 min off),
  twice weekly. Summaries report larger gains in VO2max, power at VO2max and 40-min time-trial power with
  the short intervals.
- Rønnestad, Hansen, Nygaard & Lundby (2020, *Scand J Med Sci Sports* 30(5):849–857) tested the same
  idea in elite cyclists.
- Caveat: some coaches argue 30/15s skew towards anaerobic contribution; Seiler describes a 13 × 30/15
  set as effectively one continuous effort with variable power.

**How Hour Power uses it:** 30/15 sets are the default VO2 session; 4–5 × 4–5 min is the alternative
for variety and outdoor rides.

## E3 · Threshold and sweet-spot work for time-crunched riders
**Confidence: Practice**

- Long intervals just below and at threshold (e.g. 2 × 15–20 min at 95–100% of hour power, or 88–94%
  "sweet spot") are standard coaching practice for raising sustainable power when weekly hours are
  limited. Direct controlled evidence specific to low-volume amateurs is limited.

**How Hour Power uses it:** threshold and sweet-spot sessions are the core weekday sessions when the
goal is hour power or a long event, balanced against E1.

## E4 · Tapering before an event
**Confidence: Strong**

- Bosquet, Montpetit, Arvisais & Mujika (2007, *Med Sci Sports Exerc* 39(8):1358–1365), meta-analysis
  of 27 studies: the most efficient taper was **~2 weeks**, reducing training **volume by 41–60%**
  (progressively), **without** reducing intensity or frequency.

**How Hour Power uses it:** A-goal events get a 1–2 week taper: volume down ~40–60%, short efforts at
target intensity kept, number of rides kept where possible.

## E5 · Heavy strength training alongside cycling
**Confidence: Moderate**

- Rønnestad & Mujika (2014, *Scand J Med Sci Sports* 24(4):603–612) reviewed strength training for
  running and cycling; for cycling, the most compelling evidence of an added benefit is for **heavy**
  strength training. Proposed mechanisms include better neuromuscular efficiency and more
  fatigue-resistant muscle fibres.
- The protocol behind those trials (Rønnestad, Hansen & Raastad 2010; Rønnestad et al. 2017): half squat,
  one-legged leg press, one-legged hip flexion and calf raise, **3 sets of 4–10RM, twice a week**, about
  2 min between sets, lifting fast and lowering slowly, with the load rising every few weeks
  (10RM/6RM → 8RM/5RM → 6RM/4RM).

**How Hour Power uses it:** 1–2 strength sessions a week are welcomed, not replaced. Hard rides are not
scheduled the morning after heavy leg sessions where the week allows; strength volume drops in the taper.

## E6 · Durability — holding power late in long rides
**Confidence: Moderate**

- Maunder et al. (2021, *Sports Medicine*), "The importance of 'durability' in the physiological
  profiling of endurance athletes": standard profiles are measured fresh, but what matters in long
  events is how much those measures decline during prolonged exercise. Durability has since been
  described as a possible "fourth parameter" of endurance performance.

**How Hour Power uses it:** the engine measures durability from late-ride power (it scales hour power),
and gran-fondo goals add long rides with efforts placed late in the ride.

## E7 · Carbohydrate during rides
**Confidence: Strong** (consensus guidance)

- Sports-nutrition guidance (e.g. Gatorade Sports Science Institute summaries of Jeukendrup and
  others): for exercise over ~1 h, **30–90 g carbohydrate per hour**; **30–60 g/h** for about 1–2.5 h;
  **up to ~90 g/h** for efforts beyond ~2.5–3 h.
- Above ~60 g/h, **glucose + fructose** mixtures (commonly ~2:1) improve absorption and reduce stomach
  problems, because fructose uses a separate intestinal transporter.
- The gut can be trained to tolerate higher intakes; practise before events.

**How Hour Power uses it:** every ride over ~75 min gets a fuel target by duration and intensity, long
rehearsal rides step intake up towards the event target, and event plans default to 60–90 g/h.

## E8 · Recovery weeks
**Confidence: Practice**

- Periodic lighter weeks (commonly every 3rd or 4th week) are standard practice to absorb training,
  and are more important when life stress is high or for older riders.

**How Hour Power uses it:** a lighter week every 3–4 weeks (every 3rd when check-ins report high stress),
roughly 30–40% less volume with one short quality session kept.

---

## E9 · Training on 5–6 hours a week
**Confidence: Moderate** (trained, mostly male cyclists, 4–12 week studies; little on riders over 40 or on women)

- **Polarised beat threshold at about 6 h a week.** Neal et al. (2013, *J Appl Physiol*) put 12 trained
  cyclists through 6-week blocks: polarised (about 6.4 h/week) improved lactate threshold power about 9% and
  peak power about 8%, more than a threshold-heavy block of about 7.5 h/week.
- **Polarised was broadest; HIIT alone was hardest for less.** Stöggl & Sperlich (2014, *Front Physiol*),
  48 well-trained athletes, 9 weeks.
- **How much matters less than doing it.** In a multilevel meta-analysis of 41 studies and 797 trained
  cyclists (Cove et al., *JSAMS*), every approach improved VO2max and time trials, with no clear winner
  between polarised and other mixes, and weekly volume wasn't linked to bigger gains.
- **Short intervals are efficient.** Effort-matched 30/15s beat 4 × 5 min for peak aerobic power
  (Rønnestad et al. 2015; 2020 in elite riders; 2021 one-week block). See E2.
- **Intervals work fast, then level off.** Adding 4 weeks of 6–8 × 5 min (80% of peak aerobic power, 60 s
  recovery) to base training improved 40 km time trials (Lindsay, Hawley et al. 1996). Only some interval
  formats helped: of 12 × 30 s at 175%, 12 × 60 s at 100%, 12 × 2 min at 90%, 8 × 4 min at 85% and
  4 × 8 min at 80% of peak aerobic power (six sessions over three weeks, 20 trained men), the 85% and
  175% formats improved 40 km time trials most (Stepto et al. 1999).
- **Sequence:** pyramidal then polarised did best in runners (Filipas et al. 2022).
- **Low-volume HIIT raises VO2max** even in short, small doses (Wen et al. 2019 meta-analysis; mostly non-elite).

**How Hour Power uses it:** the training protocol (`docs/training-protocol.md`): two
quality sessions a week at most, at least 70–75% of riding time easy, a pyramidal base then a polarised
build, interval types rotated every three loading weeks, and the day after a hard session kept easy.

## E10 · Runs and other training alongside cycling
**Confidence: Low–moderate** (reviews of few, small studies; the thresholds below are the protocol's choices)

- **Some aerobic fitness transfers, never all.** Tanaka's review (1994, *Sports Med*) found part of the
  VO2max gain from one sport carries over to another: running transfers the most, swimming the least.
  Cross-training never matched sport-specific training, and specificity matters more the fitter the rider.
- **Running costs the legs more.** Prolonged running brings larger falls in leg strength than cycling of
  similar duration. Millet & Lepers (2004, *Sports Med*) compare neuromuscular fatigue after prolonged
  running, cycling and skiing.

**How Hour Power uses it:** P18–P19. A run, row or swim of 30+ min can stand in for an easy ride that day,
but never for a key session or the long ride. A hard or long run the day before turns a hard session easy.

## Sources

- [Effects of tapering on performance: a meta-analysis (Bosquet et al., 2007) — PubMed](https://pubmed.ncbi.nlm.nih.gov/17762369/)
- [Short intervals induce superior training adaptations compared with long intervals in cyclists (Rønnestad et al., 2015) — PDF](https://paulogentil.com/pdf/Short%20intervals%20induce%20superior%20training%20adaptations%20compared%20with%20long%20intervals%20in%20cyclists%20%E2%80%93%20An%20effort-matched%20approach.pdf)
- [Superior physiological adaptations after a microcycle of short intervals vs long intervals (Rønnestad et al., 2021) — MMU e-space](https://e-space.mmu.ac.uk/630338)
- [High-intensity training: short intervals (Knowledgeiswatt summary)](https://knowledgeiswatt.substack.com/p/32-high-intensity-training-short)
- [Short intervals in elite cyclists (Knowledgeiswatt summary)](https://knowledgeiswatt.substack.com/p/33-high-intensity-training-short)
- [Short intervals improve performance (TrainRight)](https://trainright.com/short-intervals-improve-performance/)
- [Empirical Cycling on 30/15s (TrainerRoad forum)](https://www.trainerroad.com/forum/t/empirical-cycling-podcast-why-not-ronnestad-30-15-intervals-aka-brasted/39711)
- [Stöggl & Sperlich, training intensity distribution review (Frontiers in Physiology, 2015)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2015.00295/pdf)
- [Polarised vs sweet spot training (Roadman Cycling)](https://roadmancycling.com/blog/polarised-vs-sweet-spot-training)
- [Optimizing strength training for running and cycling endurance performance: a review (Rønnestad & Mujika, 2014)](https://paulogentil.com/pdf/Optimizing%20strength%20training%20for%20running%20and%20cycling%20endurance%20performance%20-%20A%20review.pdf)
- [The importance of 'durability' in the physiological profiling of endurance athletes (Maunder et al., 2021)](https://lida.sport-iat.de/ta/Record/4069575)
- [Durability as an index of endurance exercise performance: methodological considerations](https://openrepository.aut.ac.nz/items/e4ed557d-8c56-44ba-9eac-520fc0ae1aae/full)
- [Dietary carbohydrate and the endurance athlete (GSSI Sports Science Exchange)](https://www.gssiweb.org/sports-science-exchange/article/dietary-carbohydrate-and-the-endurance-athlete-contemporary-perspectives/1000)
- [Glucose and fructose in endurance sport (TrainingPeaks)](https://trainingpeaks.com/blog/glucose-and-fructose-in-endurance-sport)
- [Six weeks of a polarized training-intensity distribution… (Neal et al., 2013, J Appl Physiol)](https://journals.physiology.org/doi/full/10.1152/japplphysiol.00652.2012)
- [Polarized training has greater impact on key endurance variables… (Stöggl & Sperlich, 2014, Front Physiol)](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2014.00033/full)
- [The effect of training distribution, duration, and volume on VO2max and performance in trained cyclists (Cove et al., JSAMS)](https://www.jsams.org/article/S1440-2440(24)00596-6/pdf)
- [Improved athletic performance in highly trained cyclists after interval training (Lindsay, Hawley et al., 1996), summary](https://coachsci.sdsu.edu/csa/vol41/lindsay.htm)
- [Effects of different interval-training programs on cycling time-trial performance (Stepto et al., 1999)](https://researchgate.net/profile/Nigel_Stepto/publication/12966624_Effects_of_different_interval-training_programs_on_cycling_time-trial_performance/links/0fcfd5101a14fe1590000000/Effects-of-different-interval-training-programs-on-cycling-time-trial-performance.pdf)
- [Effects of different protocols of HIIT for VO2max improvements in adults (Wen et al., 2019, JSAMS)](https://www.jsams.org/article/S1440-2440(18)30919-8/abstract)
- [Which training intensity distribution intervention will produce the greatest improvements (Rosenblat et al., 2025, Sports Med)](https://www.fisiologiadelejercicio.com/wp-content/uploads/2025/02/Which-Training-Intensity-Distribution-Intervention-will.pdf)
- [Effects of polarized, pyramidal and combined periodisations, with Luca Filipas (Filipas et al., 2022)](https://scientifictriathlon.com/tts328/)
- [Effects of cross-training: transfer of training effects on VO2max between cycling, running and swimming (Tanaka, 1994, Sports Med)](https://pubmed.ncbi.nlm.nih.gov/7871294/)
- [Alterations of neuromuscular function after prolonged running, cycling and skiing exercises (Millet & Lepers, 2004, Sports Med)](https://pubmed.ncbi.nlm.nih.gov/14965189/)

## Changelog

- **1.3 (Oct 2026)** — Added the protocol details (Rønnestad strength programme; Lindsay and Stepto interval formats) used by the workout catalogue (`src/lib/plan/catalogue.ts`, `docs/workout-library.md`).
- **1.2 (Oct 2026)** — Added E10 (runs and other training alongside cycling).
- **1.1 (Oct 2026)** — Added E9 (training on 5–6 hours a week) and the training protocol built on it.
- **1.0 (Oct 2026)** — Initial library: E1–E8.
