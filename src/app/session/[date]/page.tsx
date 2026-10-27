import { asAthlete } from "@/lib/auth/athlete";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sessionTitle } from "@/components/SessionCard";
import { SendExternal } from "@/components/SendExternal";
import { WorkoutSteps } from "@/components/WorkoutSteps";
import { hasIntervalsKey } from "@/lib/intervals/client";
import { workMinutes } from "@/lib/plan/library";
import { resolveSession } from "@/lib/plan/session";
import { dayLabel, length, plain } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

async function SessionPageView({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ start?: string; minutes?: string }>;
}) {
  const { date } = await params;
  const { start, minutes } = await searchParams;
  const found = resolveSession(date, start, minutes);
  if (!found) notFound();
  const { state, week, planned, session, hourPower } = found;
  // Long rides come down in half hours, weeknight sessions in quarter hours.
  const options = planned.minutes >= 120 ? [planned.minutes - 30, planned.minutes - 60, 90] : [planned.minutes - 15, 45, 30];
  const shorter = planned.ride
    ? options.filter((m, i, all) => m < planned.minutes && m >= planned.ride!.workout.minMinutes && all.indexOf(m) === i)
    : [];
  // Share of the planned session kept: quality minutes for interval sessions, total time for steady rides.
  const kept =
    session.ride && planned.ride
      ? planned.ride.workout.main && workMinutes(planned.ride.workout) > 0
        ? workMinutes(session.ride.workout) / workMinutes(planned.ride.workout)
        : session.minutes / planned.minutes
      : 1;
  const href = (m?: number) => `/session/${date}?start=${planned.start}${m ? `&minutes=${m}` : ""}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      <Link href="/week" className="label">
        ← Week
      </Link>
      <header className="flex flex-col gap-1">
        <div className="label">
          {dayLabel(date, state.today)} · {week.label}
        </div>
        <h1 className="display text-[26px] leading-tight">{sessionTitle(session)}</h1>
        <div className="display text-[18px]">{length(session.minutes)}</div>
      </header>

      {session.ride && (
        <>
          <p className="text-[15px] leading-snug">{plain(session.ride.workout.summary)}</p>
          {hourPower > 0 && <WorkoutSteps workout={session.ride.workout} hourPower={hourPower} />}
          {hourPower > 0 && <p className="text-[13px] text-muted">Targets from your training hour power of {hourPower} W. When your estimate moves, Today asks before changing it.</p>}
          {hourPower > 0 && session.indoor && (
            <Link
              href={`/ride/${date}?start=${planned.start}${minutes ? `&minutes=${minutes}` : ""}`}
              className="flex h-14 items-center justify-center rounded-2xl bg-signal-ink text-[17px] font-semibold text-white"
            >
              Ride it on my trainer
            </Link>
          )}
        </>
      )}

      {session.strength && (
        <>
          <p className="text-[15px] leading-snug">{plain(session.strength.summary)}</p>
          <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
            {session.strength.items.map((item) => (
              <li key={item} className="px-4 py-3 text-[15px]">
                {item}
              </li>
            ))}
          </ul>
        </>
      )}

      {session.fuel && (
        <section className="flex flex-col gap-1 rounded-2xl bg-asphalt px-4 py-4 text-chalk">
          <div className="label" style={{ color: "#B9C4D0" }}>
            Fuel
          </div>
          <div className="display text-[22px]">
            {session.fuel.gramsPerHour} g carbs / hour
          </div>
          <div className="text-[14px]" style={{ color: "#C9D3DD" }}>
            About {session.fuel.totalGrams} g in total. {session.fuel.note}
          </div>
        </section>
      )}

      {planned.ride && (shorter.length > 0 || minutes) && (
        <section className="flex flex-col gap-2">
          <h2 className="label">Less time?</h2>
          <div className="flex flex-wrap gap-2">
            {minutes && (
              <Link href={href()} className="flex h-10 items-center rounded-full border border-line bg-card px-4 text-[15px] font-semibold">
                Full {length(planned.minutes)}
              </Link>
            )}
            {shorter.map((m) => (
              <Link
                key={m}
                href={href(m)}
                aria-current={Number(minutes) === m ? "true" : undefined}
                className={`flex h-10 items-center rounded-full border px-4 text-[15px] font-semibold ${
                  Number(minutes) === m ? "border-asphalt bg-asphalt text-chalk" : "border-line bg-card"
                }`}
              >
                {length(m)}
              </Link>
            ))}
          </div>
          {minutes && session.ride && (
            <p className="text-[13px] text-muted">Keeps {Math.round(Math.min(1, kept) * 100)}% of the work. Shorter is better than skipped.</p>
          )}
        </section>
      )}

      {session.ride && hourPower > 0 && <SendExternal intervals={hasIntervalsKey()} session={{ date, start: planned.start, minutes }} />}

      {planned.adjusted && <p className="text-[14px] font-semibold text-signal-ink">{planned.adjusted}</p>}
      <p className="text-[13px] text-muted">{plain(planned.why)}</p>
    </main>
  );
}

export default async function SessionPage(props: Parameters<typeof SessionPageView>[0]) {
  return asAthlete(() => SessionPageView(props));
}
