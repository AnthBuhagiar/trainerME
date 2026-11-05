import { canSendWorkouts, loadSent, saveSent, type SentWorkout } from "@/lib/garmin/client";
import { addRide, asPlanned, removeSent, upcomingRides } from "@/lib/garmin/send";
import { dataDir } from "@/lib/data/store";
import { loadState } from "@/lib/plan/current";
import type { PlannedSession } from "@/lib/plan/week";

/**
 * Keep the Garmin calendar in step with the plan. Once rides have been sent,
 * any change to them (a check-in, a swap, a day off, days away, new targets,
 * the plan adapting to what was ridden) replaces what's on Garmin, so the
 * watch runs the session as it now stands, with ERG, at its next sync.
 *
 * Only the days the rider sent are kept up to date: sending one ride doesn't
 * start sending the whole fortnight. Past days are left alone.
 */

export interface GarminChanges {
  remove: SentWorkout[];
  add: PlannedSession[];
}

export function garminChanges(sessions: PlannedSession[], hourPower: number, sent: SentWorkout[], today: string, newest: string): GarminChanges {
  const window = sent.filter((w) => w.date >= today && w.date <= newest);
  if (!window.length || hourPower <= 0) return { remove: [], add: [] };
  const rides = sessions.filter((s) => s.ride && s.date >= today && s.date <= newest);
  const kept = new Set<PlannedSession>();
  const remove: SentWorkout[] = [];
  for (const w of window) {
    const match = rides.find((s) => !kept.has(s) && asPlanned(w, s, hourPower));
    if (match) kept.add(match);
    else remove.push(w);
  }
  // A changed ride goes back on; so does one moved onto, or added to, a day within what was sent.
  const dates = window.map((w) => w.date).sort();
  const [first, last] = [dates[0], dates[dates.length - 1]];
  const replaced = new Set(remove.map((w) => w.key));
  const add = rides.filter((s) => !kept.has(s) && (replaced.has(`${s.date} ${s.start}`) || (s.date >= first && s.date <= last)));
  return { remove, add };
}

/** Bring the rider's Garmin calendar up to date with the plan. Null when there's nothing to do. */
export async function resyncGarmin(): Promise<{ removed: number; added: number } | null> {
  if (!canSendWorkouts()) return null;
  const sent = loadSent();
  if (!sent.length) return null;
  const state = loadState();
  const hourPower = state.targets?.training ?? 0;
  const { sessions, oldest, newest } = upcomingRides(state);
  const { remove, add } = garminChanges(sessions, hourPower, sent, oldest, newest);
  if (!remove.length && !add.length) return null;
  let record = sent;
  for (const w of remove) {
    await removeSent(w);
    record = record.filter((x) => x !== w);
    saveSent(record);
  }
  for (const s of add) await addRide(s, hourPower, record);
  return { removed: remove.length, added: add.length };
}

/** One update at a time per rider, so two quick changes can't put a ride on Garmin twice. */
const queues = new Map<string, Promise<unknown>>();

/** Update Garmin after the response has gone (the rider isn't kept waiting); failures go to the server log. */
export function resyncSoon(): Promise<unknown> {
  const dir = dataDir();
  const run = (queues.get(dir) ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => resyncGarmin())
    .catch((e) => console.error("Garmin update after a plan change failed:", e));
  queues.set(dir, run);
  void run.finally(() => {
    if (queues.get(dir) === run) queues.delete(dir);
  });
  return run;
}

/** For routes that change the plan: once they succeed, bring Garmin up to date. */
export function syncsGarmin<A extends unknown[]>(handler: (...args: A) => Response | Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    const res = await handler(...args);
    if (res.ok) void resyncSoon();
    return res;
  };
}
