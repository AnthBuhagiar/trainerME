import Link from "next/link";
import { ActivityIcon, ICON_NAME } from "@/components/ActivityIcon";
import type { StripDay, StripItem } from "@/lib/plan/weekStrip";
import { length } from "@/lib/ui/format";

const LETTER = ["S", "M", "T", "W", "T", "F", "S"]; // weeks run Sunday to Saturday

function Chip({ item }: { item: StripItem }) {
  const label = `${ICON_NAME[item.icon]}: ${item.title}, ${length(item.minutes)}${item.state === "done" ? ", done" : item.state === "missed" ? ", missed" : ""}`;
  const style =
    item.state === "done"
      ? "bg-asphalt text-chalk dark:bg-chalk dark:text-asphalt"
      : item.state === "missed"
        ? "border border-dashed border-line text-muted opacity-50"
        : item.key
          ? "border-2 border-signal-ink text-signal-ink"
          : "border border-line text-foreground";
  const chip = (
    <span title={label} aria-label={label} className={`flex h-10 w-10 items-center justify-center rounded-full ${style}`}>
      <ActivityIcon icon={item.icon} />
    </span>
  );
  return item.href ? <Link href={item.href}>{chip}</Link> : chip;
}

/** This week as seven columns: solid icons for what you did, outlines for what's planned. */
export function WeekStrip({ days }: { days: StripDay[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-line bg-card px-2 py-3">
      <ol className="grid grid-cols-7">
        {days.map((d, i) => (
          <li key={d.date} className={`flex flex-col items-center gap-1.5 rounded-2xl py-1.5 ${d.today ? "bg-background" : ""}`} aria-current={d.today ? "date" : undefined}>
            <span className={`text-[11px] font-semibold ${d.today ? "text-foreground" : "text-muted"}`}>{d.today ? "Today" : LETTER[i]}</span>
            {/* Today is marked like a calendar date, never in orange: orange rings mean key sessions. */}
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] ${d.today ? "bg-asphalt font-semibold text-chalk dark:bg-chalk dark:text-asphalt" : "text-muted"}`}
            >
              {Number(d.date.slice(8, 10))}
            </span>
            {d.items.length ? (
              d.items.slice(0, 3).map((item, j) => <Chip key={j} item={item} />)
            ) : (
              <span className="flex h-10 items-center text-[18px] leading-none text-line" aria-label="Rest">
                ·
              </span>
            )}
          </li>
        ))}
      </ol>
      <div className="flex justify-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-asphalt dark:bg-chalk" /> Done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-muted" /> Planned
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-signal-ink" /> Key session
        </span>
      </div>
    </div>
  );
}
