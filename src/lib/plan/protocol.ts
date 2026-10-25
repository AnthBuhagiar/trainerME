import { playerSteps } from "@/lib/player/steps";
import type { PhaseName } from "@/lib/plan/periodise";
import type { WeekPlan } from "@/lib/plan/week";

/**
 * The Hour Power training protocol, as code. docs/training-protocol.md states
 * each rule (P1–P12) with its evidence; the planner (week.ts) builds weeks
 * from these constants and auditWeek checks the result against them.
 */

/** P1: at most this many quality (interval) sessions a week. */
export const MAX_QUALITY_PER_WEEK = 2;

/** P2: minimum share of weekly riding time below tempo (< 76% of hour power), by phase. */
export const MIN_EASY_SHARE: Record<PhaseName, number> = { base: 0.7, build: 0.75, specific: 0.75, taper: 0.75, flex: 0.9 };
/** P2: maximum share of weekly riding time at or above threshold (>= 95% of hour power). */
export const MAX_HARD_SHARE = 0.15;

/** P5: interval types rotate after this many loading weeks, so gains don't plateau. */
export const ROTATE_EVERY_WEEKS = 3;

/**
 * P3/P4: session menus per phase. Base is pyramidal (threshold key, sweet spot or
 * tempo second), build is polarised (short VO2 intervals key, threshold second),
 * event-specific is climbing pace plus a VO2 top-up, taper keeps short sharp work.
 * Each list rotates every ROTATE_EVERY_WEEKS loading weeks. dayAfter (P8) is used
 * when the second session would be hard and falls the day after the key one.
 */
export const MENU: Record<PhaseName, { key: string[]; second: string[]; dayAfter: string; long: string }> = {
  base: { key: ["threshold-2x15", "threshold-over-under"], second: ["sweetspot-3x12", "tempo-3x10"], dayAfter: "sweetspot-3x12", long: "endurance" },
  // Polarised phases: the day after a hard session is easy with short sprints, not more middle-zone work.
  build: { key: ["vo2-30-15", "vo2-5x4"], second: ["threshold-over-under", "threshold-2x15"], dayAfter: "sprints-6x15s", long: "long-ride-late-efforts" },
  specific: { key: ["climb-pace-2x12"], second: ["vo2-30-15", "threshold-2x15"], dayAfter: "sprints-6x15s", long: "long-ride-late-efforts" },
  taper: { key: ["climb-pace-2x12"], second: ["sprints-6x15s"], dayAfter: "sprints-6x15s", long: "endurance" },
  flex: { key: ["endurance"], second: ["endurance"], dayAfter: "endurance", long: "endurance" },
};

/** P5: pick from a rotating menu by loading-week count. */
export function rotate(list: string[], step: number): string {
  return list[Math.floor(step / ROTATE_EVERY_WEEKS) % list.length];
}

/**
 * P6: progression steps for the chosen workout. Within each rotation block the
 * work grows week by week; when a type comes round again it starts one step on.
 */
export function progressionStep(step: number, menuLength: number): number {
  return Math.min(4, (step % ROTATE_EVERY_WEEKS) + Math.floor(step / (ROTATE_EVERY_WEEKS * Math.max(1, menuLength))));
}

/** Time split of one week's riding by intensity, from each workout's steps. */
export function intensitySplit(week: WeekPlan): { easy: number; moderate: number; hard: number; total: number } {
  let easy = 0;
  let moderate = 0;
  let hard = 0;
  for (const s of week.sessions) {
    if (!s.ride) continue;
    // Fine-grained reference power so rounding to 5 W doesn't move a step across a zone boundary.
    for (const st of playerSteps(s.ride.workout, 1000)) {
      const f = st.watts / 1000;
      if (f >= 0.95) hard += st.seconds;
      else if (f >= 0.76) moderate += st.seconds;
      else easy += st.seconds;
    }
  }
  const total = easy + moderate + hard;
  return { easy, moderate, hard, total };
}

export interface Violation {
  rule: string;
  message: string;
}

/** Check a planned week against the protocol. An empty list means it complies. */
export function auditWeek(week: WeekPlan): Violation[] {
  const out: Violation[] = [];
  const rides = week.sessions.filter((s) => s.ride);
  const quality = rides.filter((s) => s.ride!.workout.main && s.ride!.workout.intensity !== "easy" && s.ride!.workout.purpose !== "durability");
  if (quality.length > MAX_QUALITY_PER_WEEK) out.push({ rule: "P1", message: `${quality.length} quality sessions (max ${MAX_QUALITY_PER_WEEK})` });

  const split = intensitySplit(week);
  if (split.total > 0) {
    const easy = split.easy / split.total;
    const hard = split.hard / split.total;
    if (easy < MIN_EASY_SHARE[week.phase]) out.push({ rule: "P2", message: `${Math.round(easy * 100)}% easy (min ${MIN_EASY_SHARE[week.phase] * 100}%)` });
    if (hard > MAX_HARD_SHARE) out.push({ rule: "P2", message: `${Math.round(hard * 100)}% at threshold or above (max ${MAX_HARD_SHARE * 100}%)` });
  }

  if (week.recovery && rides.some((s) => s.ride!.workout.intensity === "hard")) out.push({ rule: "P7", message: "hard session in a recovery week" });

  // Consecutive by date, so it holds whatever day the week starts on.
  const hardDays = rides.filter((s) => s.ride!.workout.intensity === "hard").map((s) => Math.round((Date.parse(s.date) - Date.parse(week.weekStart)) / 86_400_000));
  for (const d of hardDays) if (hardDays.includes(d - 1)) out.push({ rule: "P8", message: `hard sessions on consecutive days (${d - 1}, ${d})` });

  return out;
}
