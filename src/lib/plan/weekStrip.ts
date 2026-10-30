import { addDays } from "@/lib/plan/calendar";
import { isIndoor } from "@/lib/data/store";
import { kindOf } from "@/lib/plan/timeBudget";
import type { PlannedSession, WeekPlan } from "@/lib/plan/week";
import type { Activity } from "@/lib/types";

/**
 * The week at a glance on Today: one column per day, Sunday to Saturday, with
 * an icon for each thing done (from Strava) or planned. Planned sessions
 * already covered by an activity of the same kind that day aren't shown twice,
 * nor is one ridden on another day with Hour Power (the ride carries the
 * workout's name to Strava).
 */

export type StripIcon = "indoor" | "bike" | "strength" | "run" | "swim" | "row" | "walk" | "other";

export interface StripItem {
  icon: StripIcon;
  state: "done" | "planned" | "missed";
  title: string;
  minutes: number;
  /** Planned key sessions are marked. */
  key?: boolean;
  /** Done activities open their details; planned sessions and missed trainer rides open their page. */
  href?: string;
  session?: PlannedSession;
}

export interface StripDay {
  date: string;
  today: boolean;
  items: StripItem[];
}

const day = (iso: string) => iso.slice(0, 10);

export function activityIcon(a: Activity): StripIcon {
  const kind = kindOf(a.sportType);
  if (kind === "ride") return isIndoor(a) ? "indoor" : "bike";
  if (kind === "strength") return "strength";
  if (kind === "run") return "run";
  if (a.sportType === "Swim") return "swim";
  if (a.sportType === "Rowing" || a.sportType === "VirtualRow") return "row";
  if (a.sportType === "Walk" || a.sportType === "Hike") return "walk";
  return "other";
}

export function sessionIcon(s: PlannedSession): StripIcon {
  if (s.kind === "ride") return s.indoor ? "indoor" : "bike";
  if (s.kind === "strength") return "strength";
  if (s.kind === "run") return "run";
  return "other";
}

const sameKind = (s: PlannedSession, a: Activity) => kindOf(a.sportType) === s.kind;

export function weekStrip(plan: WeekPlan, activities: Activity[], today: string, title: (s: PlannedSession) => string): StripDay[] {
  return weekStatus(plan, activities, today, title).days;
}

/** The strip's days, plus which planned sessions are already done (on their day or another). */
export function weekStatus(plan: WeekPlan, activities: Activity[], today: string, title: (s: PlannedSession) => string) {
  const covered = new Set<PlannedSession>();
  const weekEnd = addDays(plan.weekStart, 6);
  const inWeek = activities.filter((a) => day(a.startLocal) >= plan.weekStart && day(a.startLocal) <= weekEnd);
  // Done early or late: a ride this week named like the session, not on its own day.
  const elsewhere = new Set<Activity>();
  const doneElsewhere = (s: PlannedSession) => {
    const name = title(s);
    const a = name && inWeek.find((x) => !elsewhere.has(x) && day(x.startLocal) !== s.date && sameKind(s, x) && x.name === name);
    if (a) elsewhere.add(a);
    return !!a;
  };
  const days = Array.from({ length: 7 }, (_, i): StripDay => {
    const date = addDays(plan.weekStart, i);
    const done = activities.filter((a) => day(a.startLocal) === date).sort((a, b) => a.startLocal.localeCompare(b.startLocal));
    const used = new Set<Activity>();
    const items: StripItem[] = done.map((a) => ({ icon: activityIcon(a), state: "done", title: a.name, minutes: Math.round(a.movingTime / 60), href: `/activity/${a.id}` }));
    for (const s of plan.sessions.filter((x) => x.date === date)) {
      const match = done.find((a) => !used.has(a) && sameKind(s, a));
      if (s.completedIn) {
        // Done in another app: its synced ride (if any) already shows; otherwise show the session as done.
        covered.add(s);
        if (match) used.add(match);
        else items.push({ icon: sessionIcon(s), state: "done", title: `${title(s)} · done in ${s.completedIn}`, minutes: s.minutes, href: `/session/${s.date}?start=${s.start}`, session: s });
        continue;
      }
      if (match) {
        used.add(match);
        covered.add(s);
        continue;
      }
      if (doneElsewhere(s)) {
        covered.add(s);
        continue;
      }
      if (date < today) {
        // Missed trainer rides can still be ridden now, so they open; others are just shown.
        const rideable = s.kind === "ride" && s.indoor;
        items.push({ icon: sessionIcon(s), state: "missed", title: title(s), minutes: s.minutes, href: rideable ? `/session/${s.date}?start=${s.start}` : undefined, session: s });
        continue;
      }
      items.push({
        icon: sessionIcon(s),
        state: "planned",
        title: title(s),
        minutes: s.minutes,
        key: s.ride?.workout.intensity === "hard",
        href: `/session/${s.date}?start=${s.start}`,
        session: s,
      });
    }
    return { date, today: date === today, items };
  });
  return { days, covered };
}

/** Sessions earlier this week that nothing on Strava covers (the Week tab lists the trainer rides, which can still be ridden). */
export function missedSessions(plan: WeekPlan, activities: Activity[], today: string, title: (s: PlannedSession) => string): PlannedSession[] {
  return weekStrip(plan, activities, today, title)
    .flatMap((d) => d.items)
    .filter((i) => i.state === "missed" && i.session)
    .map((i) => i.session!);
}
