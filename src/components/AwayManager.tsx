"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AwayKind, AwayPeriod } from "@/lib/plan/away";

const fmt = new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const day = (d: string) => fmt.format(new Date(`${d}T00:00:00Z`));
const input = "h-11 w-full rounded-xl border border-line bg-card px-3 text-[15px]";

export function AwayManager({ periods, today }: { periods: AwayPeriod[]; today: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<AwayKind>("away");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const upcoming = periods.filter((p) => p.end >= today);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/away", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(new FormData(form)), kind }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Couldn’t save.");
    form.reset();
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/away?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
      <h2 className="label">Away and busy days</h2>
      <p className="text-[14px] leading-snug text-muted">
        Add them as soon as you know, even months ahead. A mostly-away week becomes a holiday week and the block re-plans around it; single days just
        drop or shorten that day’s session.
      </p>
      {upcoming.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
          {upcoming.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[14px]">
              <span>
                <span className="font-semibold">{p.kind === "away" ? "Away" : "Busy"}</span> · {day(p.start)}
                {p.end !== p.start ? ` – ${day(p.end)}` : ""}
                {p.note && <span className="block text-[13px] text-muted">{p.note}</span>}
              </span>
              <button onClick={() => remove(p.id)} className="text-[13px] font-semibold text-muted">
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-col gap-2">
        <div className="flex gap-2" role="group" aria-label="Kind">
          {(["away", "busy"] as AwayKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`h-10 flex-1 rounded-full border text-[14px] font-semibold ${
                kind === k ? "border-asphalt bg-asphalt text-chalk dark:border-chalk dark:bg-chalk dark:text-asphalt" : "border-line"
              }`}
            >
              {k === "away" ? "Away · no training" : "Busy · less time"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="label">From</span>
            <input name="start" type="date" required min={today} className={input} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label">To (optional)</span>
            <input name="end" type="date" min={today} className={input} />
          </label>
        </div>
        <input name="note" placeholder="Note, e.g. family holiday" className={input} />
        {error && <p className="text-[13px] font-semibold text-signal-ink">{error}</p>}
        <button disabled={busy} className="h-12 rounded-2xl bg-signal-ink text-[15px] font-semibold text-white disabled:opacity-60">
          Add
        </button>
      </form>
    </section>
  );
}
