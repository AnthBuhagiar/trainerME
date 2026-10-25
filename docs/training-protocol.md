# Hour Power training protocol

*Version 1.0 · October 2026*

This is the rulebook Hour Power uses to build every training plan. The app has no AI and doesn't
improvise: plans come from these fixed rules plus the rider's own data (their usual week from Strava,
their goal date, their hour power, their away days and check-ins). The same inputs always produce the
same plan.

Each rule cites its evidence in `docs/training-science.md` (E1–E9). The constants live in
`src/lib/plan/protocol.ts`, the planner that applies them in `src/lib/plan/week.ts` and
`src/lib/plan/periodise.ts`, and `src/lib/plan/protocol.test.ts` checks every week from today to the goal
against them. A change to the rules means changing this document, the code and the tests together.

Intensities are shares of the rider's **training hour power** (their accepted best 60-minute power):
**easy** below 76%, **moderate** (tempo and sweet spot) 76–95%, **hard** (threshold and above) 95% and up.

## The rules

| Rule | What the app does | Evidence |
|---|---|---|
| **P1 · Two quality sessions** | At most two interval sessions a week. Everything else is easy riding, the long ride and strength. | E1, E9 (Neal; Stöggl) |
| **P2 · Mostly easy** | At least **70%** of weekly riding time easy in base, **75%** in build, event-specific and taper, and no more than **15%** at threshold or above. | E1, E9 |
| **P3 · Pyramidal, then polarised** | **Base:** threshold key session, plus sweet spot or tempo. **Build:** short VO2 intervals key, threshold second. **Event-specific:** climbing pace, with a VO2 top-up. **Taper:** short, sharp work only. | E3, E9 (Filipas) |
| **P4 · Short intervals first** | The main VO2 format is 30/15s, alternating with longer 4-minute efforts. | E2, E9 (Rønnestad) |
| **P5 · Rotate to keep improving** | Interval types rotate every **3 loading weeks**, so gains don't plateau. | E9 (Lindsay; Stepto) |
| **P6 · Progress gradually** | Within each rotation block, efforts get about 10% longer or gain a rep each week, up to four steps. Sessions always fit the rider's usual slot. | E3, E8 |
| **P7 · Recovery weeks** | Every 4th loading week runs at about 70% of volume, with no hard sessions. | E8 |
| **P8 · Easy after hard** | If the second session would be hard and falls the day after the key session, it becomes easy riding with short sprints in build and event-specific, or sweet spot in base. Two hard days are never back to back. | E1, E9 |
| **P9 · Strength twice a week** | Heavy in base and build, maintenance in event-specific, mobility only in the taper. Kept off the day before a quality ride where the week allows. | E5 |
| **P10 · The long ride** | Weekly, in the rider's own long slot: steady in base, efforts in the final hour from build on, and about once a month stretched to 3.5 h. | E6, E7 |
| **P11 · Taper** | The last two weeks: volume down to about 60%, then about 45% in event week. Short efforts stay at target power. | E4 |
| **P12 · Life first** | Plans fit inside the rider's usual week, read from their own history. Missed sessions are never carried over. Away days, busy days and check-ins adjust that day only, or re-plan the block for a week away. | E8, E9 (Cove: consistency over volume) |

## What the tests guarantee

For a full block (today to the goal, including the Christmas holiday weeks), `protocol.test.ts` checks:

- **P1, P2, P7, P8 hold every week.** The audit in `auditWeek` comes back empty.
- **Easy share:** every loading week is at least 70% easy.
- **P3 order:** base key sessions are threshold, and build key sessions are VO2.
- **P5 rotation:** no key session repeats more than three loading weeks running.
- **Determinism:** building the plan twice gives identical results.

## Limits

- The studies are mostly on trained men, over 4–12 weeks, with lab time-trial outcomes. There's little
  evidence specifically on riders over 40 or on women.
- The thresholds (70/75% easy, 15% hard, rotation every 3 weeks) are this protocol's choices within what
  the evidence supports, not values taken from a single study.
- Rules are reviewed when `docs/training-science.md` is.
