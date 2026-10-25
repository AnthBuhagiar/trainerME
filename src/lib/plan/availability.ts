import { readJson, writeJson } from "@/lib/data/store";
import type { TimeBudget, TimeSlot } from "@/lib/plan/timeBudget";
import { placeSlots } from "@/lib/plan/week";

/**
 * The rider's own choice of training days (P12: life first). When set, it
 * replaces the week Hour Power reads from their Strava history. One session a
 * day: off, a ride (indoor or outdoor) or strength, with a start time and how
 * long they have. Weekdays are numbered Monday = 0 ... Sunday = 6.
 */

export type DayKind = "off" | "ride" | "strength";

export interface DayChoice {
  weekday: number;
  kind: DayKind;
  /** "HH:MM" */
  start: string;
  minutes: number;
  indoor: boolean;
}

const FILE = "availability.json";

export function loadAvailability(): DayChoice[] | null {
  const days = readJson<DayChoice[] | null>(FILE, null);
  return days && days.length === 7 ? days : null;
}

export function saveAvailability(days: DayChoice[] | null): void {
  writeJson(FILE, days);
}

/** Pre-fill the editor from the learned week: flexible sessions are placed on days the way the planner would. */
export function choicesFromBudget(budget: TimeBudget): DayChoice[] {
  const days: DayChoice[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, kind: "off", start: "18:00", minutes: 60, indoor: true }));
  for (const { slot, weekday } of placeSlots(budget.slots)) {
    if (slot.kind !== "ride" && slot.kind !== "strength") continue;
    if (days[weekday].kind !== "off") continue;
    days[weekday] = { weekday, kind: slot.kind, start: slot.start, minutes: slot.minutes, indoor: slot.indoorShare >= 0.5 };
  }
  return days;
}

export function budgetFromChoices(days: DayChoice[]): TimeBudget {
  const slots: TimeSlot[] = days
    .filter((d) => d.kind !== "off" && d.minutes > 0)
    .map((d) => ({
      weekday: d.weekday,
      perWeek: 1,
      kind: d.kind as TimeSlot["kind"],
      start: d.start,
      minutes: d.minutes,
      frequency: 1,
      indoorShare: d.kind === "ride" ? (d.indoor ? 1 : 0) : 1,
      reason: undefined,
    }));
  return { slots, totalMinutes: slots.reduce((n, s) => n + s.minutes, 0), weeksAnalysed: 0 };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validate what the form sent; returns an error message or the cleaned days. */
export function parseChoices(input: unknown): DayChoice[] | string {
  if (!Array.isArray(input) || input.length !== 7) return "Send all seven days.";
  const out: DayChoice[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const d = input.find((x) => x?.weekday === weekday);
    if (!d) return "Send all seven days.";
    const kind: DayKind = d.kind === "ride" || d.kind === "strength" ? d.kind : "off";
    const minutes = Math.round(Number(d.minutes));
    if (kind !== "off" && (!Number.isFinite(minutes) || minutes < 15 || minutes > 480)) return "Each session needs 15 minutes to 8 hours.";
    const start = TIME.test(String(d.start)) ? String(d.start) : "18:00";
    out.push({ weekday, kind, start, minutes: kind === "off" ? 0 : minutes, indoor: !!d.indoor });
  }
  return out;
}
