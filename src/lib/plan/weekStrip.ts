import { addDays } from "@/lib/plan/calendar";
import { isIndoor } from "@/lib/data/store";
import { kindOf } from "@/lib/plan/timeBudget";
import type { PlannedSession, WeekPlan } from "@/lib/plan/week";
import type { Activity } from "@/lib/types";

/**
 * The week at a glance on Today: one column per day, Sunday to Saturday, with
 * an icon for each thing done (from Strava) or planned. Planned sessions
 * already covered by an activity of the same kind that day aren't shown twice.
 */

export type StripIcon = "indoor" | "bike" | "strength" | "run" | "swim" | "row" | "walk" | "other";

export interface StripItem {
  icon: StripIcon;
  state: "done" | "planned" | "missed";
  title: string;
  minutes: number;
  /** Planned key sessions are marked. */
  key?: boolean;
  /** Planned sessions open their page. */
  href?: string;
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
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(plan.weekStart, i);
    const done = activities.filter((a) => day(a.startLocal) === date).sort((a, b) => a.startLocal.localeCompare(b.startLocal));
    const used = new Set<Activity>();
    const items: StripItem[] = done.map((a) => ({ icon: activityIcon(a), state: "done", title: a.name, minutes: Math.round(a.movingTime / 60) }));
    for (const s of plan.sessions.filter((x) => x.date === date)) {
      const match = done.find((a) => !used.has(a) && sameKind(s, a));
      if (match) {
        used.add(match);
        continue;
      }
      if (date < today) {
        items.push({ icon: sessionIcon(s), state: "missed", title: title(s), minutes: s.minutes });
        continue;
      }
      items.push({
        icon: sessionIcon(s),
        state: "planned",
        title: title(s),
        minutes: s.minutes,
        key: s.ride?.workout.intensity === "hard",
        href: `/session/${s.date}?start=${s.start}`,
      });
    }
    return { date, today: date === today, items };
  });
}
