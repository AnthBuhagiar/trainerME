import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityIcon, ICON_NAME } from "@/components/ActivityIcon";
import { sessionTitle } from "@/components/SessionCard";
import { signed } from "@/components/ChangeList";
import { asAthlete } from "@/lib/auth/athlete";
import { loadState } from "@/lib/plan/current";
import { weekStartOf } from "@/lib/plan/periodise";
import { kindOf } from "@/lib/plan/timeBudget";
import { activityIcon } from "@/lib/plan/weekStrip";
import { dayLabel, length } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

/** Best efforts shown, by duration in seconds. */
const EFFORTS: [string, string][] = [
  ["5", "5 s"],
  ["60", "1 min"],
  ["300", "5 min"],
  ["1200", "20 min"],
  ["3600", "60 min"],
];

const clockTime = (iso: string) => {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
};

/** A ride or other activity from Strava: the numbers that matter, and what it did to the plan and hour power. */
function ActivityPageView({ id }: { id: string }) {
  const state = loadState();
  const activity = state.activities.find((a) => a.id === id);
  if (!activity) notFound();
  const ride = state.rides.find((r) => r.id === id);
  const s = ride?.streams;
  const date = activity.startLocal.slice(0, 10);
  const icon = activityIcon(activity);
  const isRide = kindOf(activity.sportType) === "ride";
  const kg = state.settings.weightKg;
  const change = state.history?.ledger.find((e) => e.rideId === id);
  // The planned session it counted for: same kind that day, or the workout ridden on another day under its name.
  const kind = kindOf(activity.sportType);
  const planned = state.week(weekStartOf(date)).sessions.find(
    (x) => x.kind === kind && (x.date === date || (x.ride && sessionTitle(x) === activity.name)),
  );

  const stats: [string, string][] = [
    ["Time", length(Math.round(activity.movingTime / 60))],
    ...(activity.distance > 0 ? ([["Distance", `${(activity.distance / 1000).toFixed(1)} km`]] as [string, string][]) : []),
    ...(activity.elevationGain > 0 ? ([["Climbing", `${Math.round(activity.elevationGain)} m`]] as [string, string][]) : []),
    ...(activity.distance > 0 && activity.movingTime > 0
      ? ([["Average speed", `${((activity.distance / activity.movingTime) * 3.6).toFixed(1)} km/h`]] as [string, string][])
      : []),
    ...(s?.avgWatts ? ([["Average power", `${Math.round(s.avgWatts)} W`]] as [string, string][]) : []),
    ...(s?.np ? ([["Normalised power", `${Math.round(s.np)} W`]] as [string, string][]) : []),
    ...(s?.kj ? ([["Work", `${Math.round(s.kj)} kJ`]] as [string, string][]) : []),
    ...(s?.avgHr ? ([["Heart rate", `${Math.round(s.avgHr)} avg${s.maxHr ? ` · ${Math.round(s.maxHr)} max` : ""}`]] as [string, string][]) : []),
    ...(s?.avgCadence ? ([["Cadence", `${Math.round(s.avgCadence)} rpm`]] as [string, string][]) : []),
    ...(activity.relativeEffort ? ([["Relative Effort", String(activity.relativeEffort)]] as [string, string][]) : []),
  ];
  const efforts = s?.powerCurve ? EFFORTS.filter(([k]) => s.powerCurve![k]).map(([k, label]) => [label, s.powerCurve![k]!] as const) : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      <Link href="/week" className="label">
        ← Week
      </Link>
      <header className="flex flex-col gap-1">
        <div className="label flex items-center gap-1.5">
          <ActivityIcon icon={icon} size={18} />
          {ICON_NAME[icon]} · {dayLabel(date, state.today)} · {clockTime(activity.startLocal)}
        </div>
        <h1 className="display text-[24px] leading-tight">{activity.name}</h1>
      </header>

      <dl className="grid grid-cols-2 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-card px-4 py-3">
            <dt className="label">{label}</dt>
            <dd className="display text-[20px] leading-tight">{value}</dd>
          </div>
        ))}
      </dl>

      {efforts.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="label px-1">Best power</h2>
          <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
            {efforts.map(([label, watts]) => (
              <li key={label} className="flex items-baseline justify-between px-4 py-2.5 text-[15px]">
                <span>{label}</span>
                <span>
                  <span className="display text-[17px]">{Math.round(watts)} W</span>
                  <span className="text-muted"> · {(watts / kg).toFixed(2)} W/kg</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {isRide && !s && <p className="text-[14px] text-muted">Power and heart rate arrive with the next sync.</p>}

      {change && (
        <section className="flex flex-col gap-1 rounded-2xl border border-line bg-card px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="label">Hour power</span>
            <span className={`display text-[18px] ${change.delta > 0 ? "text-done" : change.delta < 0 ? "text-signal-ink" : ""}`}>{signed(change.delta)}</span>
          </div>
          {change.reasons[0] && <p className="text-[14px] leading-snug">{change.reasons[0]}</p>}
        </section>
      )}

      {planned && (
        <Link href={`/session/${planned.date}?start=${planned.start}`} className="flex items-baseline justify-between rounded-2xl border border-line bg-card px-4 py-3">
          <span className="label">Counted for</span>
          <span className="text-[15px] font-semibold">
            {sessionTitle(planned)} · {dayLabel(planned.date, state.today)}
          </span>
        </Link>
      )}

      {s?.np && state.targets?.training && (
        <p className="text-[13px] text-muted">
          Intensity {Math.round((s.np / state.targets.training) * 100)}% of your {state.targets.training} W training hour power.
        </p>
      )}

      {/^\d+$/.test(activity.id) && (
        <a href={`https://www.strava.com/activities/${activity.id}`} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-signal-ink">
          View on Strava
        </a>
      )}
    </main>
  );
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return asAthlete(() => ActivityPageView({ id }));
}
