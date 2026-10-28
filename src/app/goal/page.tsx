import { asAthlete } from "@/lib/auth/athlete";
import { GoalForm } from "@/components/GoalForm";
import { HourRing } from "@/components/HourRing";
import { ringScale } from "@/lib/goals/ringScale";
import { formatDuration } from "@/lib/goals/eventTime";
import { eventFuelPlan } from "@/lib/goals/fuelPlan";
import { loadGoals } from "@/lib/goals/model";
import { loadState } from "@/lib/plan/current";

export const dynamic = "force-dynamic";

function GoalPageView() {
  const { current, goal: active, summary, settings, history } = loadState();
  const goal = active ?? loadGoals().at(-1) ?? null;
  const plan = summary?.route?.target ?? summary?.route?.today;
  const fuel = summary?.predicted ? eventFuelPlan(settings.weightKg, summary.route?.target?.seconds ?? summary.predicted.seconds) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="display text-[24px]">{goal ? goal.name : "Set a goal"}</h1>
      </header>

      {summary && current && (
        <section className="flex items-center gap-4 rounded-3xl bg-asphalt p-4 text-chalk">
          {(() => {
            const scale = ringScale(active, summary.targetHourPower, history, current.hourPower);
            return <HourRing hourPower={current.hourPower} low={current.low} high={current.high} start={scale.start} goal={scale.goal} size={128} />;
          })()}
          <div className="flex min-w-0 flex-col gap-1">
            <span className="label" style={{ color: "var(--goal)" }}>
              Goal hour power
            </span>
            <span className="display text-[34px] leading-none text-goal">
              {summary.targetHourPower}
              <span className="text-[16px]"> W</span>
            </span>
            <span className="text-[13px] leading-snug" style={{ color: "#B9C4D0" }}>
              {summary.targetHourPower > current.hourPower
                ? `${Math.round(summary.targetHourPower - current.hourPower)} W to go · ${summary.weeksToGo} weeks`
                : "Reached. Hold it to event day."}
            </span>
            <span className="text-[12px] leading-snug" style={{ color: "#9AA6B2" }}>
              The blue mark on your Hour Ring.
            </span>
          </div>
        </section>
      )}

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

      {goal ? (
        <details className="group rounded-2xl border border-line bg-card">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[15px] font-semibold">
            Edit goal or import route
            <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="border-t border-line p-4">
            <GoalForm goal={goal} hourPower={current ? Math.round(current.hourPower) : null} />
          </div>
        </details>
      ) : (
        <GoalForm goal={goal} hourPower={current ? Math.round(current.hourPower) : null} />
      )}
    </main>
  );
}

export default async function GoalPage() {
  return asAthlete(() => GoalPageView());
}
