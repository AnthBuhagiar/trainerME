import { addDays, weekdayOf } from "@/lib/plan/calendar";
import { kindOf } from "@/lib/plan/timeBudget";
import type { PlannedSession, WeekPlan } from "@/lib/plan/week";
import type { Activity } from "@/lib/types";
import { dayLabel } from "@/lib/ui/format";

/**
 * P20 · Strength days apart (docs/training-protocol.md). Two strength sessions
 * a week work best with time to recover between them (E5), so:
 *  - Strength done earlier than planned this week covers the next planned one:
 *    it isn't proposed twice.
 *  - No strength session is proposed the day after strength was logged (or
 *    next to another planned one). It moves to a later free day that isn't
 *    next to a strength day, preferring one that isn't the day before a key or
 *    long ride; with no such day left this week, it's dropped.
 * Riders can still do back-to-back strength if that's what their week needs;
 * the plan just never suggests it.
 */

const day = (iso: string) => iso.slice(0, 10);
const isStrength = (s: PlannedSession) => s.kind === "strength";
/** "today", "tomorrow" or "Thu 29 Oct", for the middle of a sentence. */
const when = (d: string, today: string) => dayLabel(d, today).replace(/^(Today|Tomorrow|Yesterday)$/, (w) => w.toLowerCase());

export function spaceStrength(week: WeekPlan, activities: Activity[], today: string): WeekPlan {
  const end = addDays(week.weekStart, 6);
  if (today < week.weekStart || today > end) return week;
  const logged = activities
    .filter((a) => kindOf(a.sportType) === "strength" && day(a.startLocal) >= week.weekStart && day(a.startLocal) < today)
    .map((a) => day(a.startLocal));
  let sessions = [...week.sessions];
  const notes: string[] = [];

  // Done early: logged strength beyond what was planned before today covers the next planned sessions.
  let surplus = logged.length - sessions.filter((s) => isStrength(s) && s.date < today).length;
  sessions = sessions.filter((s) => {
    if (surplus <= 0 || !isStrength(s) || s.date < today) return true;
    surplus--;
    notes.push(`${dayLabel(s.date, today)}'s strength is off: already done this week.`);
    return false;
  });

  const longest = Math.max(0, ...sessions.filter((s) => s.ride).map((s) => s.minutes));
  const beforeQuality = (d: string) => sessions.some((s) => s.date === addDays(d, 1) && s.ride && (s.ride.workout.intensity === "hard" || s.minutes === longest));
  for (const s of sessions.filter((x) => isStrength(x) && x.date >= today)) {
    const others = [...logged, ...sessions.filter((x) => isStrength(x) && x !== s).map((x) => x.date)];
    const nextTo = (d: string) => others.some((o) => o === addDays(d, -1) || o === addDays(d, 1));
    if (!nextTo(s.date)) continue;
    const free: string[] = [];
    for (let d = today; d <= end; d = addDays(d, 1)) {
      if (d !== s.date && !nextTo(d) && !sessions.some((x) => x.date === d)) free.push(d);
    }
    const to = free.find((d) => !beforeQuality(d)) ?? free[0];
    // Logged strength is always before today, so a clash with it means the session was today's.
    const afterLogged = logged.includes(addDays(s.date, -1));
    if (to) {
      const moved = { ...s, date: to, weekday: weekdayOf(to), movedFrom: s.date, adjusted: afterLogged ? "Moved from today: you did strength yesterday." : `Moved from ${when(s.date, today)}: too close to your other strength day.` };
      sessions = sessions.map((x) => (x === s ? moved : x));
    } else {
      sessions = sessions.filter((x) => x !== s);
      notes.push(afterLogged ? "No strength today: you did it yesterday, and no other day this week is free." : `${dayLabel(s.date, today)}'s strength is off: too close to your other strength day.`);
    }
  }
  if (sessions.length === week.sessions.length && sessions.every((s, i) => s === week.sessions[i])) return week;
  sessions.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
  return { ...week, sessions, adaptation: [week.adaptation, ...notes].filter(Boolean).join(" ") || undefined };
}
