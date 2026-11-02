# Hour Power — Training Science

*Version 2.0 · November 2026 · next review January 2027*

This is the evidence behind every workout and planning rule in Hour Power. Workouts in
`src/lib/plan/library.ts` reference these entries by ID, and the app shows the reason for each
session. Evidence is reviewed quarterly: new studies are added, weak claims are downgraded or
removed, and changes are logged at the bottom.

## Source policy

Only these count as evidence here:

1. **Peer-reviewed research** in an indexed journal: randomised or controlled trials, systematic
   reviews and meta-analyses, and narrative reviews by recognised researchers.
2. **Position stands and consensus statements** from professional bodies (e.g. ACSM, ECSS), which
   count as best practice.

Not accepted as evidence: blogs, newsletters, podcasts, forums, coaching or brand websites
(including competitor apps), industry-funded summaries, and preprints that haven't been peer
reviewed. They can prompt a search, but a rule can't rest on them.

**Currency:** prefer research from the last 10 years. Older studies stay only when they're the
original trial behind a protocol we use, or still the best evidence on the question. They are
labelled *foundational*. Every link goes to the DOI, PubMed or the publisher where possible.

**Confidence levels**
- **Strong**: meta-analyses or position stands with consistent findings.
- **Moderate**: several controlled trials or a meta-analysis with some inconsistency or small samples.
- **Limited**: one or two small trials, or reviews of few studies.
- **Practice**: widely used and consistent with the evidence, but not directly tested. Used, but labelled as such.

Targets are expressed as a percentage of the rider's **hour power** (which plays the role FTP plays
in other apps).

**Who the evidence comes from.** Most studies here used trained, mostly male cyclists aged roughly
20–45, over 3–16 weeks. Our riders are 30–55, train 4–8 h a week, and include women. Where a finding
may not carry over, the entry says so (see also *Known gaps* below).

---

## E1 · Intensity distribution: mostly easy, a little hard
**Confidence: Moderate**

- Seiler's review of elite endurance athletes found they do most of their training at low intensity,
  with fewer, carefully placed hard sessions. Studies that made already well-trained athletes do more
  high-intensity work gave no convincing long-term gains (Seiler 2010).
- Polarised training (mostly easy, some hard, little threshold) improved VO2peak, time to exhaustion
  and peak power most in 48 well-trained athletes over 9 weeks (Stöggl & Sperlich 2014). Critics note
  the comparison groups were extreme (e.g. threshold-only).
- Most well-trained and elite athletes train with a pyramidal distribution: mostly easy, less
  threshold, least high intensity. Some world-class athletes polarise in certain phases (Stöggl &
  Sperlich 2015).
- **Newest and strongest:** an individual-participant network meta-analysis of 13 studies
  (348 athletes, 52 women) found no overall difference between polarised and pyramidal in VO2max or
  time-trial performance. Competitive athletes may gain more VO2max from polarised, and recreational
  athletes from pyramidal (Rosenblat et al. 2025).

**How Hour Power uses it:** at most 2 hard sessions in a normal week (3 in a short, high-priority block),
the rest easy. For a ~6 h/week rider a **pyramidal** split (some threshold or sweet spot) is used in base,
because low-volume and recreational riders do at least as well on it (Rosenblat et al. 2025; see E9).

## E2 · Interval formats for VO2max: 30/15s and longer intervals
**Confidence: Moderate** that both formats work · **Limited** that 30/15s beat longer intervals

- **30/15s beat effort-matched 4 × 5 min in one lab's trials.** Trained cyclists, 10 weeks, twice
  weekly: 3 × 13 × 30 s on / 15 s off improved 40-min power and other performance measures more than
  4 × 5 min with 2.5 min rest (Rønnestad et al. 2015). In 18 elite cyclists, 3 weeks and 9 sessions,
  the short intervals improved peak aerobic power and 20-min power more, with no difference in VO2max
  (Rønnestad et al. 2020). A 1-week block of five 30/15 sessions improved VO2max and power at
  4 mmol/L lactate more than a block of 5-min intervals (Rønnestad et al. 2021).
- **A 30/15 block also beat regular training.** Five 30/15 sessions in 6 days, then 6 easier days,
  improved peak aerobic power and sprint power more than 12 days of regular training, with no
  difference in VO2max or 15-min power (Eur J Sport Sci 2025).
- **But reviews find no clear winner by format.** A meta-analysis in trained cyclists found interval
  training gives small gains over endurance training alone, with no clear advantage for any interval
  length; prescription should be individual (Norte, Steele & Wright 2024). A meta-analysis of
  randomised trials in adults found long intervals (≥ 2 min), more total work (≥ 15 min) and longer
  programmes (≥ 4 weeks) gave the biggest VO2max gains, though short intervals also worked (Wen et
  al. 2019).
- **Time near VO2max favours longer work bouts.** A 2026 meta-analysis of 86 studies found work
  intervals of ≥ 2 min gave more time at ≥ 90% VO2max than 30-s intervals, and that varying the power
  within an interval added more. Whether that time predicts long-term gains is not settled
  (Schoenmakers et al. 2026).
- **In highly trained athletes,** HIIT added to normal training improves time-trial performance and
  most other measures; more aerobic types of HIIT do more for VO2max. Effects of sex, phase and
  interval type remain uncertain (Wiesinger et al. 2024, 2025).

**How Hour Power uses it:** 30/15 sets are the default VO2 session; 4–5 × 4–5 min is the alternative
for variety and outdoor rides, rotated every three loading weeks (P5).

> **Review flag (Jan 2027):** the evidence no longer supports 30/15s as *superior*: only as one of two
> good options. Consider treating 30/15s and 4–5 min intervals as equal partners in P4, and test
> power that varies within a long interval (Schoenmakers et al. 2026).

## E3 · Threshold and sweet-spot work for time-crunched riders
**Confidence: Practice** (no direct trial in low-volume amateurs)

- Long intervals just below and at threshold (e.g. 2 × 15–20 min at 95–100% of hour power, or 88–94%
  "sweet spot") are standard coaching practice for raising sustainable power when weekly hours are
  limited.
- Indirect support: a pyramidal distribution, which includes this work, matches or beats polarised
  for recreational athletes (Rosenblat et al. 2025).
- Caution: a threshold-heavy 6-week block improved trained cyclists less than a polarised block
  (Neal et al. 2013). Adding work above threshold improves VO2peak more than training below it alone,
  though the effect on time-trial performance is unproven (Rosenblat et al. 2024).

**How Hour Power uses it:** threshold and sweet-spot sessions are the core weekday sessions in base
and when the goal is hour power or a long event, capped by E1 so they never crowd out easy riding or
the high-intensity sessions in the build.

## E4 · Tapering before an event
**Confidence: Strong**

- A meta-analysis of 27 studies found the most effective taper lasted **about 2 weeks**, with training
  **volume cut by 41–60%** (progressively), **without** reducing intensity or frequency
  (Bosquet et al. 2007, *foundational*).
- A 2023 meta-analysis of 14 studies in endurance athletes confirmed it: cutting volume by 41–60%,
  keeping intensity and frequency, over up to 21 days, improved time-trial performance. Tapers worked
  best after a period of overload (Wang et al. 2023).

**How Hour Power uses it:** A-goal events get a 1–2 week taper: volume down ~40–60%, short efforts at
target intensity kept, number of rides kept where possible.

## E5 · Heavy strength training alongside cycling
**Confidence: Moderate**

- For cycling, the most compelling evidence of an added benefit is for **heavy** strength training,
  likely through better efficiency and more fatigue-resistant muscle (Rønnestad & Mujika 2014).
- A 2025 meta-analysis (17 studies, 262 cyclists, 60 women) found heavy strength training improved
  cycling performance, efficiency and anaerobic power, with no loss of VO2max. Certainty was rated low
  and no effect of sex or performance level was found (Llanos-Lagos et al. 2025).
- The protocol behind the trials: half squat, one-legged leg press, one-legged hip flexion and calf
  raise, **3 sets of 4–10RM, twice a week**, about 2 min between sets, lifting fast and lowering
  slowly, with the load rising every few weeks (10RM/6RM → 8RM/5RM → 6RM/4RM)
  (Rønnestad, Hansen & Raastad 2010; Rønnestad, Hansen & Nygaard 2017).

**How Hour Power uses it:** 1–2 strength sessions a week are welcomed, not replaced. Hard rides are not
scheduled the morning after heavy leg sessions where the week allows; strength volume drops in the taper.

## E6 · Durability: holding power late in long rides
**Confidence: Moderate**

- Standard fitness profiles are measured fresh, but in long events what matters is how much they fall
  during prolonged exercise (Maunder et al. 2021).
- This "physiological resilience" has been proposed as a fourth determinant of endurance performance,
  alongside VO2max, efficiency and threshold (Jones 2024).
- First direct support: after 150 min of moderate riding, trained cyclists who held their first
  threshold better also lost less 5-min power (Hamilton et al. 2024).

**How Hour Power uses it:** the engine measures durability from late-ride power (it scales hour power),
and gran fondo goals add long rides with efforts placed late in the ride.

## E7 · Carbohydrate during rides
**Confidence: Strong** (position stand)

- The joint ACSM / Academy of Nutrition and Dietetics / Dietitians of Canada position: **30–60 g of
  carbohydrate per hour** for about 1–2.5 h; **up to 90 g/h** for exercise over ~2.5–3 h, from
  mixed sugars (glucose + fructose) (Thomas, Erdman & Burke 2016).
- Glucose + fructose mixes are absorbed faster and support more performance than a single sugar at
  high intakes; ratios of about 0.5–1:1 fructose to glucose worked best (Rowlands et al. 2015).
- The gut adapts to higher intakes with practice (Jeukendrup 2017).
- A 2026 review revisits the guidelines and discusses intakes above 90 g/h for elite athletes in long
  events (Morton et al. 2026). Not applied to Hour Power riders.

**How Hour Power uses it:** every ride over ~75 min gets a fuel target by duration and intensity, long
rehearsal rides step intake up towards the event target, and event plans default to 60–90 g/h.

## E8 · Recovery weeks
**Confidence: Practice** (consistent with consensus guidance)

- Training must include overload but avoid overload plus too little recovery; non-training stress
  counts towards the total (Meeusen et al. 2013, ECSS/ACSM joint consensus).
- Lighter weeks every 3rd or 4th week are standard practice to absorb training. No trial compares
  recovery-week frequencies directly.

**How Hour Power uses it:** a lighter week every 3–4 weeks (every 3rd when check-ins report high stress),
roughly 30–40% less volume with one short quality session kept.

---

## E9 · Training on 5–6 hours a week
**Confidence: Moderate** (trained, mostly male cyclists, 4–16 week studies)

- **Polarised beat threshold at about 6 h a week.** In 12 trained cyclists, a 6-week polarised block
  (about 6.4 h/week) improved performance and physiology more than a threshold-heavy block (Neal et
  al. 2013).
- **Consistency matters more than volume.** A meta-analysis of 41 studies (797 trained cyclists) found
  every approach improved VO2max and time trials, with no difference between polarised and other
  mixes. Weekly volume wasn't linked to bigger gains, but longer programmes were (Cove et al. 2025).
- **Recreational riders may suit pyramidal** (Rosenblat et al. 2025; see E1).
- **Intervals work fast.** Adding 4 weeks of 6–8 × 5 min at 80% of peak aerobic power (60 s recovery)
  to base training improved 40 km time trials (Lindsay et al. 1996, *foundational*). Of five interval
  formats, 8 × 4 min at 85% and 12 × 30 s at 175% of peak aerobic power improved 40 km time trials
  most (Stepto et al. 1999, *foundational*).
- **Sequence:** in 60 well-trained runners over 16 weeks, pyramidal followed by polarised improved
  performance most (Filipas et al. 2022). Runners, not cyclists.
- **Small doses still work.** Short-interval, low-volume HIIT raised VO2max in randomised trials,
  mostly in non-athletes (Wen et al. 2019).

**How Hour Power uses it:** the training protocol (`docs/training-protocol.md`): two
quality sessions a week at most, at least 70–75% of riding time easy, a pyramidal base then a polarised
build, interval types rotated every three loading weeks, and the day after a hard session kept easy.

## E10 · Runs and other training alongside cycling
**Confidence: Limited** (reviews of few, small studies; the thresholds below are the protocol's choices)

- **Some aerobic fitness transfers, never all.** Part of the VO2max gain from one sport carries over
  to another: running transfers the most, swimming the least. Cross-training never matched
  sport-specific training (Tanaka 1994, *foundational*).
- **Running costs the legs more.** Prolonged running causes larger falls in leg strength than
  cycling of similar duration (Millet & Lepers 2004, *foundational*).

**How Hour Power uses it:** P18–P19. A run, row or swim of 30+ min can stand in for an easy ride that day,
but never for a key session or the long ride. A hard or long run the day before turns a hard session easy.

## E11 · Riders over 35
**Confidence: Limited** (few trials; mostly men)

- **Intervals still work for masters riders.** In 50 male road cyclists aged 35–49, adding two
  interval sessions a week (4-min efforts) to continuous training for 12 weeks raised VO2max and peak
  power. 40 km time trials improved in all groups, including continuous training only
  (Tangchaisuriya et al. 2022).
- **Recovery feels slower with age.** After a hard interval session, cyclists in their mid-50s
  recovered physically as fast as cyclists in their mid-20s, but reported more fatigue, more soreness
  and lower motivation 48 h later (Borges et al. 2018).

**How Hour Power uses it:** no age-specific rules yet. The existing safeguards cover this: no
back-to-back hard days (P8), recovery every 3rd week under high stress (E8), and check-ins that turn a
hard day easy.

> **Review flag (Jan 2027):** consider letting riders choose 3-week cycles in Settings (not by age,
> so we don't need to collect it), and use check-in fatigue 48 h after hard sessions to adjust spacing.

---

## Known gaps

- **Women:** usually 0–20% of participants. Two recent meta-analyses found no clear effect of sex
  (Llanos-Lagos et al. 2025; Wiesinger et al. 2025), but with so few women included, a difference
  can't be ruled out.
- **Riders over 45 and riders on 4–8 h a week:** almost no interval or distribution trials.
- **Threshold and sweet spot (E3):** no trial in low-volume amateurs.
- **Recovery-week frequency (E8):** practice only.
- **Small samples everywhere:** most training trials have 8–20 per group, too few to detect
  realistic differences between methods (Rosenblat et al. 2024).

## Sources

All peer-reviewed or position stands. *Foundational* = older than 10 years, kept as the original
trial behind a protocol or the best evidence on the question.

**Intensity distribution and low-volume training**
- Seiler S (2010). What is best practice for training intensity and duration distribution in endurance athletes? *Int J Sports Physiol Perform* 5(3):276–291. https://doi.org/10.1123/ijspp.5.3.276 *(foundational)*
- Stöggl T, Sperlich B (2014). Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training. *Front Physiol* 5:33. https://doi.org/10.3389/fphys.2014.00033
- Stöggl TL, Sperlich B (2015). The training intensity distribution among well-trained and elite endurance athletes. *Front Physiol* 6:295. https://doi.org/10.3389/fphys.2015.00295
- Neal CM et al. (2013). Six weeks of a polarized training-intensity distribution leads to greater physiological and performance adaptations than a threshold model in trained cyclists. *J Appl Physiol* 114(4):461–471. https://doi.org/10.1152/japplphysiol.00652.2012
- Cove et al. (2025). The effect of training distribution, duration, and volume on VO2max and performance in trained cyclists: a systematic review, multilevel meta-analysis, and multivariate meta-regression. *J Sci Med Sport* 28(5):423–434. https://doi.org/10.1016/j.jsams.2024.12.005
- Rosenblat MA, Watt JA, Arnold JI, et al. (2025). Which training intensity distribution intervention will produce the greatest improvements in maximal oxygen uptake and time-trial performance in endurance athletes? A systematic review and network meta-analysis of individual participant data. *Sports Med* 55(3):655–673. https://doi.org/10.1007/s40279-024-02149-3
- Rosenblat MA, Arnold J, Nelson H, Watt J, Seiler S (2024). The additional effect of training above the maximal metabolic steady state on VO2peak, Wpeak and time-trial performance in endurance-trained athletes: a systematic review, meta-analysis, and reality check. *Sports Med* 54(2):429–446. https://doi.org/10.1007/s40279-023-01924-y
- Filipas L, Bonato M, Gallo G, Codella R (2022). Effects of 16 weeks of pyramidal and polarized training intensity distributions in well-trained endurance runners. *Scand J Med Sci Sports* 32(3):498–511. https://doi.org/10.1111/sms.14101

**Interval training**
- Rønnestad BR, Hansen J, Vegge G, Tønnessen E, Slettaløkken G (2015). Short intervals induce superior training adaptations compared with long intervals in cyclists: an effort-matched approach. *Scand J Med Sci Sports* 25(2):143–151. https://doi.org/10.1111/sms.12165
- Rønnestad BR et al. (2020). Superior performance improvements in elite cyclists following short-interval vs effort-matched long-interval training. *Scand J Med Sci Sports* 30(5):849–857. https://doi.org/10.1111/sms.13627
- Rønnestad BR, Øfsteng SJ, Zambolin F, Raastad T, Hammarström D (2021). Superior physiological adaptations after a microcycle of short intervals versus long intervals in cyclists. *Int J Sports Physiol Perform* 16(10):1432–1438. https://doi.org/10.1123/ijspp.2020-0647
- A microcycle of high-intensity short-interval sessions induces improvements in indicators of endurance performance compared to regular training (2025). *Eur J Sport Sci* 25(1):e12223. https://pubmed.ncbi.nlm.nih.gov/39639702/ *(author list to add at review)*
- Norte B, Steele J, Wright J (2024). Physiological and performance adaptations to interval training in endurance-trained cyclists: an exploratory systematic review and meta-analysis. *Int J Strength Cond* 4(1). https://doi.org/10.47206/ijsc.v4i1.271
- Wen D, Utesch T, Wu J, et al. (2019). Effects of different protocols of high intensity interval training for VO2max improvements in adults: a meta-analysis of randomised controlled trials. *J Sci Med Sport* 22(8):941–947. https://doi.org/10.1016/j.jsams.2019.01.013
- Schoenmakers P, Murray K, White J, Matta G, Bossi AH (2026). Time spent at or near VO2max during high-intensity interval training: a systematic review and meta-analysis. *BMC Sports Sci Med Rehabil* 18:358. https://doi.org/10.1186/s13102-026-01766-x
- Wiesinger H-P, Stöggl TL, Haller N, et al. (2025). Meta-analyses of the effects of high-intensity interval training in elite athletes, part I: mean effects on various performance measures. *Front Physiol* 15:1486526. https://doi.org/10.3389/fphys.2024.1486526
- Wiesinger H-P, Hopkins WG, Haller N, et al. (2024). Meta-analyses of the effects of high-intensity interval training in elite athletes, part II: relationships between the mean effects on various performance measures. *Front Physiol* 15:1486570. https://doi.org/10.3389/fphys.2024.1486570
- Lindsay FH, Hawley JA, Myburgh KH, Schomer HH, Noakes TD, Dennis SC (1996). Improved athletic performance in highly trained cyclists after interval training. *Med Sci Sports Exerc* 28(11):1427–1434. https://journals.lww.com/acsm-msse/Fulltext/1996/11000/Improved_athletic_performance_in_highly_trained.13.aspx *(foundational)*
- Stepto NK, Hawley JA, Dennis SC, Hopkins WG (1999). Effects of different interval-training programs on cycling time-trial performance. *Med Sci Sports Exerc* 31(5):736–741. https://doi.org/10.1097/00005768-199905000-00018 *(foundational)*

**Masters riders**
- Tangchaisuriya P, Chuensiri N, Tanaka H, Suksom D (2022). Physiological adaptations to high-intensity interval training combined with blood flow restriction in masters road cyclists. *Med Sci Sports Exerc* 54(5):830–840. https://doi.org/10.1249/MSS.0000000000002857
- Borges NR, Reaburn PR, Doering TM, Argus CK, Driller MW (2018). Age-related changes in physical and perceptual markers of recovery following high-intensity interval cycle exercise. *Exp Aging Res* 44(4):338–349. https://doi.org/10.1080/0361073X.2018.1477361

**Taper and recovery**
- Bosquet L, Montpetit J, Arvisais D, Mujika I (2007). Effects of tapering on performance: a meta-analysis. *Med Sci Sports Exerc* 39(8):1358–1365. https://doi.org/10.1249/mss.0b013e31806010e0 *(foundational)*
- Wang Z, Wang YT, Gao W, Zhong Y (2023). Effects of tapering on performance in endurance athletes: a systematic review and meta-analysis. *PLoS ONE* 18(5):e0282838. https://doi.org/10.1371/journal.pone.0282838
- Meeusen R, Duclos M, Foster C, et al. (2013). Prevention, diagnosis, and treatment of the overtraining syndrome: joint consensus statement of the ECSS and the ACSM. *Med Sci Sports Exerc* 45(1):186–205. https://doi.org/10.1249/MSS.0b013e318279a10a *(foundational; current consensus)*

**Strength training**
- Rønnestad BR, Mujika I (2014). Optimizing strength training for running and cycling endurance performance: a review. *Scand J Med Sci Sports* 24(4):603–612. https://doi.org/10.1111/sms.12104
- Rønnestad BR, Hansen EA, Raastad T (2010). Effect of heavy strength training on thigh muscle cross-sectional area, performance determinants, and performance in well-trained cyclists. *Eur J Appl Physiol* 108:965–975. *(foundational: protocol origin)*
- Rønnestad BR, Hansen J, Nygaard H (2017). 10 weeks of heavy strength training improves performance-related measurements in elite cyclists. *J Sports Sci* 35(14):1435–1441. https://doi.org/10.1080/02640414.2016.1215499
- Llanos-Lagos C, Ramirez-Campillo R, Sáez de Villarreal E (2025). Heavy strength training effects on physiological determinants of endurance cyclist performance: a systematic review with meta-analysis. *Eur J Appl Physiol*. https://doi.org/10.1007/s00421-025-05883-2

**Durability**
- Maunder E, Seiler S, Mildenhall MJ, Kilding AE, Plews DJ (2021). The importance of 'durability' in the physiological profiling of endurance athletes. *Sports Med* 51:1619–1628. https://doi.org/10.1007/s40279-021-01459-0
- Jones AM (2024). The fourth dimension: physiological resilience as an independent determinant of endurance exercise performance. *J Physiol* 602(17):4113–4128. https://doi.org/10.1113/JP284205
- Hamilton K, Kilding AE, Plews DJ, et al. (2024). Durability of the moderate-to-heavy-intensity transition is related to the effects of prolonged exercise on severe-intensity performance. *Eur J Appl Physiol* 124(8):2427–2438. https://doi.org/10.1007/s00421-024-05459-6

**Fuelling**
- Thomas DT, Erdman KA, Burke LM (2016). Nutrition and athletic performance: joint position statement of the Academy of Nutrition and Dietetics, Dietitians of Canada, and the American College of Sports Medicine. *Med Sci Sports Exerc* 48(3):543–568. https://doi.org/10.1249/MSS.0000000000000852 *(current position stand)*
- Rowlands DS, Houltham S, Musa-Veloso K, Brown F, Paulionis L, Bailey D (2015). Fructose–glucose composite carbohydrates and endurance performance: critical review and future perspectives. *Sports Med* 45(11):1561–1576. https://www.springermedicine.com/fructose-glucose-composite-carbohydrates-and-endurance-performan/22254370
- Jeukendrup AE (2017). Training the gut for athletes. *Sports Med* 47(Suppl 1):101–110. https://doi.org/10.1007/s40279-017-0690-6
- Morton JP, Fell JM, Gonzalez JT, Hearris MA, Podlogar T, Pugh JN, Wallis GA (2026). From metabolism to medals: contemporary perspectives and revisiting carbohydrate guidelines for fuelling endurance athletes during exercise. *J Nutr*. https://doi.org/10.1016/j.tjnut.2026.101442

**Cross-training**
- Tanaka H (1994). Effects of cross-training: transfer of training effects on VO2max between cycling, running and swimming. *Sports Med* 18(5):330–339. https://pubmed.ncbi.nlm.nih.gov/7871294/ *(foundational)*
- Millet GY, Lepers R (2004). Alterations of neuromuscular function after prolonged running, cycling and skiing exercises. *Sports Med* 34(2):105–116. https://pubmed.ncbi.nlm.nih.gov/14965189/ *(foundational)*

## Changelog

- **2.0 (Nov 2026)**: Source policy added: peer-reviewed research and position stands only. Removed blogs, newsletters, podcasts, forum posts, coaching sites and an industry summary; every link now goes to the DOI, PubMed or the publisher. Added recent evidence: Rosenblat et al. 2024 and 2025, Cove et al. 2025, Norte et al. 2024, Wiesinger et al. 2024 and 2025, Schoenmakers et al. 2026, a 2025 30/15 block trial, Wang et al. 2023 (taper), Llanos-Lagos et al. 2025 (strength), Jones 2024 and Hamilton et al. 2024 (durability), the 2016 joint nutrition position stand, Rowlands et al. 2015, Jeukendrup 2017 and Morton et al. 2026 (fuelling), and Meeusen et al. 2013 (recovery). E2 split into two confidence ratings: "30/15s beat long intervals" downgraded to Limited. E10 relabelled Limited. New E11 (riders over 35) and *Known gaps* section. Review flags added to E2 and E11 for the January 2027 review; no planning rules changed.
- **1.3 (Oct 2026)**: Added the protocol details (Rønnestad strength programme; Lindsay and Stepto interval formats) used by the workout catalogue (`src/lib/plan/catalogue.ts`, `docs/workout-library.md`).
- **1.2 (Oct 2026)**: Added E10 (runs and other training alongside cycling).
- **1.1 (Oct 2026)**: Added E9 (training on 5–6 hours a week) and the training protocol built on it.
- **1.0 (Oct 2026)**: Initial library: E1–E8.
