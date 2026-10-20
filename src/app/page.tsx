import { HourRing } from "@/components/HourRing";
import { SetupCard } from "@/components/SetupCard";
import { SyncPanel } from "@/components/SyncPanel";
import { loadRides, loadSettings } from "@/lib/data/store";
import { dateOnly, todayLocal } from "@/lib/engine/dates";
import { buildHistory } from "@/lib/engine/history";
import { buildModel } from "@/lib/engine/hourPower";
import { callbackDomain, hasCredentials, loadTokens } from "@/lib/strava/client";

export const dynamic = "force-dynamic";

const fmtDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });

function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r)} W`;
}

export default async function Home({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const { strava: notice } = await searchParams;
  const tokens = loadTokens();
  const settings = loadSettings();
  const rides = loadRides();
  const missing = rides.filter((r) => !r.streams).length;
  const history = rides.length ? buildHistory(buildModel(rides), todayLocal()) : null;
  const current = history?.current ?? null;

  // Until goals are set up, show progress from the 6-month low towards +20%.
  const recent = history?.points.filter((p) => Date.parse(p.date) > Date.now() - 182 * 86_400_000) ?? [];
  const start = recent.length ? Math.floor(Math.min(...recent.map((p) => p.hourPower)) / 5) * 5 : 0;
  const goal = current ? Math.ceil((current.hourPower * 1.2) / 5) * 5 : 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex flex-col gap-0.5">
        <div className="label">{new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</div>
        <h1 className="display text-[24px]">
          {tokens?.athlete?.firstname ? `Hi, ${tokens.athlete.firstname}` : "Hour Power"}
        </h1>
      </header>

      {current ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl bg-asphalt p-5 text-chalk">
          <HourRing hourPower={current.hourPower} low={current.low} high={current.high} start={start} goal={goal} />
          <div className="flex w-full justify-between text-[13px]" style={{ color: "#B9C4D0" }}>
            <span className="whitespace-nowrap">{(current.hourPower / settings.weightKg).toFixed(2)} W/kg</span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-block h-2 w-2 rounded-full bg-signal" />
              Example goal {goal} W
            </span>
          </div>
          <dl className="grid w-full grid-cols-2 gap-3 text-[13px]" style={{ color: "#B9C4D0" }}>
            <div>
              <dt>From best efforts</dt>
              <dd className="display text-[18px] text-chalk">{current.cp ? `${Math.round(current.cp.hourPower)} W` : "–"}</dd>
            </div>
            <div>
              <dt>From heart rate at {current.hr?.refHr ?? "–"} bpm</dt>
              <dd className="display text-[18px] text-chalk">{current.hr ? `${Math.round(current.hr.hourPower)} W` : "–"}</dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className="rounded-3xl bg-asphalt p-6 text-chalk">
          <h2 className="display text-[22px]">Let’s find your hour power</h2>
          <p className="mt-2 text-[15px]" style={{ color: "#C9D3DD" }}>
            Connect Strava and sync. Rides with a power meter and heart rate give the best estimate.
          </p>
        </section>
      )}

      {!tokens && <SetupCard hasCredentials={hasCredentials()} callbackDomain={callbackDomain()} notice={notice} />}

      <SyncPanel connected={!!tokens} missing={missing} />

      {history && history.ledger.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="label px-1">Why it changed</h2>
          {history.ledger.slice(0, 6).map((entry) => (
            <article key={entry.rideId} className="flex gap-3 rounded-2xl border border-line bg-card px-4 py-3">
              <div className="flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-[#E6EAEE] px-2.5 text-[14px] font-bold text-asphalt">
                {signed(entry.delta)}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="text-[15px] font-semibold">
                  {fmtDate.format(new Date(dateOnly(entry.date)))} · {entry.rideName}
                </div>
                {entry.reasons.map((r) => (
                  <div key={r} className="text-[13px] leading-snug text-muted">
                    {r}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
