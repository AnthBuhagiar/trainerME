import type { RideSample } from "@/lib/strava/tcx";

/**
 * The ride's clock and recording, kept as plain data so it survives the app
 * being switched away from, frozen or even closed by the phone. Time comes
 * from the wall clock, not from ticks, so a paused browser tab doesn't stop
 * the workout: coming back puts you at the right step. The state is saved on
 * the device every few seconds and restored when the ride page opens again.
 */

export interface RideState {
  /** When Start was first pressed (epoch ms), or null before starting. */
  startedAt: number | null;
  /** Total time spent paused. */
  pausedMs: number;
  /** Set while paused. */
  pausedAt: number | null;
  /** Seconds jumped with Skip step. */
  skippedS: number;
  ended: boolean;
  /** % adjustment to all targets. */
  offset: number;
  samples: RideSample[];
  /** Last time this state was saved (epoch ms). */
  savedAt: number;
}

export const emptyRide = (): RideState => ({ startedAt: null, pausedMs: 0, pausedAt: null, skippedS: 0, ended: false, offset: 0, samples: [], savedAt: 0 });

/** Seconds into the workout at `now`. */
export function elapsedAt(s: RideState, now: number): number {
  if (s.startedAt === null) return 0;
  const end = s.pausedAt ?? now;
  return Math.max(0, Math.floor((end - s.startedAt - s.pausedMs) / 1000) + s.skippedS);
}

export const isRunning = (s: RideState) => s.startedAt !== null && s.pausedAt === null && !s.ended;

export function start(s: RideState, now: number): RideState {
  if (s.startedAt === null) return { ...s, startedAt: now };
  if (s.pausedAt !== null) return { ...s, pausedMs: s.pausedMs + (now - s.pausedAt), pausedAt: null };
  return s;
}

export function pause(s: RideState, now: number): RideState {
  return isRunning(s) ? { ...s, pausedAt: now } : s;
}

export function skip(s: RideState, seconds: number): RideState {
  return { ...s, skippedS: s.skippedS + Math.max(0, Math.round(seconds)) };
}

export function end(s: RideState, now: number): RideState {
  return { ...pause(s, now), ended: true };
}

/** Add a sample for this second, once. Gaps (while the phone had the app frozen) simply have no data. */
export function record(s: RideState, t: number, sample: Omit<RideSample, "t">): RideState {
  if (s.samples.length && s.samples[s.samples.length - 1].t >= t) return s;
  return { ...s, samples: [...s.samples, { t, ...sample }] };
}

/** A saved ride older than this isn't offered back. */
export const RESUME_WITHIN_MS = 12 * 3600_000;
const PREFIX = "hour-power-ride:";

export function saveRide(key: string, s: RideState, now = Date.now()): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ ...s, savedAt: now }));
  } catch {
    // Storage full or blocked: the ride carries on, it just can't be restored after a close.
  }
}

export function loadRide(key: string, now = Date.now()): RideState | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const s = JSON.parse(raw) as RideState;
    if (!s.startedAt || now - s.savedAt > RESUME_WITHIN_MS) return null;
    return s;
  } catch {
    return null;
  }
}

export function clearRide(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // nothing to clear
  }
}
