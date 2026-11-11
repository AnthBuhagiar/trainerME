import { asAthlete } from "@/lib/auth/athlete";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sessionTitle } from "@/components/SessionCard";
import { SendExternal } from "@/components/SendExternal";
import { WorkoutSteps } from "@/components/WorkoutSteps";
import { DoneElsewhere } from "@/components/DoneElsewhere";
import { hasIntervalsKey } from "@/lib/intervals/client";
import { garminStatus } from "@/lib/garmin/client";
import { sendState } from "@/lib/garmin/send";
import { workMinutes } from "@/lib/plan/library";
import { lengthLimits, resolveSession } from "@/lib/plan/session";
import { LengthPicker } from "@/components/LengthPicker";
import { SwapPicker } from "@/components/SwapPicker";
import { StrengthDone } from "@/components/StrengthDone";
import { strengthLogged } from "@/lib/plan/strengthLog";
import { kindOf } from "@/lib/plan/timeBudget";
import { canUpload } from "@/lib/strava/client";
import { getWorkout, scaleWorkout } from "@/lib/plan/library";
import { swapOptions } from "@/lib/plan/swaps";
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
  const limits = lengthLimits(planned);
  // A gym session the rider recorded themselves (on Strava), not one logged here with "Done it".
  const recordedGym = planned.strength
    ? state.activities.find((a) => a.startLocal.slice(0, 10) === date && kindOf(a.sportType) === "strength" && !a.id.startsWith("hpgym-") && !strengthLogged(planned))
    : undefined;
  // Other workouts for this day (not once it's done or gone by).
  const choices =
    planned.ride && !planned.completedIn && date >= state.today
      ? swapOptions(week, planned).map((o) => ({
          id: o.workout.id,
          name: o.workout.name,
          minutes: scaleWorkout(o.workout, planned.minutes).minutes,
          line: plain(o.workout.summary).split(/(?<=\.)\s/)[0].replace(/\s*\([^)]*\)/g, ""),
          kind: o.kind,
        }))
      : [];
  // Share of the planned session kept: quality minutes for interval sessions, total time for steady rides.
  const kept =
    session.ride && planned.ride
      ? planned.ride.workout.main && workMinutes(planned.ride.workout) > 0
        ? workMinutes(session.ride.workout) / workMinutes(planned.ride.workout)
        : session.minutes / planned.minutes
      : 1;

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
          {hourPower > 0 && <p className="text-[13px] text-muted">Targets from your {hourPower} W training hour power.</p>}
          {hourPower > 0 && session.indoor && !planned.completedIn && (
            <Link
              href={`/ride/${date}?start=${planned.start}${minutes ? `&minutes=${minutes}` : ""}`}
              className="flex h-14 items-center justify-center rounded-2xl bg-signal-ink text-[17px] font-semibold text-white"
            >
              {date === state.today ? "Ride it on my trainer" : "Do this workout now"}
            </Link>
          )}
          {session.indoor && planned.completedIn && <DoneElsewhere date={date} start={planned.start} doneIn={planned.completedIn} />}
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
          {date <= state.today &&
            (recordedGym ? (
              <p className="rounded-2xl border border-line bg-card px-4 py-3 text-[15px] font-semibold">
                <span className="text-done">✓</span> Done · {recordedGym.name}
              </p>
            ) : (
              <StrengthDone
                date={date}
                start={planned.start}
                name={session.strength.name}
                minutes={session.minutes}
                logged={strengthLogged(planned)}
                canUpload={canUpload()}
              />
            ))}
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

      {choices.length > 0 && (
        <SwapPicker
          date={date}
          start={planned.start}
          choices={choices}
          current={planned.ride!.workout.id}
          planned={planned.swappedFrom ? { name: getWorkout(planned.swappedFrom).name } : undefined}
        />
      )}

      {planned.ride && limits && !planned.completedIn && (
        <section className="flex flex-col gap-2">
          <h2 className="label">Change length</h2>
          <LengthPicker value={session.minutes} planned={planned.minutes} min={limits.min} max={limits.max} baseHref={`/session/${date}?start=${planned.start}`} />
          {minutes && session.ride && Number(minutes) < planned.minutes && (
            <p className="text-[13px] text-muted">Keeps {Math.round(Math.min(1, kept) * 100)}% of the work.</p>
          )}
          {minutes && Number(minutes) > planned.minutes && <p className="text-[13px] text-muted">Extra time is easy riding.</p>}
        </section>
      )}

      {session.ride && hourPower > 0 && !planned.completedIn && (
        <SendExternal
          intervals={hasIntervalsKey()}
          garmin={garminStatus(sendState([session], hourPower))}
          returnTo={`/session/${date}?start=${planned.start}${minutes ? `&minutes=${minutes}` : ""}`}
          session={{ date, start: planned.start, minutes }}
          footer={session.indoor ? <DoneElsewhere date={date} start={planned.start} row /> : undefined}
        />
      )}

      <p className="text-[13px] text-muted">{plain(planned.why)}</p>
    </main>
  );
}

export default async function SessionPage(props: Parameters<typeof SessionPageView>[0]) {
  return asAthlete(() => SessionPageView(props));
}
