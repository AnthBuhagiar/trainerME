import Link from "next/link";
import { dateOnly } from "@/lib/engine/dates";
import type { LedgerEntry } from "@/lib/engine/history";

const fmt = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" });

export function signed(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : r < 0 ? "−" : "±"}${Math.abs(r)} W`;
}

/** "Why it changed": the newest few entries, with a link to the full list. */
export function ChangeList({ entries, limit, detail = true }: { entries: LedgerEntry[]; limit?: number; detail?: boolean }) {
  const shown = limit ? entries.slice(0, limit) : entries;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="label">Why it changed</h2>
        {limit && entries.length > limit && (
          <Link href="/progress/changes" className="text-[14px] font-semibold text-signal-ink">
            See all {entries.length} →
          </Link>
        )}
      </div>
      <ol className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-card">
        {shown.map((e) => (
          <li key={e.rideId} className="flex items-start gap-3 px-4 py-3">
            <span className={`display w-[4.75rem] shrink-0 whitespace-nowrap text-[16px] ${e.delta > 0 ? "text-done" : e.delta < 0 ? "text-signal-ink" : "text-muted"}`}>{signed(e.delta)}</span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold">
                {fmt.format(new Date(dateOnly(e.date)))} · {e.rideName}
              </span>
              {detail && e.reasons[0] && <span className="block text-[13px] leading-snug text-muted">{e.reasons[0]}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
