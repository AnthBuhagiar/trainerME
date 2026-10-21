import Link from "next/link";
import { notFound } from "next/navigation";
import { RidePlayer } from "@/components/RidePlayer";
import { sessionTitle } from "@/components/SessionCard";
import { playerSteps } from "@/lib/player/steps";
import { resolveSession } from "@/lib/plan/session";

export const dynamic = "force-dynamic";

export default async function RidePage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ start?: string; minutes?: string }>;
}) {
  const { date } = await params;
  const { start, minutes } = await searchParams;
  const found = resolveSession(date, start, minutes);
  if (!found?.session.ride || !found.hourPower) notFound();
  const { session, planned, hourPower } = found;
  const back = `/session/${date}?start=${planned.start}${minutes ? `&minutes=${minutes}` : ""}`;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      <Link href={back} className="label">
        ← Session
      </Link>
      <h1 className="display text-[22px] leading-tight">{sessionTitle(session)}</h1>
      <RidePlayer name={sessionTitle(session)} autoUpload={!!found.state.settings.autoUpload} steps={playerSteps(session.ride!.workout, hourPower)} backHref={back} />
    </main>
  );
}
