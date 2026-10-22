import { readJson, writeJson } from "@/lib/data/store";
import type { Route } from "@/lib/route/gpx";

/**
 * Generic goal model: any rider, any goal type (docs/product-strategy.md, D).
 * Stored locally in data/goals.json.
 */

export type GoalType = "event" | "performance" | "climb" | "challenge" | "consistency" | "comeback" | "custom";
export type Priority = "A" | "B" | "C";

export interface EventDetails {
  distanceKm: number;
  climbingM: number;
  /** Target finish time in minutes, if the rider has one. */
  targetMinutes?: number;
  surface?: "road" | "gravel" | "mixed";
  riding?: "solo" | "bunch";
  /** Strava activity ID of a previous attempt or similar ride, as a baseline. */
  baselineActivityId?: string;
  /** Name of the imported route file, if any (stored in data/routes/<goal id>.json). */
  routeName?: string;
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  priority: Priority;
  /** Local date, YYYY-MM-DD. */
  date: string;
  /** For performance goals: target hour power (W). */
  targetWatts?: number;
  event?: EventDetails;
  /** Hour power when the goal was set; the Hour Ring starts here. */
  startHourPower?: number;
  createdAt: string;
}

const FILE = "goals.json";

export function loadGoals(): Goal[] {
  return readJson<Goal[]>(FILE, []).sort((a, b) => a.date.localeCompare(b.date));
}

export function saveGoals(goals: Goal[]): void {
  writeJson(FILE, goals);
}

/** The next A goal on or after today. */
export function activeGoal(today: string, goals = loadGoals()): Goal | null {
  return goals.find((g) => g.priority === "A" && g.date >= today.slice(0, 10)) ?? null;
}

export function upsertGoal(goal: Goal): Goal[] {
  const goals = loadGoals().filter((g) => g.id !== goal.id);
  // One A goal at a time: a new A goal on another date demotes older ones to B.
  if (goal.priority === "A") for (const g of goals) if (g.priority === "A") g.priority = "B";
  goals.push(goal);
  saveGoals(goals);
  return loadGoals();
}

const routeFile = (goalId: string) => `routes/${goalId.replace(/[^a-z0-9-]/gi, "")}.json`;

export function saveRoute(goalId: string, route: Route): void {
  writeJson(routeFile(goalId), route);
}

export function loadRoute(goal: Goal): Route | null {
  return goal.event?.routeName ? readJson<Route | null>(routeFile(goal.id), null) : null;
}
