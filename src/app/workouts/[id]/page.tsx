import Link from "next/link";
import { notFound } from "next/navigation";
import { LengthPicker } from "@/components/LengthPicker";
import { WorkoutSteps } from "@/components/WorkoutSteps";
import { asAthlete } from "@/lib/auth/athlete";
import { catalogueEntry, FAMILIES, variations } from "@/lib/plan/catalogue";
import { loadState } from "@/lib/plan/current";
import { getWorkout, scaleWorkout, totalMinutes } from "@/lib/plan/library";
import { length, plain } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

const INTENSITY = { easy: "Easy", moderate: "Moderate", hard: "Hard" } as const;

/** One workout from the catalogue: its steps in the rider's watts, and riding it now. */
function WorkoutView({ id, minutes }: { id: string; minutes?: string }) {
  const entry = catalogueEntry(id);
  if (!entry) notFound();
  const { targets } = loadState();
  const hourPower = targets?.training ?? 0;
  const base = getWorkout(id);
  const usual = Math.max(base.minMinutes, Math.min(base.maxMinutes, totalMinutes(base)));
  const wanted = Number(minutes) || usual;
  const { workout, minutes: total } = scaleWorkout(base, wanted);
  const family = FAMILIES.find((f) => f.id === entry.family)!;
  const list = variations(entry.family);
  const min = Math.ceil(base.minMinutes / 5) * 5;
  const max = Math.floor(base.maxMinutes / 5) * 5;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      <Link href={`/workouts?family=${entry.family}`} className="label">
        ← Workouts
      </Link>
      <header className="flex flex-col gap-1">
        <div className="label">
          {family.name} · {INTENSITY[base.intensity]} · level {entry.level} of {list.length}
        </div>
        <h1 className="display text-[26px] leading-tight">{workout.name}</h1>
        <div className="display text-[18px]">{length(total)}</div>
      </header>
      <p className="text-[15px] leading-snug">{plain(base.summary).replace(/\s*\([^)]*\)/g, "")}</p>

      {hourPower > 0 ? (
        <>
          <WorkoutSteps workout={workout} hourPower={hourPower} />
          <p className="text-[13px] text-muted">Targets from your {hourPower} W training hour power.</p>
        </>
      ) : (
        <p className="text-[14px] text-muted">Sync Strava to see this workout in your watts.</p>
      )}

      {base.indoorFriendly && hourPower > 0 && (
        <Link
          href={`/ride/workout/${id}${minutes ? `?minutes=${total}` : ""}`}
          className="flex h-14 items-center justify-center rounded-2xl bg-signal-ink text-[17px] font-semibold text-white"
        >
          Ride it now
        </Link>
      )}
      {!base.indoorFriendly && <p className="text-[14px] text-muted">Best ridden outdoors.</p>}

      {max > min && (
        <section className="flex flex-col gap-2">
          <h2 className="label">Length</h2>
          <LengthPicker value={total} planned={usual} min={min} max={max} baseHref={`/workouts/${id}`} />
        </section>
      )}
    </main>
  );
}

export default async function WorkoutPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ minutes?: string }> }) {
  const [{ id }, { minutes }] = await Promise.all([params, searchParams]);
  return asAthlete(() => WorkoutView({ id, minutes }));
}
