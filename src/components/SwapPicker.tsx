"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface SwapChoice {
  id: string;
  name: string;
  minutes: number;
  /** One line on what it is. */
  line: string;
  kind: "similar" | "easier" | "harder";
}

const GROUPS: { kind: SwapChoice["kind"]; label: string }[] = [
  { kind: "similar", label: "Similar" },
  { kind: "easier", label: "Easier" },
  { kind: "harder", label: "Harder" },
];

const minutes = (m: number) => (m < 90 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}`);

/** "Try something different": other workouts that fit this day, by how they compare. */
export function SwapPicker({ date, start, choices, current, planned }: { date: string; start: string; choices: SwapChoice[]; current: string; planned?: { name: string } }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function pick(id: string | null) {
    setBusy(true);
    await fetch("/api/swaps", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date, start, id }) });
    router.refresh();
    setBusy(false);
  }

  return (
    <section className="flex flex-col gap-2">
      {planned && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-[14px]">
          <span className="text-muted">Swapped from {planned.name}</span>
          <button onClick={() => pick(null)} disabled={busy} className="font-semibold text-signal-ink disabled:opacity-50">
            Undo
          </button>
        </div>
      )}
      <details className="group rounded-2xl border border-line bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
          Try something different
          <span aria-hidden="true" className="text-[13px] text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="flex flex-col gap-3 px-4 pb-4">
          {GROUPS.map(({ kind, label }) => {
            const list = choices.filter((c) => c.kind === kind);
            if (!list.length) return null;
            return (
              <div key={kind} className="flex flex-col gap-1">
                <span className="label">{label}</span>
                <ul className="flex flex-col divide-y divide-line">
                  {list.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => pick(c.id)}
                        disabled={busy || c.id === current}
                        className="flex w-full items-start justify-between gap-3 py-2.5 text-left disabled:opacity-60"
                      >
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold">
                            {c.name}
                            {c.id === current && <span className="text-muted"> · chosen</span>}
                          </span>
                          <span className="block text-[13px] leading-snug text-muted">{c.line}</span>
                        </span>
                        <span className="display whitespace-nowrap text-[14px]">{minutes(c.minutes)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}
