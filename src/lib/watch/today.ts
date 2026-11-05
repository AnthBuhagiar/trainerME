import { sessionTitle } from "@/components/SessionCard";
import { formatDuration } from "@/lib/goals/eventTime";
import { toGarminWorkout, type GarminRepeat, type GarminStep } from "@/lib/garmin/workout";
import { addDays } from "@/lib/plan/calendar";
import type { Mood } from "@/lib/plan/checkin";
import type { PlannedSession } from "@/lib/plan/week";
import type { Activity } from "@/lib/types";
import { plain } from "@/lib/ui/format";

/**
 * Everything the Hour Power watch app shows, in one small JSON reply: the
 * glance (hour power, the week so far, today's session, the goal), the steps
 * to ride with watt targets, and the day's check-in. Labels are worked out
 * here so the watch only draws them.
 */

export const WATCH_VERSION = 1;

/** One step to ride: n name, s seconds, lo/hi watts, k kind (w warm-up, i interval, r recovery, a steady, c cool-down). */
export interface WatchStep {
  n: string;
  s: number;
  lo: number;
  hi: number;
  k: "w" | "i" | "r" | "a" | "c";
}

export interface WatchSession {
  title: string;
  /** "3 x 12 min", the main set at a glance (rides with intervals). */
  detail: string | null;
  kind: PlannedSession["kind"];
  indoor: boolean;
  start: string;
  /** "7:30 PM" */
  startLabel: string;
  minutes: number;
  /** The shortest and longest this ride can be made ("Only 35 min?"). */
  minMinutes: number | null;
  maxMinutes: number | null;
  /** The main efforts' watt range. */
  target: { lo: number; hi: number } | null;
  /** Set when the check-in changed it. */
  adjusted: string | null;
  done: boolean;
  steps: WatchStep[];
}

export interface WatchToday {
  v: number;
  date: string;
  /** "THU 5 NOV" */
  dateLabel: string;
  hourPower: { w: number; low: number; high: number } | null;
  /** Targets are set from this. */
  trainingHourPower: number | null;
  week: { doneMin: number; plannedMin: number };
  checkin: Mood | null;
  session: WatchSession | null;
  /** More planned today after this one. */
  more: number;
  goal: {
    name: string;
    date: string;
    days: number;
    km: number | null;
    climbM: number | null;
    /** Finish time at today's hour power, "5 h 42". */
    finish: string | null;
    target: string | null;
  } | null;
}

/** Watch system fonts can lack typographic characters: plain ASCII for anything drawn. */
export function ascii(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[×✕]/g, "x")
    .replace(/[–—−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[·•]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7e]/g, "");
}

const KIND: Record<GarminStep["intensity"], WatchStep["k"]> = { WARMUP: "w", INTERVAL: "i", RECOVERY: "r", ACTIVE: "a", COOLDOWN: "c" };

/** The ride as plain steps, repeats written out, from the same builder as Garmin send. */
export function watchSteps(s: PlannedSession, hourPower: number): WatchStep[] {
  if (!s.ride || hourPower <= 0) return [];
  const out: WatchStep[] = [];
  const add = (st: GarminStep) => out.push({ n: ascii(st.description), s: st.durationValue, lo: st.targetValueLow, hi: st.targetValueHigh, k: KIND[st.intensity] });
  for (const st of toGarminWorkout(s, hourPower).segments[0].steps as (GarminStep | GarminRepeat)[]) {
    if (st.type === "WorkoutRepeatStep") for (let i = 0; i < st.repeatValue; i++) st.steps.forEach(add);
    else add(st);
  }
  // The Garmin builder rests after every rep, the last too; the plan doesn't count a rest with no effort after it.
  return out.filter((st, i) => st.s > 0 && !(st.k === "r" && out[i + 1]?.k !== "i"));
}

const mins = (seconds: number) => {
  const m = seconds / 60;
  return Number.isInteger(m) ? `${m} min` : `${Math.floor(m)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
};

function detailOf(steps: WatchStep[]): string | null {
  const work = steps.filter((s) => s.k === "i");
  if (!work.length) return null;
  const same = work.every((s) => s.s === work[0].s);
  return same ? `${work.length} x ${mins(work[0].s)}` : `${work.length} efforts`;
}

function targetOf(steps: WatchStep[]): WatchSession["target"] {
  const main = steps.find((s) => s.k === "i") ?? steps.find((s) => s.k === "a");
  return main ? { lo: main.lo, hi: main.hi } : null;
}

export function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function dateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const wd = new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" }).format(d);
  const mo = new Intl.DateTimeFormat("en-AU", { month: "short", timeZone: "UTC" }).format(d);
  return `${wd} ${d.getUTCDate()} ${mo}`.toUpperCase();
}

export interface WatchInput {
  today: string;
  weekStart: string;
  current: { hourPower: number; low: number; high: number } | null;
  trainingHourPower: number | null;
  /** Today's sessions in order, with whether each is already done. */
  todays: { session: PlannedSession; done: boolean }[];
  /** This week's planned sessions (for the week ring). */
  weekSessions: PlannedSession[];
  activities: Activity[];
  mood: Mood | null;
  limits: (s: PlannedSession) => { min: number; max: number } | null;
  goal: {
    name: string;
    date: string;
    daysToGo: number;
    distanceKm?: number;
    climbingM?: number;
    predictedSeconds?: number;
    targetMinutes?: number;
  } | null;
}

export function watchToday(input: WatchInput): WatchToday {
  const { today, weekStart } = input;
  const end = addDays(weekStart, 6);
  const doneMin = Math.round(
    input.activities.filter((a) => a.startLocal.slice(0, 10) >= weekStart && a.startLocal.slice(0, 10) <= end).reduce((t, a) => t + a.movingTime, 0) / 60,
  );
  const plannedMin = input.weekSessions.reduce((t, s) => t + s.minutes, 0);

  // The next ride still to do today leads; otherwise whatever is next, done or not.
  const order = [...input.todays].sort((a, b) => Number(a.done) - Number(b.done) || Number(!a.session.ride) - Number(!b.session.ride));
  const lead = order[0];
  const hp = input.trainingHourPower ?? input.current?.hourPower ?? 0;
  let session: WatchSession | null = null;
  if (lead) {
    const s = lead.session;
    const steps = watchSteps(s, hp);
    const limits = input.limits(s);
    session = {
      title: ascii(sessionTitle(s)),
      detail: detailOf(steps),
      kind: s.kind,
      indoor: s.indoor,
      start: s.start,
      startLabel: timeLabel(s.start),
      minutes: s.minutes,
      minMinutes: limits?.min ?? null,
      maxMinutes: limits?.max ?? null,
      target: targetOf(steps),
      adjusted: s.adjusted ? ascii(plain(s.adjusted)) : null,
      done: lead.done,
      steps,
    };
  }

  const g = input.goal;
  return {
    v: WATCH_VERSION,
    date: today,
    dateLabel: dateLabel(today),
    hourPower: input.current ? { w: Math.round(input.current.hourPower), low: Math.round(input.current.low), high: Math.round(input.current.high) } : null,
    trainingHourPower: input.trainingHourPower,
    week: { doneMin, plannedMin },
    checkin: input.mood,
    session,
    more: Math.max(0, input.todays.length - 1),
    goal: g
      ? {
          name: ascii(g.name),
          date: g.date,
          days: g.daysToGo,
          km: g.distanceKm ?? null,
          climbM: g.climbingM ?? null,
          finish: g.predictedSeconds ? formatDuration(g.predictedSeconds) : null,
          target: g.targetMinutes ? formatDuration(g.targetMinutes * 60) : null,
        }
      : null,
  };
}
