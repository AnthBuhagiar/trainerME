"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DayChoice, DayKind } from "@/lib/plan/availability";

const NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Sunday first: weeks run Sunday to Saturday. */
const ORDER = [6, 0, 1, 2, 3, 4, 5];
const LENGTHS = [30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300];
const chip = (on: boolean) =>
  `h-9 min-w-0 flex-1 rounded-full border px-1 text-[13px] font-semibold ${on ? "border-asphalt bg-asphalt text-chalk dark:border-chalk dark:bg-chalk dark:text-asphalt" : "border-line"}`;
const fmtLength = (m: number) => (m < 90 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ""}`);

export function DaysEditor({ initial, custom }: { initial: DayChoice[]; custom: boolean }) {
  const router = useRouter();
  const [days, setDays] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const set = (weekday: number, patch: Partial<DayChoice>) =>
    setDays((all) => all.map((d) => (d.weekday === weekday ? { ...d, ...patch, minutes: patch.kind === "strength" && d.kind !== "strength" ? 45 : (patch.minutes ?? d.minutes) || 60 } : d)));

  const rides = days.filter((d) => d.kind === "ride");
  const strength = days.filter((d) => d.kind === "strength").length;
  const total = days.filter((d) => d.kind !== "off").reduce((n, d) => n + d.minutes, 0);

  async function post(body: unknown, done: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/availability", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    setMessage(res.ok ? done : ((await res.json()).error ?? "Couldn’t save."));
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        {ORDER.map((weekday) => {
          const d = days.find((x) => x.weekday === weekday)!;
          return (
            <li key={weekday} className="flex flex-col gap-2 px-3 py-3">
              <div className="flex items-center gap-2">
                <span className="w-11 shrink-0 text-[15px] font-semibold" title={NAMES[weekday]}>
                  {SHORT[weekday]}
                </span>
                {(["off", "ride", "strength"] as DayKind[]).map((k) => (
                  <button key={k} type="button" onClick={() => set(weekday, { kind: k })} aria-pressed={d.kind === k} className={chip(d.kind === k)}>
                    {k === "off" ? "Off" : k === "ride" ? "Ride" : "Strength"}
                  </button>
                ))}
              </div>
              {d.kind !== "off" && (
                <div className="flex items-center gap-2 text-[14px]">
                  <input
                    type="time"
                    value={d.start}
                    onChange={(e) => set(weekday, { start: e.target.value })}
                    className="h-9 w-[7.25rem] shrink-0 rounded-lg border border-line bg-card px-2"
                    aria-label={`${NAMES[weekday]} start time`}
                  />
                  <select
                    value={d.minutes}
                    onChange={(e) => set(weekday, { minutes: Number(e.target.value) })}
                    className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-card px-2"
                    aria-label={`${NAMES[weekday]} length`}
                  >
                    {[...new Set([...LENGTHS, d.minutes])].sort((a, b) => a - b).map((m) => (
                      <option key={m} value={m}>
                        {fmtLength(m)}
                      </option>
                    ))}
                  </select>
                  {d.kind === "ride" && (
                    <button type="button" onClick={() => set(weekday, { indoor: !d.indoor })} className="h-9 shrink-0 rounded-lg border border-line px-2 text-[13px] font-semibold">
                      {d.indoor ? "Indoor" : "Outdoor"}
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-[14px]">
        <strong>{fmtLength(total)}</strong> a week · {rides.length} {rides.length === 1 ? "ride" : "rides"} · {strength} strength
      </p>
      {strength < 2 && <p className="text-[13px] text-muted">Two strength sessions a week are recommended (heavy strength helps cycling).</p>}
      {rides.length > 0 && !rides.some((r) => r.minutes >= 120) && <p className="text-[13px] text-muted">A ride of 2 hours or more each week builds the endurance long events need.</p>}

      <button
        onClick={() => post({ days }, "Saved. Your plan now uses these days.")}
        disabled={busy}
        className="h-12 rounded-2xl bg-signal-ink text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save my days"}
      </button>
      {custom && (
        <button onClick={() => post({ reset: true }, "Back to the week learned from your rides.")} disabled={busy} className="h-10 text-[14px] font-semibold text-muted">
          Go back to my Strava pattern
        </button>
      )}
      {message && (
        <p className="text-center text-[13px] text-muted" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
