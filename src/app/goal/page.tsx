import { GoalForm } from "@/components/GoalForm";
import { formatDuration } from "@/lib/goals/eventTime";
import { eventFuelPlan } from "@/lib/goals/fuelPlan";
import { loadGoals } from "@/lib/goals/model";
import { loadState } from "@/lib/plan/current";

export const dynamic = "force-dynamic";

export default function GoalPage() {
  const { current, goal: active, summary, settings } = loadState();
  const goal = active ?? loadGoals().at(-1) ?? null;
  const plan = summary?.route?.target ?? summary?.route?.today;
  const fuel = summary?.predicted ? eventFuelPlan(settings.weightKg, summary.route?.target?.seconds ?? summary.predicted.seconds) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="display text-[24px]">{goal ? goal.name : "Set a goal"}</h1>
        <p className="text-[15px] text-muted">The plan is built backwards from this date: base, build, event-specific, then a two-week taper.</p>
      </header>

      {summary?.route && plan && (
        <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="label">Pacing plan</h2>
            <span className="display text-[18px]">{formatDuration(plan.seconds)}</span>
          </div>
          <p className="text-[14px] leading-snug">
            {summary.route.target
              ? `For your target: ${plan.avgPower} W average, ${plan.basePower} W on the flat.`
              : `At today's hour power: ${plan.avgPower} W average, ${plan.basePower} W on the flat.`}{" "}
            A little harder uphill, freewheel more on descents.
          </p>
          {plan.climbs.length > 0 ? (
            <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line">
              {plan.climbs.map((c) => (
                <li key={c.startKm} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-[14px]">
                    <span className="font-semibold">km {c.startKm}</span> · {c.lengthKm} km at {c.avgGrade}%
                    <span className="block text-[13px] text-muted">
                      +{c.gainM} m · steepest {c.maxGrade}% · about {c.minutes} min
                    </span>
                  </span>
                  <span className="display whitespace-nowrap text-[17px] text-signal-ink">{c.watts} W</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[14px] text-muted">No sustained climbs found on this route.</p>
          )}
          {summary.route.target && summary.route.today && (
            <p className="text-[13px] text-muted">
              Today you’d ride it in about {formatDuration(summary.route.today.seconds)} at {summary.route.today.avgPower} W average.
            </p>
          )}
        </section>
      )}

      {fuel && (
        <section className="flex flex-col gap-3 rounded-3xl bg-asphalt p-5 text-chalk">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="label" style={{ color: "#B9C4D0" }}>
              Event-day fuel
            </h2>
            <span className="display text-[18px]">{fuel.gramsPerHour} g/h</span>
          </div>
          <dl className="grid grid-cols-2 gap-3 text-[14px]" style={{ color: "#C9D3DD" }}>
            <div>
              <dt>Two days before</dt>
              <dd className="display text-[17px] text-chalk">
                {fuel.loadingPerDay[0]}–{fuel.loadingPerDay[1]} g
              </dd>
              <dd>carbs a day: rice, pasta, bread, juice</dd>
            </div>
            <div>
              <dt>Breakfast, 3 h before</dt>
              <dd className="display text-[17px] text-chalk">{fuel.breakfast} g</dd>
              <dd>carbs, low in fibre and fat</dd>
            </div>
            <div>
              <dt>On the bike, total</dt>
              <dd className="display text-[17px] text-chalk">{fuel.totalGrams} g</dd>
              <dd>carbs</dd>
            </div>
            <div>
              <dt>Fluid</dt>
              <dd className="display text-[17px] text-chalk">
                {fuel.fluidTotal[0]}–{fuel.fluidTotal[1]} L
              </dd>
              <dd>
                {fuel.fluidPerHour[0]}–{fuel.fluidPerHour[1]} ml/h, {fuel.sodiumPerHour[0]}–{fuel.sodiumPerHour[1]} mg sodium/h
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-1.5 rounded-2xl px-4 py-3" style={{ background: "#1E242C" }}>
            <div className="label" style={{ color: "#B9C4D0" }}>
              Every hour
            </div>
            {fuel.hour.map((h) => (
              <div key={h.item} className="flex justify-between gap-3 text-[14px]">
                <span>{h.item}</span>
                <span className="whitespace-nowrap font-semibold">{h.grams} g</span>
              </div>
            ))}
          </div>
          <p className="text-[13px]" style={{ color: "#C9D3DD" }}>
            {fuel.every} Refill bottles at the feed stations. Practise exactly this on your 3.5 h rides so your gut is ready.
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        {goal && <h2 className="label px-1">Edit goal</h2>}
        <GoalForm goal={goal} hourPower={current ? Math.round(current.hourPower) : null} />
      </section>
    </main>
  );
}
