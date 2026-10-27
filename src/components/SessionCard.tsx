import Link from "next/link";
import { ActivityIcon, ICON_NAME } from "@/components/ActivityIcon";
import { sessionIcon } from "@/lib/plan/weekStrip";
import type { PlannedSession } from "@/lib/plan/week";
import { dayLabel, length } from "@/lib/ui/format";

export function sessionTitle(s: PlannedSession): string {
  if (s.ride) return s.ride.workout.name;
  if (s.strength) return s.strength.name;
  return s.kind === "run" ? "Run" : "Session";
}

/**
 * A planned session. Under a heading that already names the day (Today), pass
 * `showDay={false}`: the card then leads with what kind of session it is.
 */
export function SessionCard({ session, today, compact = false, showDay = true }: { session: PlannedSession; today: string; compact?: boolean; showDay?: boolean }) {
  const where = place(session);
  const icon = sessionIcon(session);
  return (
    <Link href={`/session/${session.date}?start=${session.start}`} className="flex flex-col gap-1 rounded-2xl border border-line bg-card px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        {showDay ? (
          <span className="label">{dayLabel(session.date, today)}</span>
        ) : (
          <span className="label flex items-center gap-1.5">
            <ActivityIcon icon={icon} size={18} />
            {ICON_NAME[icon]}
          </span>
        )}
        <span className="display whitespace-nowrap text-[16px]">{length(session.minutes)}</span>
      </div>
      <div className="text-[16px] font-semibold leading-snug">{sessionTitle(session)}</div>
      {session.adjusted && <div className="text-[13px] font-semibold text-signal-ink">{session.adjusted}</div>}
      {!compact && (showDay || session.fuel) && (
        <div className="text-[13px] text-muted">
          {showDay ? where : ""}
          {session.fuel && `${showDay ? " · " : ""}fuel ${session.fuel.gramsPerHour} g carbs/h`}
        </div>
      )}
    </Link>
  );
}

function place(session: PlannedSession): string {
  if (session.strength) return "Strength";
  return session.indoor ? "Indoor" : "Outdoor";
}
