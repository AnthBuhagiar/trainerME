import { GARMIN, garminCall, loadSent, saveSent, type SentWorkout } from "@/lib/garmin/client";
import { toGarminWorkout } from "@/lib/garmin/workout";
import type { PlannedSession } from "@/lib/plan/week";

export interface GarminSendResult {
  sent: number;
  replaced: number;
}

const keyOf = (s: PlannedSession) => `${s.date} ${s.start}`;

/** Remove one workout Hour Power sent before. Already gone on Garmin (deleted by the rider) is fine. */
async function remove(w: SentWorkout): Promise<void> {
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
export async function sendToGarmin(sessions: PlannedSession[], hourPower: number, range?: { oldest: string; newest: string }): Promise<GarminSendResult> {
  const rides = sessions.filter((s) => s.ride);
  const keys = new Set(rides.map(keyOf));
  let sent = loadSent();
  const old = sent.filter((w) => keys.has(w.key) || (range && w.date >= range.oldest && w.date <= range.newest));
  for (const w of old) {
    await remove(w);
    sent = sent.filter((x) => x !== w);
    saveSent(sent); // saved as it goes, so a failure part-way never forgets what's still on Garmin
  }
  for (const s of rides) {
    const created = await garminCall<{ workoutId: number }>(GARMIN.workout, { method: "POST", body: JSON.stringify(toGarminWorkout(s, hourPower)) });
    const entry: SentWorkout = { key: keyOf(s), date: s.date, workoutId: created.workoutId };
    sent.push(entry);
    saveSent(sent);
    const scheduleId = await garminCall<number | { scheduleId?: number; id?: number }>(GARMIN.schedule, {
      method: "POST",
      body: JSON.stringify({ workoutId: created.workoutId, date: s.date }),
    });
    entry.scheduleId = typeof scheduleId === "number" ? scheduleId : (scheduleId?.scheduleId ?? scheduleId?.id);
    saveSent(sent);
  }
  // Keep the record short: workouts more than a month old are history.
  const cutoff = new Date(Date.now() - 31 * 86_400_000).toISOString().slice(0, 10);
  saveSent(sent.filter((w) => w.date >= cutoff));
  return { sent: rides.length, replaced: old.length };
}
