import type { AthleteSettings } from "@/lib/types";

/**
 * Training targets follow an hour power the rider has accepted, not the live
 * estimate: zones never change silently (product strategy C12). When the
 * estimate moves far enough, the rider is asked.
 */

/** Change (W) that is worth asking about. */
export const PROPOSE_AT_W = 3;

export interface TargetsState {
  /** Hour power workouts are built from. */
  training: number;
  /** A new value to offer, if the estimate has moved enough. */
  proposal: number | null;
  /** True the first time, when nothing has been accepted yet. */
  initial: boolean;
}

export function targetsState(settings: AthleteSettings, estimate: number | null): TargetsState | null {
  if (estimate === null) return null;
  const now = Math.round(estimate);
  if (!settings.trainingHourPower) return { training: now, proposal: null, initial: true };
  const training = settings.trainingHourPower;
  const moved = Math.abs(now - training) >= PROPOSE_AT_W;
  // After "keep", only ask again once it has moved another few watts.
  const declined = settings.declinedHourPower !== undefined && Math.abs(now - settings.declinedHourPower) < PROPOSE_AT_W;
  return { training, proposal: moved && !declined ? now : null, initial: false };
}
