import Link from "next/link";
import { Watermark } from "@/components/Watermark";
import { asAthlete } from "@/lib/auth/athlete";
import { CATALOGUE, FAMILIES, variations } from "@/lib/plan/catalogue";
import { loadState } from "@/lib/plan/current";
import { getWorkout, targetWatts, type Workout } from "@/lib/plan/library";
import { plain } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

/** Families shown, in the order a rider thinks of them. */
const SHOWN = ["easy", "tempo", "sweetspot", "threshold", "supra", "vo2-short", "vo2-long", "climb", "durability", "sprints"];
const CHIP: Record<string, string> = {
  easy: "Easy",
  tempo: "Tempo",
  sweetspot: "Sweet spot",
  threshold: "Threshold",
  supra: "Above threshold",
  "vo2-short": "VO2 short",
  "vo2-long": "VO2 long",
  climb: "Climbing",
  durability: "Long rides",
  sprints: "Sprints",
};
const INTENSITY: Record<Workout["intensity"], { label: string; className: string }> = {
  easy: { label: "Easy", className: "bg-done/15 text-done" },
  moderate: { label: "Moderate", className: "bg-signal/15 text-signal-ink dark:text-signal" },
  hard: { label: "Hard", className: "bg-signal-ink text-white" },
};

const mins = (s: number) => (s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);

/** "2 × 15 min at 200–210 W": the work, in the rider's watts. */
function workLine(w: Workout, hourPower: number): string {
  const effort = w.main?.work ?? w.steady;
  if (!effort) return "";
  const [lo, hi] = hourPower ? targetWatts(effort, hourPower) : [0, 0];
  const at = hourPower ? ` at ${lo}–${hi} W` : ` at ${Math.round(effort.target[0] * 100)}–${Math.round(effort.target[1] * 100)}%`;
  if (!w.main) return `Steady${at}`;
  const n = w.main.sets * w.main.reps;
  return `${n} × ${mins(w.main.work.seconds)}${at}`;
}

function WorkoutsView({ family }: { family?: string }) {
  const { targets } = loadState();
  const hourPower = targets?.training ?? 0;
  const shown = family && SHOWN.includes(family) ? [family] : SHOWN;
  const count = CATALOGUE.filter((e) => SHOWN.includes(e.family)).length;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <Watermark src="/photos/forest-climb.jpg" position="50% 45%" />
      <Link href="/plan" className="label">
        ← Plan
      </Link>
      <header className="flex flex-col gap-1 pt-6">
        <h1 className="display text-[24px]">Workouts</h1>
        <p className="text-[15px] text-muted">{count} workouts · ride any of them on a free day</p>
      </header>

      <nav aria-label="Kinds of workout" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {[undefined, ...SHOWN].map((f) => {
          const active = (f ?? "") === (family ?? "");
          return (
            <Link
              key={f ?? "all"}
              href={f ? `/workouts?family=${f}` : "/workouts"}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[14px] font-semibold ${active ? "bg-asphalt text-chalk dark:bg-chalk dark:text-asphalt" : "border border-line bg-card"}`}
            >
              {f ? CHIP[f] : "All"}
            </Link>
          );
        })}
      </nav>

      {shown.map((id) => {
        const info = FAMILIES.find((f) => f.id === id)!;
        const list = variations(id);
        return (
          <section key={id} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5 px-1">
              <h2 className="label">{info.name}</h2>
              <p className="text-[13px] leading-snug text-muted">{plain(info.aim)}</p>
            </div>
            <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card/90 backdrop-blur-sm">
              {list.map((e) => {
                const w = getWorkout(e.id);
                const tag = INTENSITY[w.intensity];
                return (
                  <li key={e.id}>
                    <Link href={`/workouts/${e.id}`} className="flex flex-col gap-1 px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[16px] font-semibold leading-snug">{w.name}</span>
                        <span className="display whitespace-nowrap text-[14px]">
                          {w.minMinutes}–{w.maxMinutes} min
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[13px]">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tag.className}`}>{tag.label}</span>
                        <span className="text-muted">{workLine(w, hourPower)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[12px] text-muted">
                        <span aria-label={`Level ${e.level} of ${list.length}`} className="flex gap-0.5">
                          {list.map((x) => (
                            <span key={x.id} className={`h-1.5 w-4 rounded-full ${x.level <= e.level ? "bg-signal" : "bg-line"}`} />
                          ))}
                        </span>
                        {w.indoorFriendly ? "Trainer or road" : "Best outdoors"}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}

export default async function WorkoutsPage({ searchParams }: { searchParams: Promise<{ family?: string }> }) {
  const { family } = await searchParams;
  return asAthlete(() => WorkoutsView({ family }));
}
