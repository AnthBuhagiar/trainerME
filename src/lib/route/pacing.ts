import { speedFor, sustainableFraction, type RiderPhysics } from "@/lib/goals/eventTime";
import type { Climb, Route, Segment } from "@/lib/route/gpx";

/**
 * Pace a real route: a little harder on climbs, easier on descents, so the
 * average power matches what the rider can sustain for the duration. Riding
 * climbs slightly harder and freewheeling more downhill is faster for the same
 * average power than riding evenly.
 */

export function powerFactor(grade: number): number {
  if (grade >= 0.06) return 1.12;
  if (grade >= 0.03) return 1.08;
  if (grade >= 0.01) return 1.03;
  if (grade > -0.02) return 1;
  if (grade > -0.04) return 0.6;
  return 0.25;
}

function ride(segments: Segment[], base: number, physics: RiderPhysics): { seconds: number; avgPower: number } {
  let seconds = 0;
  let work = 0;
  for (const s of segments) {
    const p = base * powerFactor(s.grade);
    const t = s.length / speedFor(p, s.grade, physics);
    seconds += t;
    work += p * t;
  }
  return { seconds, avgPower: seconds ? work / seconds : 0 };
}

/** Base (flat-road) power that gives this time-weighted average power. */
function baseFor(segments: Segment[], avgPower: number, physics: RiderPhysics): number {
  let lo = 20;
  let hi = 800;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (ride(segments, mid, physics).avgPower < avgPower) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export interface ClimbPlan extends Climb {
  watts: number;
  minutes: number;
}

export interface RoutePlan {
  seconds: number;
  avgPower: number;
  /** Power on flat roads; climbs and descents are set relative to it. */
  basePower: number;
  climbs: ClimbPlan[];
}

function plan(route: Route, avgPower: number, physics: RiderPhysics): RoutePlan {
  const base = baseFor(route.segments, avgPower, physics);
  const { seconds } = ride(route.segments, base, physics);
  const climbs = route.climbs.map((c) => {
    const from = c.startKm * 1000;
    const to = from + c.lengthKm * 1000;
    const segs = route.segments.filter((s) => s.start >= from - 1 && s.start < to);
    return {
      ...c,
      watts: Math.round((base * powerFactor(c.avgGrade / 100)) / 5) * 5,
      minutes: Math.round(ride(segs, base, physics).seconds / 60),
    };
  });
  return { seconds, avgPower: Math.round(avgPower), basePower: Math.round(base), climbs };
}

/** Finish time and pacing at today's hour power (sustainable share depends on duration). */
export function predictRoute(route: Route, hourPower: number, physics: RiderPhysics, durability = 0.97): RoutePlan {
  let hours = 5;
  let result = plan(route, hourPower * sustainableFraction(hours, durability), physics);
  for (let i = 0; i < 6; i++) {
    hours = result.seconds / 3600;
    result = plan(route, hourPower * sustainableFraction(hours, durability), physics);
  }
  return result;
}

/** Pacing that finishes in the target time. */
export function planForTarget(route: Route, targetSeconds: number, physics: RiderPhysics): RoutePlan {
  let lo = 40;
  let hi = 500;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (plan(route, mid, physics).seconds > targetSeconds) lo = mid;
    else hi = mid;
  }
  return plan(route, hi, physics);
}
