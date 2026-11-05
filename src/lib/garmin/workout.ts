import { targetWatts, type Effort } from "@/lib/plan/library";
import type { PlannedSession } from "@/lib/plan/week";

/**
 * A planned ride as a Garmin Training API (V2) structured workout: steps with
 * absolute watt ranges from the rider's hour power, repeats kept as repeats so
 * the watch shows "3 of 3". Garmin Connect syncs it to the rider's watch or
 * Edge, which can run it and control a smart trainer.
 */

export interface GarminStep {
  type: "WorkoutStep";
  stepOrder: number;
  intensity: "WARMUP" | "INTERVAL" | "RECOVERY" | "ACTIVE" | "COOLDOWN";
  description: string;
  durationType: "TIME";
  durationValue: number;
  targetType: "POWER";
  targetValueLow: number;
  targetValueHigh: number;
}

export interface GarminRepeat {
  type: "WorkoutRepeatStep";
  stepOrder: number;
  repeatType: "REPEAT_UNTIL_STEPS_CMPLTD";
  repeatValue: number;
  steps: GarminStep[];
}

export interface GarminWorkout {
  workoutName: string;
  description: string;
  sport: "CYCLING";
  estimatedDurationInSecs: number;
  workoutProvider: string;
  workoutSourceId: string;
  isSessionTransitionEnabled: false;
  segments: { segmentOrder: 1; sport: "CYCLING"; steps: (GarminStep | GarminRepeat)[] }[];
}

export const PROVIDER = "Hour Power";
/** Garmin caps workout names and descriptions; stay well inside the limits. */
const NAME_MAX = 60;
const DESCRIPTION_MAX = 500;

const trim = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function toGarminWorkout(s: PlannedSession, hourPower: number): GarminWorkout {
  const w = s.ride!.workout;
  let order = 0;
  const step = (e: Effort, intensity: GarminStep["intensity"], description: string): GarminStep => {
    const [lo, hi] = targetWatts(e, hourPower);
    return {
      type: "WorkoutStep",
      stepOrder: ++order,
      intensity,
      description,
      durationType: "TIME",
      durationValue: Math.round(e.seconds),
      targetType: "POWER",
      targetValueLow: lo,
      targetValueHigh: hi,
    };
  };

  // Same order as the Intervals.icu text: durability rides put the efforts late.
  const build = (): (GarminStep | GarminRepeat)[] => {
    const steps: (GarminStep | GarminRepeat)[] = [step(w.warmup, "WARMUP", "Warm up")];
    const main = () => {
      const out: (GarminStep | GarminRepeat)[] = [];
      const m = w.main;
      if (!m) return out;
      for (let set = 0; set < m.sets; set++) {
        if (m.reps > 1) {
          const repeat: GarminRepeat = { type: "WorkoutRepeatStep", stepOrder: ++order, repeatType: "REPEAT_UNTIL_STEPS_CMPLTD", repeatValue: m.reps, steps: [] };
          repeat.steps.push(step(m.work, "INTERVAL", m.sets > 1 ? `Set ${set + 1}: work` : "Work"), step(m.rest, "RECOVERY", "Easy"));
          out.push(repeat);
        } else {
          out.push(step(m.work, "INTERVAL", m.sets > 1 ? `Set ${set + 1}` : "Main set"));
        }
        if (m.betweenSets && set < m.sets - 1) out.push(step(m.betweenSets, "RECOVERY", "Easy between sets"));
      }
      return out;
    };
    const steady = () => (w.steady && w.steady.seconds > 0 ? [step(w.steady, "ACTIVE", "Steady")] : []);
    if (w.purpose === "durability") steps.push(...steady(), ...main());
    else steps.push(...main(), ...steady());
    if (w.cooldown.seconds > 0) steps.push(step(w.cooldown, "COOLDOWN", "Cool down"));
    return steps;
  };
  const steps = build();

  const seconds = steps.reduce((t, st) => t + (st.type === "WorkoutRepeatStep" ? st.repeatValue * st.steps.reduce((a, x) => a + x.durationValue, 0) : st.durationValue), 0);
  const fuel = s.fuel ? ` Fuel: ${s.fuel.gramsPerHour} g carbs per hour.` : "";
  return {
    workoutName: trim(w.name, NAME_MAX),
    description: trim(`${w.summary} Targets from your hour power (${hourPower} W).${fuel}`, DESCRIPTION_MAX),
    sport: "CYCLING",
    estimatedDurationInSecs: seconds,
    workoutProvider: PROVIDER,
    workoutSourceId: PROVIDER,
    isSessionTransitionEnabled: false,
    segments: [{ segmentOrder: 1, sport: "CYCLING", steps }],
  };
}
