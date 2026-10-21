import type { Activity } from "@/lib/types";
import { daysBetween } from "@/lib/engine/dates";

/**
 * "Your usual week": infer the rider's training time budget from their own
 * history instead of asking them to fill in a form. For each weekday and kind
 * of session, how often it happens, when it starts and how long it lasts.
 * Recent weeks count more, so the slots follow changes in routine.
 */

export type SlotKind = "ride" | "strength" | "run" | "other";

export interface TimeSlot {
  /** 0 = Monday ... 6 = Sunday; -1 = a regular session without a fixed day. */
  weekday: number;
  /** Sessions per week this slot represents (1 for fixed-day slots). */
  perWeek: number;
  kind: SlotKind;
  /** Typical local start time, "HH:MM", rounded to 15 min. */
  start: string;
  /** Typical length in minutes, rounded to 5 min. */
  minutes: number;
  /** Share of recent weeks with this session (recency-weighted, 0-1). */
  frequency: number;
  /** For rides: share done indoors. */
  indoorShare: number;
  /** Set when the planner changed this slot from what the history shows. */
  changedFrom?: SlotKind;
  reason?: string;
}

export interface TimeBudget {
  slots: TimeSlot[];
  totalMinutes: number;
  weeksAnalysed: number;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MIN_FREQUENCY = 0.35;
const RECENT_WEEKS = 6;

export function kindOf(sportType: string): SlotKind {
  if (sportType.includes("Ride")) return "ride";
  if (sportType === "WeightTraining" || sportType === "Workout" || sportType === "Crossfit") return "strength";
  if (sportType.includes("Run")) return "run";
  return "other";
}

function weekdayOf(iso: string): number {
  // Local date-times are stored without an offset; read them as UTC to keep the wall-clock day.
  return (new Date(`${iso.slice(0, 19)}Z`).getUTCDay() + 6) % 7;
}

function minutesOfDay(iso: string): number {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Circular-safe enough for training times: evening and morning sessions don't straddle midnight. */
function clock(mins: number): string {
  const q = Math.round(mins / 15) * 15;
  const h = Math.floor(q / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(q % 60).padStart(2, "0")}`;
}

/** Rounded to 5 min, or to the quarter hour for long rides (2 h 55 reads and plans as 3 h). */
function slotMinutes(duration: number): number {
  const step = duration >= 120 ? 15 : 5;
  return Math.max(15, Math.round(duration / step) * step);
}

export function inferTimeBudget(activities: Activity[], asOf: string, weeks = 12): TimeBudget {
  const recent = activities.filter((a) => {
    const age = daysBetween(a.startLocal, asOf);
    return age >= 0 && age < weeks * 7 && kindOf(a.sportType) !== "other";
  });

  // Weight per week index (0 = this week): recent weeks count double.
  const weekWeight = (w: number) => (w < RECENT_WEEKS ? 2 : 1);
  const totalWeight = Array.from({ length: weeks }, (_, w) => weekWeight(w)).reduce((a, b) => a + b, 0);

  const groups = new Map<string, Activity[]>();
  for (const a of recent) {
    const key = `${weekdayOf(a.startLocal)}|${kindOf(a.sportType)}`;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }

  const slots: TimeSlot[] = [];
  for (const [key, list] of groups) {
    const [weekday, kind] = key.split("|");
    const weeksSeen = new Set(list.map((a) => Math.floor(daysBetween(a.startLocal, asOf) / 7)));
    const frequency = [...weeksSeen].reduce((sum, w) => sum + weekWeight(w), 0) / totalWeight;
    if (frequency < MIN_FREQUENCY) continue;
    const duration = median(list.map((a) => (kind === "ride" ? a.movingTime : a.elapsedTime) / 60));
    slots.push({
      weekday: Number(weekday),
      perWeek: 1,
      kind: kind as SlotKind,
      start: clock(median(list.map((a) => minutesOfDay(a.startLocal)))),
      minutes: slotMinutes(duration),
      frequency: Math.round(frequency * 100) / 100,
      indoorShare: list.filter((a) => a.isTrainer || a.sportType === "VirtualRide" || a.elevationGain === 0).length / list.length,
    });
  }

  // Habits kept most weeks but on varying days (e.g. gym "whenever I can").
  for (const kind of ["ride", "strength", "run"] as SlotKind[]) {
    const ofKind = recent.filter((a) => kindOf(a.sportType) === kind);
    const fixedDays = new Set(slots.filter((x) => x.kind === kind).map((x) => x.weekday));
    const loose = ofKind.filter((a) => !fixedDays.has(weekdayOf(a.startLocal)));
    let weighted = 0;
    for (const a of loose) weighted += weekWeight(Math.floor(daysBetween(a.startLocal, asOf) / 7));
    const perWeek = weighted / totalWeight;
    if (perWeek < 0.5 || loose.length < 3) continue;
    const duration = median(loose.map((a) => (kind === "ride" ? a.movingTime : a.elapsedTime) / 60));
    slots.push({
      weekday: -1,
      perWeek: Math.max(1, Math.round(perWeek)),
      kind,
      start: clock(median(loose.map((a) => minutesOfDay(a.startLocal)))),
      minutes: slotMinutes(duration),
      frequency: Math.round(Math.min(1, perWeek) * 100) / 100,
      indoorShare: loose.filter((a) => a.isTrainer || a.sportType === "VirtualRide" || a.elevationGain === 0).length / loose.length,
    });
  }

  slots.sort((a, b) => (a.weekday < 0 ? 7 : a.weekday) - (b.weekday < 0 ? 7 : b.weekday) || a.start.localeCompare(b.start));
  return { slots, totalMinutes: slots.reduce((sum, x) => sum + x.minutes * x.perWeek, 0), weeksAnalysed: weeks };
}

export function describeSlot(s: TimeSlot): string {
  const what = s.kind === "ride" ? (s.indoorShare >= 0.5 ? "indoor ride" : "ride") : s.kind;
  const [h, m] = s.start.split(":").map(Number);
  const time = `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "am" : "pm"}`;
  const length = s.minutes >= 90 ? `${Math.floor(s.minutes / 60)} h ${s.minutes % 60 ? `${s.minutes % 60}` : ""}`.trim() : `${s.minutes} min`;
  if (s.weekday < 0) {
    const when = s.start < "12:00" ? "mornings" : s.start < "17:00" ? "afternoons" : "evenings";
    return `${s.perWeek}× a week · ${what} · ${when} · ${length} · any day`;
  }
  return `${WEEKDAYS[s.weekday]} ${time} · ${what} · ${length}`;
}

/** Default for every rider: two strength sessions a week (docs/training-science.md, E5). */
export const DEFAULT_STRENGTH_PER_WEEK = 2;
const DEFAULT_STRENGTH_MINUTES = 45;

/**
 * Make room for the strength target by converting indoor rides, least regular
 * first: flexible-day rides before fixed-day ones. Outdoor and long rides are
 * never converted. Each converted slot keeps its time and takes the rider's
 * usual strength-session length.
 */
export function applyStrengthTarget(budget: TimeBudget, target = DEFAULT_STRENGTH_PER_WEEK): TimeBudget {
  const slots = budget.slots.map((s) => ({ ...s }));
  const strength = slots.filter((s) => s.kind === "strength");
  let have = strength.reduce((n, s) => n + s.perWeek, 0);
  if (have >= target) return budget;
  const strengthMinutes = strength.length ? Math.round(median(strength.map((s) => s.minutes)) / 5) * 5 : DEFAULT_STRENGTH_MINUTES;
  const candidates = slots
    .filter((s) => s.kind === "ride" && s.indoorShare >= 0.5 && s.minutes <= 90)
    .sort((a, b) => Number(b.weekday < 0) - Number(a.weekday < 0) || a.frequency - b.frequency);
  for (const slot of candidates) {
    if (have >= target) break;
    const convert = Math.min(slot.perWeek, target - have);
    if (convert < slot.perWeek) {
      // Split a multi-session flexible slot: keep the rest as rides.
      slots.push({ ...slot, perWeek: slot.perWeek - convert });
      slot.perWeek = convert;
    }
    Object.assign(slot, {
      changedFrom: "ride" as SlotKind,
      kind: "strength" as SlotKind,
      minutes: strengthMinutes,
      reason: `Swapped from an indoor ride to reach ${target} strength sessions a week`,
    });
    have += convert;
  }
  slots.sort((a, b) => (a.weekday < 0 ? 7 : a.weekday) - (b.weekday < 0 ? 7 : b.weekday) || a.start.localeCompare(b.start));
  return { ...budget, slots, totalMinutes: slots.reduce((sum, x) => sum + x.minutes * x.perWeek, 0) };
}
