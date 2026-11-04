import { speedFor, type RiderPhysics } from "@/lib/goals/eventTime";

export interface Moving {
  /** Metres a second. */
  speed: number;
  /** Metres from the start. */
  distance: number;
}

/**
 * Speed and distance for a ride on the trainer, from power: what that power
 * would carry the rider at on a flat road (as Zwift and other apps do), with
 * the rider's weight and the same air and rolling resistance the event
 * predictions use. No power (stopped, coasting) is no speed.
 */
export function virtualSpeed(samples: { t: number; power?: number }[], physics: RiderPhysics): Moving[] {
  let distance = 0;
  let last = samples.length ? samples[0].t - 1 : 0;
  return samples.map((s) => {
    const speed = s.power && s.power > 0 ? speedFor(s.power, 0, physics) : 0;
    distance += speed * Math.max(0, Math.min(5, s.t - last)); // a gap (paused) adds nothing
    last = s.t;
    return { speed, distance };
  });
}
