import { ownerId } from "@/lib/auth/owner";
import { currentAthlete, multiUser } from "@/lib/data/store";
import { workoutText } from "@/lib/intervals/workoutText";
import type { PlannedSession } from "@/lib/plan/week";

/**
 * Push planned rides to the rider's Intervals.icu calendar with their personal
 * API key. Intervals.icu then syncs them to Garmin Connect (and Zwift, if
 * connected), so they appear on the watch or head unit.
 */

const API = "https://intervals.icu/api/v1";
const ME = "/athlete/0"; // 0 = the athlete who owns the key
const MARKER = "Planned by Hour Power";
export const EXTERNAL_PREFIX = "hourpower-";

/**
 * The server's INTERVALS_API_KEY belongs to one person: on a shared server only
 * its owner uses it, so nobody else's plan or rides get mixed with theirs.
 */
function apiKey(): string | undefined {
  if (multiUser() && currentAthlete() !== ownerId()) return undefined;
  return process.env.INTERVALS_API_KEY;
}

export function hasIntervalsKey(): boolean {
  return !!apiKey();
}

function headers(): HeadersInit {
  const key = apiKey();
  if (!key) throw new Error("Add INTERVALS_API_KEY as a Codespaces secret or in .env.local (see README).");
  return {
    Authorization: `Basic ${Buffer.from(`API_KEY:${key}`).toString("base64")}`,
    "Content-Type": "application/json",
  };
}

export async function intervalsGet<T>(path: string): Promise<T> {
  return call<T>(path);
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: headers() });
  if (res.status === 401 || res.status === 403) throw new Error("Intervals.icu didn't accept the API key. Check INTERVALS_API_KEY.");
  if (!res.ok) throw new Error(`Intervals.icu request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

interface IntervalsEvent {
  id: number;
  name?: string;
  description?: string | null;
  external_id?: string | null;
  start_date_local: string;
}

export function toEvent(s: PlannedSession, hourPower: number) {
  const w = s.ride!.workout;
  return {
    category: "WORKOUT",
    type: s.indoor ? "VirtualRide" : "Ride",
    start_date_local: `${s.date}T${s.start}:00`,
    name: w.name,
    moving_time: s.minutes * 60,
    external_id: `${EXTERNAL_PREFIX}${s.date}-${s.start.replace(":", "")}`,
    description: `${w.summary}\n\n${workoutText(w, hourPower)}\n\n${s.fuel ? `Fuel: ${s.fuel.gramsPerHour} g carbs per hour.\n` : ""}${MARKER}`,
  };
}

export interface SendResult {
  sent: number;
  replaced: number;
}

/**
 * Replace Hour Power's rides in the date range: delete the ones sent before
 * (recognised by external_id or the marker line), then create the current
 * plan. Rides the rider added themselves are left alone.
 */
export async function sendSessions(sessions: PlannedSession[], hourPower: number, oldest: string, newest: string): Promise<SendResult> {
  const rides = sessions.filter((s) => s.ride);
  const existing = await call<IntervalsEvent[]>(`${ME}/events?oldest=${oldest}&newest=${newest}&category=WORKOUT`);
  const ours = existing.filter((e) => e.external_id?.startsWith(EXTERNAL_PREFIX) || e.description?.includes(MARKER));
  for (const e of ours) await call(`${ME}/events/${e.id}`, { method: "DELETE" });
  if (rides.length) await call(`${ME}/events/bulk?upsert=true`, { method: "POST", body: JSON.stringify(rides.map((s) => toEvent(s, hourPower))) });
  return { sent: rides.length, replaced: ours.length };
}
