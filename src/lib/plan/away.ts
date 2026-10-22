import { readJson, writeJson } from "@/lib/data/store";
import { applyCheckIn } from "@/lib/plan/checkin";
import type { PlannedSession, WeekPlan } from "@/lib/plan/week";

/**
 * Away and busy days, entered whenever the rider knows about them, weeks or
 * months ahead. Nothing is stored in the plan itself: every screen rebuilds
 * the plan from these dates, so adding or changing one reshapes everything.
 *  - A week that is mostly away becomes a holiday (flex) week in the block,
 *    and recovery weeks and the monthly long ride re-align around it.
 *  - Single away days drop that day's sessions; the long ride moves to the
 *    other weekend day if that one is free.
 *  - Busy days keep the sessions but shorten them.
 */

export type AwayKind = "away" | "busy";

export interface AwayPeriod {
  id: string;
  /** YYYY-MM-DD, inclusive. */
  start: string;
  end: string;
  kind: AwayKind;
  note?: string;
}

const FILE = "away.json";
const DAY = 86_400_000;
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export function loadAway(): AwayPeriod[] {
  return readJson<AwayPeriod[]>(FILE, []).sort((a, b) => a.start.localeCompare(b.start));
}

export function saveAway(periods: AwayPeriod[]): void {
  writeJson(FILE, periods);
}

export function kindOn(periods: AwayPeriod[], date: string): AwayKind | null {
  const hit = periods.filter((p) => p.start <= date && date <= p.end);
  if (hit.some((p) => p.kind === "away")) return "away";
  return hit.length ? "busy" : null;
}

/** Weeks (Monday to Sunday) with at least five away days, as holiday windows for periodisation. */
export function awayWeeks(periods: AwayPeriod[], from: string, to: string): [string, string][] {
  const out: [string, string][] = [];
  const away = periods.filter((p) => p.kind === "away");
  if (!away.length) return out;
  const start = new Date(`${from}T00:00:00Z`);
  let monday = addDays(from, -((start.getUTCDay() + 6) % 7));
  for (; monday <= to; monday = addDays(monday, 7)) {
    let days = 0;
    for (let i = 0; i < 7; i++) if (kindOn(away, addDays(monday, i)) === "away") days++;
    if (days >= 5) out.push([monday, addDays(monday, 6)]);
  }
  return out;
}

export function applyAway(week: WeekPlan, periods: AwayPeriod[]): WeekPlan {
  if (!periods.length) return week;
  const rides = week.sessions.filter((s) => s.ride);
  const long = rides.length ? rides.reduce((a, b) => (b.minutes > a.minutes ? b : a)) : null;
  const sessions: PlannedSession[] = [];
  let movedLong: PlannedSession | null = null;
  for (const s of week.sessions) {
    const kind = kindOn(periods, s.date);
    if (kind === "busy") sessions.push({ ...applyCheckIn(s, "short", week.phase), adjusted: "Busy day: shortened to fit." });
    else if (kind === "away") {
      if (s === long && s.minutes >= 120) movedLong = s;
    } else sessions.push(s);
  }
  if (movedLong) {
    // Try the other weekend day, if it's free of sessions and not away.
    const other = movedLong.weekday === 5 ? 6 : movedLong.weekday === 6 ? 5 : -1;
    const date = other >= 0 ? addDays(week.monday, other) : null;
    if (date && !kindOn(periods, date) && !sessions.some((s) => s.date === date)) {
      sessions.push({ ...movedLong, date, weekday: other, adjusted: `Moved from ${movedLong.weekday === 5 ? "Saturday" : "Sunday"}: you're away that day.` });
      sessions.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    }
  }
  return { ...week, sessions };
}
