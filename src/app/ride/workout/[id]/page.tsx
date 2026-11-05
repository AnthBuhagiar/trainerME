import Link from "next/link";
import { notFound } from "next/navigation";
import { RidePlayer } from "@/components/RidePlayer";
import { asAthlete } from "@/lib/auth/athlete";
import { physicsFor } from "@/lib/goals/summary";
import { catalogueEntry } from "@/lib/plan/catalogue";
import { loadState } from "@/lib/plan/current";
import { getWorkout, scaleWorkout, totalMinutes } from "@/lib/plan/library";
import { playerSteps } from "@/lib/player/steps";
import { autoUploadOn, canUpload } from "@/lib/strava/client";

export const dynamic = "force-dynamic";

/** Ride a catalogue workout on the trainer, outside the plan (an extra ride). */
function RideWorkoutView({ id, minutes }: { id: string; minutes?: string }) {
  if (!catalogueEntry(id)) notFound();
  const state = loadState();
  const hourPower = state.targets?.training ?? 0;
  const base = getWorkout(id);
  if (!base.indoorFriendly || !hourPower) notFound();
  const { workout } = scaleWorkout(base, Number(minutes) || totalMinutes(base));
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      <Link href={`/workouts/${id}${minutes ? `?minutes=${minutes}` : ""}`} className="label">
        ← Workout
      </Link>
      <h1 className="display text-[22px] leading-tight">{workout.name}</h1>
      <RidePlayer
        storageKey={`workout-${id}-${state.today}`}
        name={workout.name}
        autoUpload={autoUploadOn(state.settings) && canUpload()}
        steps={playerSteps(workout, hourPower)}
        physics={physicsFor(state.settings)}
      />
    </main>
  );
}

export default async function RideWorkoutPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ minutes?: string }> }) {
  const [{ id }, { minutes }] = await Promise.all([params, searchParams]);
  return asAthlete(() => RideWorkoutView({ id, minutes }));
}
