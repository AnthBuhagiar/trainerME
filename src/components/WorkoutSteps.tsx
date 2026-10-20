import { targetWatts, type Effort, type Workout } from "@/lib/plan/library";

interface Step {
  label: string;
  effort: Effort;
}

function mins(seconds: number): string {
  return seconds >= 60 ? `${Math.round((seconds / 60) * 10) / 10} min` : `${seconds} s`;
}

function steps(w: Workout): Step[] {
  const out: Step[] = [{ label: `Warm up · ${mins(w.warmup.seconds)}`, effort: w.warmup }];
  const main: Step[] = [];
  if (w.main) {
    const m = w.main;
    const reps = m.sets > 1 ? `${m.sets} sets of ${m.reps}` : `${m.reps}×`;
    main.push({ label: `${reps} ${mins(m.work.seconds)}`, effort: m.work});
    if (m.reps > 1) main.push({ label: `Between reps · ${mins(m.rest.seconds)}`, effort: m.rest });
    if (m.betweenSets && m.sets > 1) main.push({ label: `Between sets · ${mins(m.betweenSets.seconds)} easy`, effort: m.betweenSets });
  }
  const steady: Step[] = w.steady && w.steady.seconds > 0 ? [{ label: `Steady · ${mins(w.steady.seconds)}`, effort: w.steady }] : [];
  // Long rides put the efforts late; everything else does them after the warm-up.
  out.push(...(w.purpose === "durability" ? [...steady, ...main] : [...main, ...steady]));
  if (w.cooldown.seconds > 0) out.push({ label: `Cool down · ${mins(w.cooldown.seconds)}`, effort: w.cooldown });
  return out;
}

export function WorkoutSteps({ workout, hourPower }: { workout: Workout; hourPower: number }) {
  return (
    <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
      {steps(workout).map((s, i) => {
        const [lo, hi] = targetWatts(s.effort, hourPower);
        const work = s.effort.target[0] >= 0.76;
        return (
          <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-[15px]">
              {s.label}
            </span>
            <span className={`display whitespace-nowrap text-[17px] ${work ? "text-signal-ink" : "text-muted"}`}>
              {lo}–{hi} W
            </span>
          </li>
        );
      })}
    </ol>
  );
}
