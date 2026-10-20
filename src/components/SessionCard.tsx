import Link from "next/link";
import type { PlannedSession } from "@/lib/plan/week";
import { clock12, dayLabel, length } from "@/lib/ui/format";

export function sessionTitle(s: PlannedSession): string {
  if (s.ride) return s.ride.workout.name;
  if (s.strength) return s.strength.name;
  return s.kind === "run" ? "Run" : "Session";
}

export function SessionCard({ session, today, compact = false }: { session: PlannedSession; today: string; compact?: boolean }) {
  const where = place(session);
  return (
    <Link href={`/session/${session.date}?start=${session.start}`} className="flex flex-col gap-1 rounded-2xl border border-line bg-card px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">
          {dayLabel(session.date, today)} · {clock12(session.start)}
        </span>
        <span className="display whitespace-nowrap text-[16px]">{length(session.minutes)}</span>
      </div>
      <div className="text-[16px] font-semibold leading-snug">{sessionTitle(session)}</div>
      {!compact && (
        <div className="text-[13px] text-muted">
          {where}
          {session.fuel && ` · fuel ${session.fuel.gramsPerHour} g carbs/h`}
        </div>
      )}
    </Link>
  );
}

function place(session: PlannedSession): string {
  if (session.strength) return "Strength";
  return session.indoor ? "Indoor" : "Outdoor";
}
