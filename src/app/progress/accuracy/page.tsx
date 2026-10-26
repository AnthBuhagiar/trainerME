import { asAthlete } from "@/lib/auth/athlete";
import Link from "next/link";
import { signed } from "@/components/ChangeList";
import { backtest } from "@/lib/engine/backtest";
import { dateOnly } from "@/lib/engine/dates";
import { loadState } from "@/lib/plan/current";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });

function AccuracyPageView() {
  const { model } = loadState();
  const test = model ? backtest(model) : null;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      <Link href="/progress" className="label">
        ← Progress
      </Link>
      <h1 className="display text-[24px]">How accurate is it?</h1>
      {!test || !test.checks.length ? (
        <p className="text-[15px] text-muted">No hard hours or long rides to check against yet.</p>
      ) : (
        <>
          <p className="text-[15px] leading-snug">
            {test.hour.n > 0 && (
              <>
                On your {test.hour.n} hardest hours, the estimate made beforehand was off by a typical <strong>{test.hour.medianAbsError} W</strong>, and{" "}
                {test.hour.inRange} of {test.hour.n} landed inside its likely range.{" "}
              </>
            )}
            {test.long.n > 0 && (
              <>
                On {test.long.n} {test.long.n === 1 ? "ride" : "rides"} over 4 hours, the predicted average power was off by {test.long.medianAbsError} W.
              </>
            )}
          </p>
          <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
            {test.checks.map((c) => (
              <li key={`${c.rideId}-${c.kind}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0 text-[14px]">
                  <span className="block truncate font-semibold">
                    {fmt.format(new Date(dateOnly(c.date)))} · {c.name}
                  </span>
                  <span className="text-[13px] text-muted">
                    {c.kind === "hour" ? "Best hour" : "Long-ride average"}: predicted {c.predicted} W ({c.low}–{c.high})
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="display block text-[17px]">{c.actual} W</span>
                  <span className={`text-[12px] font-semibold ${c.verdict === "in range" ? "text-done" : "text-muted"}`}>
                    {c.verdict === "in range" ? "in range" : signed(c.error)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[13px] text-muted">
            Each check uses only rides before that day. Rides below the range may not have been flat out, so they aren&apos;t counted as misses.
          </p>
        </>
      )}
    </main>
  );
}

export default async function AccuracyPage() {
  return asAthlete(() => AccuracyPageView());
}
