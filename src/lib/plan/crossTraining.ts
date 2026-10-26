import { kindOf } from "@/lib/plan/timeBudget";
import type { PlannedSession } from "@/lib/plan/week";
import type { Activity } from "@/lib/types";

/**
 * Training that isn't a ride or a strength session: runs, rows, swims, walks.
 * Rules P18–P19 (docs/training-protocol.md):
 *
 *  P18 Other training counts as aerobic load, not as bike work. A run, row,
 *      swim or similar of 30+ min on a day with an easy ride planned counts as
 *      that session done (part of the aerobic benefit transfers; E10). Key
 *      sessions and the long ride are cycling-specific and are never replaced.
 *      It also keeps the rider out of a comeback week: no rides for 14+ days
 *      but still training means easing back in instead (P13).
 *  P19 Hard other training: a hard one yesterday turns today's hard session
 *      easy, like a hard ride (P17). Running costs the legs more than riding
 *      of the same effort (E10).
 */

export const CREDIT_MINUTES = 30;
/** Strava's Relative Effort (heart-rate based) at or above this is a hard session. */
export const HARD_RELATIVE_EFFORT = 100;
/** Without heart rate: a run this long is hard on the legs. */
export const HARD_RUN_MINUTES = 75;

/** Gentle activity: shown, but not counted as training. */
const LIGHT = new Set(["Walk", "Hike", "Yoga", "Pilates", "Golf", "Sail", "StandUpPaddling"]);

export const isOtherTraining = (a: Activity) => {
  const kind = kindOf(a.sportType);
  return kind === "run" || kind === "other";
};

/** Aerobic training that counts (P18): not a ride, not strength, not a gentle walk, 30+ min. */
export const isCardio = (a: Activity) => isOtherTraining(a) && !LIGHT.has(a.sportType) && a.movingTime >= CREDIT_MINUTES * 60;

export function isHardOther(a: Activity): boolean {
  if (!isOtherTraining(a) || LIGHT.has(a.sportType)) return false;
  if (a.relativeEffort !== undefined) return a.relativeEffort >= HARD_RELATIVE_EFFORT;
  return kindOf(a.sportType) === "run" && a.movingTime >= HARD_RUN_MINUTES * 60;
}

/** Can this planned session be covered by other training? Easy rides only, not the long ride. */
export function replaceable(s: PlannedSession, sessions: PlannedSession[]): boolean {
  if (!s.ride || s.ride.workout.intensity === "hard") return false;
  const longest = Math.max(...sessions.filter((x) => x.ride).map((x) => x.minutes));
  return s.minutes < longest;
}

const LABEL: Record<string, string> = { Run: "Run", TrailRun: "Trail run", VirtualRun: "Treadmill run", Walk: "Walk", Hike: "Hike", Swim: "Swim", Rowing: "Row" };

export function label(sportType: string): string {
  return LABEL[sportType] ?? sportType.replace(/([a-z])([A-Z])/g, "$1 $2");
}
