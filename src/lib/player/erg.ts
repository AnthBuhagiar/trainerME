/**
 * How the trainer is driven each second, following what the established apps
 * (Zwift, TrainerRoad, Wahoo) and their riders have settled on:
 *
 * - ERG holds the target power, whatever the cadence or gear.
 * - Short sprints (work steps of 20 s or less) go out of ERG: a trainer can't
 *   change resistance that fast, so they're ridden on the gears ("level").
 * - The "spiral of death": in ERG, slowing down makes it heavier, which slows
 *   you more. Below 50 rpm for 3 s the resistance is released; spinning back
 *   above 65 rpm for 2 s brings ERG back.
 * - Into ERG gently: at the start, after a pause, after a sprint on the gears
 *   or a low-cadence rescue, the target ramps up over 5 s from what you're
 *   riding, instead of hitting you all at once.
 * - The rider can turn ERG off and ride the whole workout on the gears.
 *
 * Pure: the player calls it every second and sends whatever it returns.
 */

export const SPRINT_MAX_S = 20;
export const LOW_RPM = 50;
export const LOW_FOR_MS = 3000;
export const BACK_RPM = 65;
export const BACK_FOR_MS = 2000;
export const RAMP_MS = 5000;

export type ErgReason = "erg" | "ramp" | "off" | "sprint" | "low-cadence" | "paused";

export interface ErgCommand {
  /** "erg": hold `watts`; "gears": no target, the rider sets resistance with the gears. */
  mode: "erg" | "gears";
  watts?: number;
  reason: ErgReason;
}

export interface ErgInput {
  now: number;
  running: boolean;
  /** The rider's ERG switch. */
  ergOn: boolean;
  target: number;
  /** The current step is a short work effort (a sprint). */
  sprint: boolean;
  cadence?: number;
  /** Power now (3 s average), to ramp from. */
  power?: number;
}

export interface ErgMemory {
  lowSince?: number;
  backSince?: number;
  rescued?: boolean;
  /** Last command's mode, to notice coming back into ERG. */
  lastMode?: "erg" | "gears";
  ramp?: { at: number; from: number };
}

const round5 = (w: number) => Math.round(w / 5) * 5;

export function ergStep(input: ErgInput, memory: ErgMemory): { command: ErgCommand; memory: ErgMemory } {
  const m: ErgMemory = { ...memory };
  const gears = (reason: ErgReason) => {
    m.lastMode = "gears";
    m.ramp = undefined;
    return { command: { mode: "gears" as const, reason }, memory: m };
  };

  if (!input.running) {
    m.lowSince = m.backSince = undefined;
    m.rescued = false;
    return gears("paused");
  }
  if (!input.ergOn) return gears("off");

  // Spiral-of-death rescue.
  const cadence = input.cadence;
  if (cadence !== undefined) {
    if (!m.rescued) {
      m.lowSince = cadence < LOW_RPM ? (m.lowSince ?? input.now) : undefined;
      if (m.lowSince !== undefined && input.now - m.lowSince >= LOW_FOR_MS) {
        m.rescued = true;
        m.backSince = undefined;
      }
    } else {
      m.backSince = cadence >= BACK_RPM ? (m.backSince ?? input.now) : undefined;
      if (m.backSince !== undefined && input.now - m.backSince >= BACK_FOR_MS) {
        m.rescued = false;
        m.lowSince = undefined;
      }
    }
  }
  if (m.rescued) return gears("low-cadence");
  if (input.sprint) return gears("sprint");

  // Back into ERG (or starting): ramp up from what's being ridden.
  if (m.lastMode !== "erg") {
    const from = Math.max(input.target * 0.5, input.power ?? 0);
    m.ramp = from < input.target - 20 ? { at: input.now, from } : undefined;
  }
  m.lastMode = "erg";
  if (m.ramp) {
    const done = (input.now - m.ramp.at) / RAMP_MS;
    if (done < 1) return { command: { mode: "erg", watts: round5(m.ramp.from + (input.target - m.ramp.from) * done), reason: "ramp" }, memory: m };
    m.ramp = undefined;
  }
  return { command: { mode: "erg", watts: input.target, reason: "erg" }, memory: m };
}

/** What the rider sees about it, when it isn't plain ERG. */
export function ergNote(reason: ErgReason): string | null {
  switch (reason) {
    case "sprint":
      return "Sprint: ERG off, ride it on your gears";
    case "low-cadence":
      return "Cadence low: resistance eased. Spin up to get ERG back";
    case "off":
      return "ERG off: ride on your gears";
    default:
      return null;
  }
}
