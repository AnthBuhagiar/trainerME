import type { History } from "@/lib/engine/history";
import type { Goal } from "@/lib/goals/model";

/**
 * Where the Hour Ring starts and where its goal sits, shared by Today and the
 * Goal page so both draw the same ring. With a goal: from just below the hour
 * power when it was set, to its target. Without one: from the six-month low to
 * an example goal 20% above today.
 */
export function ringScale(goal: Goal | null, target: number | undefined, history: History | null, hourPower: number, now = Date.now()) {
  const recent = history?.points.filter((p) => Date.parse(p.date) > now - 182 * 86_400_000) ?? [];
  const sixMonthLow = recent.length ? Math.floor(Math.min(...recent.map((p) => p.hourPower)) / 5) * 5 : 0;
  const start = goal?.startHourPower ? Math.floor(goal.startHourPower / 5) * 5 - 10 : sixMonthLow;
  return { start: Math.min(start, Math.floor(hourPower / 5) * 5 - 10), goal: target ?? Math.ceil((hourPower * 1.2) / 5) * 5, example: target === undefined };
}
