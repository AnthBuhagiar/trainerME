import { sessionTitle } from "@/components/SessionCard";
import { loadState } from "@/lib/plan/current";
import { lengthLimits, resolveSession } from "@/lib/plan/session";
import type { PlannedSession } from "@/lib/plan/week";
import { weekStatus } from "@/lib/plan/weekStrip";
import { watchToday, type WatchToday } from "@/lib/watch/today";

/** Today for the watch, from the rider's own data. `minutes` re-fits today's lead ride ("Only 35 min?"). */
export function watchTodayFromState(minutes?: number): WatchToday {
  const state = loadState();
  const { today, thisWeekStart, activities, current, targets, checkIns, summary } = state;
  const week = state.week(thisWeekStart);
  const { covered } = weekStatus(week, activities, today, sessionTitle);
  let todays: { session: PlannedSession; done: boolean }[] = week.sessions
    .filter((s) => s.date === today)
    .map((s) => ({ session: s, done: covered.has(s) }));

  if (minutes && todays.length) {
    const lead = todays.find((t) => !t.done && t.session.ride) ?? todays.find((t) => t.session.ride);
    const limits = lead && lengthLimits(lead.session);
    if (lead && limits) {
      const m = Math.max(limits.min, Math.min(limits.max, Math.round(minutes / 5) * 5));
      const found = resolveSession(today, lead.session.start, String(m));
      if (found) todays = todays.map((t) => (t === lead ? { session: found.session, done: t.done } : t));
    }
  }

  return watchToday({
    today,
    weekStart: thisWeekStart,
    current: current ? { hourPower: current.hourPower, low: current.low, high: current.high } : null,
    trainingHourPower: targets?.training ?? null,
    todays,
    weekSessions: week.sessions,
    activities,
    mood: checkIns[today] ?? null,
    limits: lengthLimits,
    goal: summary
      ? {
          name: summary.goal.name,
          date: summary.goal.date,
          daysToGo: summary.daysToGo,
          distanceKm: summary.goal.event?.distanceKm,
          climbingM: summary.goal.event?.climbingM,
          predictedSeconds: summary.predicted?.seconds,
          targetMinutes: summary.goal.event?.targetMinutes,
        }
      : null,
  });
}
