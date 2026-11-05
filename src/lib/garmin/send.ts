import crypto from "node:crypto";
import { GARMIN, garminCall, loadSent, saveSent, type GarminStatus, type SentWorkout } from "@/lib/garmin/client";
import { toGarminWorkout } from "@/lib/garmin/workout";
import { nextWeekStart, type loadState } from "@/lib/plan/current";
import type { PlannedSession } from "@/lib/plan/week";

export interface GarminSendResult {
  sent: number;
  replaced: number;
}

export const keyOf = (s: PlannedSession) => `${s.date} ${s.start}`;

/** The workout exactly as Garmin would get it: any change to the ride or its targets changes this. */
export function workoutFingerprint(s: PlannedSession, hourPower: number): string {
  return crypto.createHash("sha1").update(`${s.date}|${JSON.stringify(toGarminWorkout(s, hourPower))}`).digest("hex").slice(0, 16);
}

/** What the Week page sends: the rest of this week and all of next week. */
export function upcomingRides(state: ReturnType<typeof loadState>): { sessions: PlannedSession[]; oldest: string; newest: string } {
  const next = nextWeekStart(state.thisWeekStart);
  const sessions = [...state.week(state.thisWeekStart).sessions, ...state.week(next).sessions].filter((s) => s.date >= state.today);
  const newest = new Date(Date.parse(`${next}T00:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
  return { sessions, oldest: state.today, newest };
}

/**
 * Are these rides on Garmin as planned now? "sent" when every one was sent and
 * hasn't changed since, "changed" when some were sent but the plan moved on (or
 * a ride was added), "unsent" when none were.
 */
export function sendState(sessions: PlannedSession[], hourPower: number, sent = loadSent()): NonNullable<GarminStatus["sent"]> {
  const rides = sessions.filter((s) => s.ride);
  if (!rides.length || !hourPower) return "unsent";
  const byKey = new Map(sent.map((w) => [w.key, w]));
  const matches = rides.filter((s) => {
    const w = byKey.get(keyOf(s));
    return w && asPlanned(w, s, hourPower);
  }).length;
  if (matches === rides.length) return "sent";
  return rides.some((s) => byKey.has(keyOf(s))) ? "changed" : "unsent";
}

/** Is this sent workout still the planned session (at any length the rider chose when sending)? */
export function asPlanned(w: SentWorkout, s: PlannedSession, hourPower: number): boolean {
  const fp = w.planFingerprint ?? w.fingerprint;
  // Sent before fingerprints were kept: can't tell, so trust it was as planned.
  return w.key === keyOf(s) && (!fp || fp === workoutFingerprint(s, hourPower));
}

/** Remove one workout Hour Power sent before. Already gone on Garmin (deleted by the rider) is fine. */
export async function removeSent(w: SentWorkout): Promise<void> {
  const gone = (e: unknown) => {
    if (!/\(404\)/.test((e as Error).message)) throw e;
  };
  if (w.scheduleId) await garminCall(`${GARMIN.schedule}/${w.scheduleId}`, { method: "DELETE" }).catch(gone);
  await garminCall(`${GARMIN.workout}/${w.workoutId}`, { method: "DELETE" }).catch(gone);
}

/**
 * Put planned rides on the rider's Garmin Connect calendar. What Hour Power sent
 * before for the same sessions (or, with a date range, any day in it) is
 * replaced, so sending again after the plan changed never leaves doubles.
 * Workouts the rider made in Garmin Connect are never touched: only ones in
 * Hour Power's own record are removed.
 */
export async function sendToGarmin(
  sessions: PlannedSession[],
  hourPower: number,
  range?: { oldest: string; newest: string },
  /** Sending one session at another length: the session as planned. */
  planned?: PlannedSession,
): Promise<GarminSendResult> {
  const rides = sessions.filter((s) => s.ride);
  const keys = new Set(rides.map(keyOf));
  let sent = loadSent();
  const old = sent.filter((w) => keys.has(w.key) || (range && w.date >= range.oldest && w.date <= range.newest));
  for (const w of old) {
    await removeSent(w);
    sent = sent.filter((x) => x !== w);
    saveSent(sent); // saved as it goes, so a failure part-way never forgets what's still on Garmin
  }
  for (const s of rides) await addRide(s, hourPower, sent, planned && keyOf(planned) === keyOf(s) ? planned : s);
  // Keep the record short: workouts more than a month old are history.
  const cutoff = new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);
  saveSent(sent.filter((w) => w.date >= cutoff));
  return { sent: rides.length, replaced: old.length };
}

/** Create the workout on Garmin, schedule it on its day, and record it in `sent` (saved as it goes). */
export async function addRide(s: PlannedSession, hourPower: number, sent: SentWorkout[], planned: PlannedSession = s): Promise<void> {
  const created = await garminCall<{ workoutId: number }>(GARMIN.workout, { method: "POST", body: JSON.stringify(toGarminWorkout(s, hourPower)) });
  const entry: SentWorkout = {
    key: keyOf(s),
    date: s.date,
    workoutId: created.workoutId,
    fingerprint: workoutFingerprint(s, hourPower),
    planFingerprint: workoutFingerprint(planned, hourPower),
  };
  sent.push(entry);
  saveSent(sent);
  const scheduleId = await garminCall<number | { scheduleId?: number; id?: number }>(GARMIN.schedule, {
    method: "POST",
    body: JSON.stringify({ workoutId: created.workoutId, date: s.date }),
  });
  entry.scheduleId = typeof scheduleId === "number" ? scheduleId : (scheduleId?.scheduleId ?? scheduleId?.id);
  saveSent(sent);
}
