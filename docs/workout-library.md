# Hour Power workout library

*Generated from `src/lib/plan/catalogue.ts` and `src/lib/plan/library.ts`; do not edit by hand. Regenerate with `WRITE_DOCS=1 npx vitest run catalogue`.*

Every workout Hour Power can prescribe, grouped into families of variations (level 1 is the easiest). Targets are shares of the rider's
hour power. Evidence IDs refer to `docs/training-science.md`; confidence levels are defined there. ✓ marks workouts the planner's
menus (`MENU` in `src/lib/plan/protocol.ts`) prescribe today; the rest are catalogued and ready for the planner to use.

Studies that set intensity from peak aerobic power (the top of a ramp test) are converted with hour power ≈ 75% of peak aerobic
power. That ratio is a coaching rule of thumb, not a measured value.

**31 ride workouts in 11 families, plus 5 strength sessions.**

## Easy and endurance

The bulk of the week's riding: aerobic base with little fatigue (E1). **Progression:** Longer, not harder. The slot length sets the duration.

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | **Recovery spin**<br>`recovery-spin` | steady 45–55% | 30 (20–45) | – | base, build, specific, taper, flex | easy day, comeback | E1, E8 | Practice |
| 2 | ✓ **Endurance ride**<br>`endurance` | steady 60–75% | 55 (30–300) | – | base, build, specific, taper, flex | easy day, long ride, comeback | E1 | Moderate |

Sources:
- Recovery weeks and easy days (E8); Neal et al. 2013; Stöggl & Sperlich 2014: most riding easy, with the hard work kept hard
- Neal et al. 2013; Stöggl & Sperlich 2014: most riding easy, with the hard work kept hard

## Sprints

Top-end snap and very high power for short bursts. **Progression:** 6 × 15 s inside an easy ride, then 12 × 30 s near-all-out as a hard session.

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | ✓ **Endurance + 6 × 15 s sprints**<br>`sprints-6x15s` | 6 × 15 s at 180–250% / 3 min at 50–65% | 37 (35–90) | 1.5 min | base, build, specific, taper | day after key, second, easy day, comeback, taper | E1 | Practice |
| 2 | **12 × 30 s near-all-out**<br>`sprint-intervals-12x30` | 12 × 30 s at 190–240% / 4 min at 50–65% | 73 (50–80) | 6 min | build, specific | second | E9 | Moderate |

Sources:
- Practice: short sprints keep top-end power with almost no fatigue, so the day stays easy (E1)
- Stepto et al. 1999: 12 × 30 s at 175% of peak aerobic power was the other format that improved 40 km time trials; 60 s, 2 min and 8 min formats did not

## Tempo

Aerobic strength at 76–87% of hour power, cheap to recover from. **Progression:** 3 × 10 → 2 × 20 min.

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | ✓ **3 × 10 min tempo**<br>`tempo-3x10` | 3 × 10 min at 76–87% / 4 min at 50–65% | 53 (35–75) | 30 min | base | second | E1, E3 | Practice |
| 2 | **2 × 20 min tempo**<br>`tempo-2x20` | 2 × 20 min at 76–87% / 5 min at 50–65% | 60 (45–80) | 40 min | base | second | E1, E3 | Practice |

Sources:
- Standard coaching practice for time-crunched riders (E3); no direct trial in low-volume amateurs; the pyramidal base of Filipas et al. 2022

## Sweet spot

Lots of time at 88–94% of hour power for the fatigue it costs. **Progression:** 3 × 12 → 4 × 10 → 2 × 20 → 3 × 15 min.

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | ✓ **3 × 12 min sweet spot**<br>`sweetspot-3x12` | 3 × 12 min at 88–94% / 4 min at 50–65% | 59 (35–75) | 36 min | base | second, day after key | E3 | Practice |
| 2 | **4 × 10 min sweet spot**<br>`sweetspot-4x10` | 4 × 10 min at 88–94% / 4 min at 50–65% | 67 (40–75) | 40 min | base | second, day after key | E3 | Practice |
| 3 | **2 × 20 min sweet spot**<br>`sweetspot-2x20` | 2 × 20 min at 88–94% / 5 min at 50–65% | 60 (45–80) | 40 min | base | second | E3 | Practice |
| 4 | **3 × 15 min sweet spot**<br>`sweetspot-3x15` | 3 × 15 min at 88–94% / 5 min at 50–65% | 70 (50–80) | 45 min | base | second | E3 | Practice |

Sources:
- Standard coaching practice for time-crunched riders (E3); no direct trial in low-volume amateurs

## Threshold

Raise hour power directly with long efforts at 97–102% of it. **Progression:** 3 × 10 → 2 × 15 → 2 × 20 min, with over-unders as the variety option.

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | **3 × 10 min threshold**<br>`threshold-3x10` | 3 × 10 min at 97–102% / 5 min at 50–65% | 63 (35–75) | 30 min | base, build | key, second | E3 | Practice |
| 2 | ✓ **2 × 15 min threshold**<br>`threshold-2x15` | 2 × 15 min at 97–102% / 5 min at 50–65% | 60 (35–75) | 30 min | base, build, specific | key, second | E3 | Practice |
| 3 | **2 × 20 min threshold**<br>`threshold-2x20` | 2 × 20 min at 97–102% / 6 min at 50–65% | 69 (45–80) | 40 min | base, build, specific | key, second | E3 | Practice |
| 4 | ✓ **Over-unders 3 × (3 × 2/1)**<br>`threshold-over-under` | 3 sets of (3 × 2 min at 92–95% / 1 min at 105–110%), 5 min easy between | 54 (40–70) | 18 min | base, build | key, second | E3 | Practice |

Sources:
- Standard coaching practice for time-crunched riders (E3); no direct trial in low-volume amateurs
- Standard coaching practice for time-crunched riders (E3); no direct trial in low-volume amateurs; variety within the threshold block (P5)

## Just above hour power

Five-minute efforts at 102–110% of hour power with short breaks. **Progression:** 6 × 5 → 8 × 5 min (Lindsay and Hawley's range).

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | **6 × 5 min just above hour power**<br>`supra-6x5` | 6 × 5 min at 102–110% / 1 min at 50–65% | 58 (40–75) | 30 min | base, build | key, second | E9 | Moderate |
| 2 | **8 × 5 min just above hour power**<br>`supra-8x5` | 8 × 5 min at 102–110% / 1 min at 50–65% | 70 (45–80) | 40 min | build, specific | key, second | E9 | Moderate |

Sources:
- Lindsay, Hawley et al. 1996: 6–8 × 5 min at 80% of peak aerobic power (≈107% of hour power), 60 s recovery, added to base training, improved 40 km time trials

## VO2 · short intervals (30/15s)

Time at a high share of VO2max from short work and shorter rest. The main VO2 format (P4). **Progression:** 2 × 10 → 3 × 10 → 3 × 13 (the Rønnestad session).

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | **30/15s · 2 × 10**<br>`vo2-30-15-2x10` | 2 sets of (10 × 30 s at 120–135% / 15 s at 45–55%), 3 min easy between | 41 (35–60) | 10 min | base, build | key, second | E2 | Moderate |
| 2 | **30/15s · 3 × 10**<br>`vo2-30-15-3x10` | 3 sets of (10 × 30 s at 120–135% / 15 s at 45–55%), 3 min easy between | 51 (40–60) | 15 min | build, specific | key, second | E2 | Moderate |
| 3 | ✓ **30/15s · 3 × 13**<br>`vo2-30-15` | 3 sets of (13 × 30 s at 120–135% / 15 s at 45–55%), 3 min easy between | 58 (40–60) | 19.5 min | build, specific | key, second | E1, E2 | Moderate |

Sources:
- Rønnestad et al. 2015 (and 2020, elite): 3 × 13 × 30 s on / 15 s off, twice a week for 10 weeks, beat effort-matched 4 × 5 min (entry dose)
- Rønnestad et al. 2015 (and 2020, elite): 3 × 13 × 30 s on / 15 s off, twice a week for 10 weeks, beat effort-matched 4 × 5 min (one step short)
- Rønnestad et al. 2015 (and 2020, elite): 3 × 13 × 30 s on / 15 s off, twice a week for 10 weeks, beat effort-matched 4 × 5 min

## VO2 · long intervals

Four- and five-minute efforts above hour power. Good outdoors on a steady climb. **Progression:** 4 × 4 → 5 × 4 → 4 × 5 → 8 × 4 min.

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | **4 × 4 min VO2**<br>`vo2-4x4` | 4 × 4 min at 106–115% / 3 min at 50–65% | 48 (40–65) | 16 min | build, specific | key, second | E2 | Practice |
| 2 | ✓ **5 × 4 min VO2**<br>`vo2-5x4` | 5 × 4 min at 106–115% / 3 min at 50–65% | 55 (45–70) | 20 min | build, specific | key, second | E1, E2 | Moderate |
| 3 | **4 × 5 min VO2**<br>`vo2-4x5` | 4 × 5 min at 105–112% / 2.5 min at 50–65% | 51 (45–70) | 20 min | build, specific | key, second | E2 | Moderate |
| 4 | **8 × 4 min hard**<br>`vo2-8x4` | 8 × 4 min at 108–115% / 1.5 min at 50–65% | 66 (50–75) | 32 min | build, specific | key, second | E9 | Moderate |

Sources:
- Practice: entry to long VO2 intervals before 5 × 4 (E2)
- Rønnestad et al. 2015 long-interval format, in 4-minute pieces (E2)
- Rønnestad et al. 2015: the long-interval comparison group, 4 × 5 min with 2.5 min recovery
- Stepto et al. 1999: 8 × 4 min at 85% of peak aerobic power (≈113% of hour power) was one of the two formats that improved 40 km time trials most

## Event climbing pace

Efforts at the power the goal needs; they also refresh the hour-power estimate. **Progression:** 2 × 12 → 3 × 10 → 2 × 20 min.

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | ✓ **2 × 12 min steady climb pace**<br>`climb-pace-2x12` | 2 × 12 min at 95–100% / 6 min at 50–65% | 50 (35–60) | 24 min | specific, taper | key | E3 | Practice |
| 2 | **3 × 10 min steady climb pace**<br>`climb-pace-3x10` | 3 × 10 min at 95–100% / 6 min at 50–65% | 62 (40–75) | 30 min | specific | key | E3 | Practice |
| 3 | **2 × 20 min steady climb pace**<br>`climb-pace-2x20` | 2 × 20 min at 95–100% / 6 min at 50–65% | 66 (50–80) | 40 min | specific | key | E3 | Practice |

Sources:
- Standard coaching practice for time-crunched riders (E3); no direct trial in low-volume amateurs; specificity: work close to race pace improved 1-hour performance (Stepto et al. 1999)
- Standard coaching practice for time-crunched riders (E3); no direct trial in low-volume amateurs; specificity (Stepto et al. 1999)

## Long ride with late efforts

Holding power when already tired, for long events (E6), with fuel practice (E7). **Progression:** Tempo → sweet spot → climb pace in the final hour.

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | ✓ **Long ride · efforts in the final hour**<br>`long-ride-late-efforts` | 90 min+ steady, then 3 × 10 min at 82–90% / 5 min at 50–65% | 155 (120–330) | 30 min | build, specific | long ride | E6, E7 | Moderate |
| 2 | **Long ride · sweet spot in the final hour**<br>`long-ride-late-sweetspot` | 90 min+ steady, then 2 × 15 min at 88–94% / 5 min at 50–65% | 150 (150–330) | 30 min | build, specific | long ride | E6, E7 | Moderate |
| 3 | **Long ride · climb pace in the final hour**<br>`long-ride-late-climb-pace` | 120 min+ steady, then 3 × 8 min at 95–100% / 5 min at 50–65% | 179 (180–330) | 24 min | specific | long ride | E6, E7 | Moderate |

Sources:
- Maunder et al. 2021: what matters in long events is how much power falls late in the ride
- Maunder et al. 2021: what matters in long events is how much power falls late in the ride; event rehearsal at goal power

## Taper sharpeners

Keep intensity while volume drops before the event (E4). **Progression:** Openers in taper week 1 and event week; one set of 30/15s for a rider used to them.

| Lvl | Workout | Main set | Min (range) | Quality | Phases | Roles | Evidence | Confidence |
|---|---|---|---|---|---|---|---|---|
| 1 | **Openers · 4 × 2 min at goal pace**<br>`taper-openers` | 4 × 2 min at 95–102% / 3 min at 50–65% | 40 (30–60) | 8 min | taper | key, taper | E4 | Strong |
| 2 | **30/15s · 1 × 10 (taper)**<br>`taper-30-15` | 10 × 30 s at 120–135% / 15 s at 45–55% | 30 (30–50) | 5 min | taper | second, taper | E2, E4 | Strong |

Sources:
- Bosquet et al. 2007 meta-analysis: keep intensity, cut volume 41–60% over about two weeks
- Bosquet et al. 2007 meta-analysis: keep intensity, cut volume 41–60% over about two weeks; Rønnestad et al. 2015 (and 2020, elite): 3 × 13 × 30 s on / 15 s off, twice a week for 10 weeks, beat effort-matched 4 × 5 min

## Strength (P9, E5)

| Session | Phases | Per week | Sets | Lifts | Notes | Confidence |
|---|---|---|---|---|---|---|
| **Heavy strength · weeks 1–3**<br>`strength-heavy-1` | base | 2 | Session A: 3 × 10RM<br>Session B: 3 × 6RM | Half squat (Smith machine), Leg press, one leg at a time, One-legged hip flexion, Calf raise | About 2 min between sets. Lift fast, lower slowly. Start lighter than 10RM in week 1 if new to lifting. | Moderate |
| **Heavy strength · weeks 4–6**<br>`strength-heavy-2` | base, build | 2 | Session A: 3 × 8RM<br>Session B: 3 × 5RM | Half squat (Smith machine), Leg press, one leg at a time, One-legged hip flexion, Calf raise | About 2 min between sets. Lift fast, lower slowly. | Moderate |
| **Heavy strength · weeks 7 on**<br>`strength-heavy-3` | base, build | 2 | Session A: 3 × 6RM<br>Session B: 3 × 4RM | Half squat (Smith machine), Leg press, one leg at a time, One-legged hip flexion, Calf raise | About 2 min between sets. Lift fast, lower slowly. Keep off the day before a key ride (P9). | Moderate |
| **Strength · maintenance**<br>`strength-maintenance` | specific | 2 | Session A: 2 × 5RM<br>Session B: 2 × 4RM | Half squat (Smith machine), Leg press, one leg at a time, One-legged hip flexion, Calf raise | Half the sets at the same heavy load, so strength holds while the riding gets harder. If the week is full, one session is the minimum. | Moderate |
| **Mobility and core**<br>`strength-mobility` | taper | 2 | Hip and hamstring mobility 10 min, then dead bug, bird dog and side plank · 3 rounds | Hip and hamstring mobility, Dead bug, Bird dog, Side plank | No heavy leg work in the last 10 days before the event. | Practice |

Sources:
- Rønnestad, Hansen & Raastad (2010, 2017) and Rønnestad & Mujika 2014: four lower-body lifts, 3 × 4–10RM, twice a week, heavy load rising every few weeks
- Rønnestad & Mujika 2014: maintaining strength in season with less volume at a heavy load
- Practice: strength volume drops in the taper (E4, E5)
