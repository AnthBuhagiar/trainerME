/**
 * Lay a training block out backwards from the goal date:
 * taper (E4) <- event-specific <- build <- base, with a recovery week every
 * 4th week (E8) and an optional holiday window that becomes a "flex" block.
 */

export type PhaseName = "base" | "build" | "specific" | "taper" | "flex";

export interface Phase {
  name: PhaseName;
  label: string;
  /** Monday of the first week, YYYY-MM-DD. */
  start: string;
  /** Sunday of the last week, YYYY-MM-DD. */
  end: string;
  weeks: number;
  focus: string;
  /** ISO Mondays of recovery weeks inside this phase. */
  recoveryWeeks: string[];
}

const DAY = 86_400_000;
const LABELS: Record<PhaseName, string> = {
  base: "Base and threshold",
  build: "Build",
  specific: "Event-specific",
  taper: "Taper",
  flex: "Holiday flex",
};
const FOCUS: Record<PhaseName, string> = {
  base: "Sweet spot and threshold on weeknights, long steady Saturday, heavy strength twice a week.",
  build: "Threshold progressions plus one VO2 session; long rides with efforts late in the ride; fuel 60→75 g/h.",
  specific: "Climbing efforts at event pace, rehearsal rides at full length, fuel 80–90 g/h; strength to maintenance.",
  taper: "Volume down 40–60%, short efforts kept at target power, no heavy leg sessions in the last 10 days.",
  flex: "Ride when life allows. Nothing to catch up.",
};

function d(iso: string): number {
  return Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
}
function iso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
/** Monday on or before the date. */
export function mondayOf(isoDate: string): string {
  const ms = d(isoDate);
  const dow = (new Date(ms).getUTCDay() + 6) % 7;
  return iso(ms - dow * DAY);
}

export interface PeriodiseOptions {
  /** Holiday windows [start, end] (YYYY-MM-DD) that become flex weeks. */
  holidays?: [string, string][];
}

export function periodise(today: string, goalDate: string, opts: PeriodiseOptions = {}): Phase[] {
  const firstMonday = iso(d(mondayOf(today)) + (((new Date(d(today)).getUTCDay() + 6) % 7 === 0) ? 0 : 7 * DAY));
  const eventMonday = mondayOf(goalDate);
  const totalWeeks = Math.max(1, Math.round((d(eventMonday) - d(firstMonday)) / (7 * DAY)) + 1);

  // Week index -> phase, filled backwards from the event week.
  const names: PhaseName[] = new Array(totalWeeks);
  const taper = Math.min(2, totalWeeks);
  const specific = Math.min(6, Math.max(0, totalWeeks - taper));
  const remaining = totalWeeks - taper - specific;
  const build = Math.min(remaining, Math.max(0, Math.round(remaining * 0.45)));
  for (let w = 0; w < totalWeeks; w++) {
    const fromEnd = totalWeeks - 1 - w;
    names[w] = fromEnd < taper ? "taper" : fromEnd < taper + specific ? "specific" : fromEnd < taper + specific + build ? "build" : "base";
  }
  const weekStart = (w: number) => iso(d(firstMonday) + w * 7 * DAY);
  for (const [hs, he] of opts.holidays ?? []) {
    for (let w = 0; w < totalWeeks; w++) {
      const ws = weekStart(w);
      const we = iso(d(ws) + 6 * DAY);
      if (we >= hs && ws <= he && names[w] !== "taper") names[w] = "flex";
    }
  }

  const phases: Phase[] = [];
  let sinceRecovery = 0;
  for (let w = 0; w < totalWeeks; w++) {
    const name = names[w];
    const last = phases.at(-1);
    if (!last || last.name !== name) {
      phases.push({ name, label: LABELS[name], start: weekStart(w), end: iso(d(weekStart(w)) + 6 * DAY), weeks: 0, focus: FOCUS[name], recoveryWeeks: [] });
    }
    const phase = phases.at(-1)!;
    phase.weeks++;
    phase.end = iso(d(weekStart(w)) + 6 * DAY);
    if (name === "flex" || name === "taper") {
      sinceRecovery = 0;
      continue;
    }
    sinceRecovery++;
    // Every 4th loading week is lighter; skip it right before the taper.
    if (sinceRecovery === 4 && totalWeeks - 1 - w > taper) {
      phase.recoveryWeeks.push(weekStart(w));
      sinceRecovery = 0;
    }
  }
  return phases;
}

export function phaseOn(phases: Phase[], date: string): Phase | null {
  const day = date.slice(0, 10);
  return phases.find((p) => p.start <= day && day <= p.end) ?? null;
}

/** Australian/NZ school and family default: the two weeks around Christmas. */
export function christmasWindow(year: number): [string, string] {
  return [`${year}-12-21`, `${year + 1}-01-03`];
}
