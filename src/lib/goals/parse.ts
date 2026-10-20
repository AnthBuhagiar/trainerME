import type { Goal, GoalType, Priority } from "@/lib/goals/model";

const TYPES: GoalType[] = ["event", "performance", "climb", "challenge", "consistency", "comeback", "custom"];
const PRIORITIES: Priority[] = ["A", "B", "C"];

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Validate a goal posted by the form; returns an error message or the goal. */
export function parseGoal(body: Record<string, unknown>, existing: Goal[]): Goal | string {
  const name = String(body.name ?? "").trim();
  const date = String(body.date ?? "");
  const type = body.type as GoalType;
  const priority = (body.priority as Priority) ?? "A";
  if (!name) return "Give the goal a name.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return "Pick a date.";
  if (!TYPES.includes(type)) return "Pick a goal type.";
  if (!PRIORITIES.includes(priority)) return "Pick a priority.";
  const id = typeof body.id === "string" && body.id ? body.id : `${date}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  const before = existing.find((g) => g.id === id);
  const goal: Goal = {
    id,
    name,
    type,
    priority,
    date,
    targetWatts: num(body.targetWatts),
    startHourPower: before?.startHourPower ?? num(body.startHourPower),
    createdAt: before?.createdAt ?? new Date().toISOString().slice(0, 10),
  };
  const distanceKm = num(body.distanceKm);
  if (distanceKm) {
    const hours = num(body.targetHours) ?? 0;
    const minutes = num(body.targetMins) ?? 0;
    goal.event = {
      distanceKm,
      climbingM: num(body.climbingM) ?? 0,
      targetMinutes: hours * 60 + minutes || undefined,
    };
  }
  return goal;
}
