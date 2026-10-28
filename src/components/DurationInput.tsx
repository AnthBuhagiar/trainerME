"use client";

import { useEffect, useState } from "react";

/**
 * Hours and minutes, typed or stepped 5 minutes at a time with − and +.
 * Compact enough for a phone row. Calls onChange with whole minutes, kept
 * between min and max and rounded to 5.
 */
export function DurationInput({
  value,
  onChange,
  min = 15,
  max = 480,
  label,
}: {
  value: number;
  onChange: (minutes: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  const [h, setH] = useState(String(Math.floor(value / 60)));
  const [m, setM] = useState(String(value % 60).padStart(2, "0"));
  useEffect(() => {
    setH(String(Math.floor(value / 60)));
    setM(String(value % 60).padStart(2, "0"));
  }, [value]);

  const clamp = (n: number) => Math.max(min, Math.min(max, Math.round(n / 5) * 5));
  const commit = (hours: string, minutes: string) => {
    const total = clamp((Number(hours) || 0) * 60 + (Number(minutes) || 0));
    onChange(total);
    setH(String(Math.floor(total / 60)));
    setM(String(total % 60).padStart(2, "0"));
  };
  const step = (d: number) => commit("0", String(clamp(value + d)));
  const field = "h-9 w-9 rounded-lg border border-line bg-card text-center text-[15px] tabular-nums";
  const btn = "h-9 w-8 shrink-0 rounded-lg border border-line bg-card text-[18px] font-semibold leading-none disabled:opacity-40";

  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" onClick={() => step(-5)} disabled={value <= min} className={btn} aria-label={`${label}: 5 minutes less`}>
        −
      </button>
      <input
        inputMode="numeric"
        value={h}
        onChange={(e) => setH(e.target.value.replace(/\D/g, "").slice(0, 1))}
        onBlur={() => commit(h, m)}
        onKeyDown={(e) => e.key === "Enter" && commit(h, m)}
        className={field}
        aria-label={`${label}: hours`}
      />
      <span className="text-[13px] text-muted">h</span>
      <input
        inputMode="numeric"
        value={m}
        onChange={(e) => setM(e.target.value.replace(/\D/g, "").slice(0, 2))}
        onBlur={() => commit(h, m)}
        onKeyDown={(e) => e.key === "Enter" && commit(h, m)}
        className={field}
        aria-label={`${label}: minutes`}
      />
      <span className="text-[13px] text-muted">min</span>
      <button type="button" onClick={() => step(5)} disabled={value >= max} className={btn} aria-label={`${label}: 5 minutes more`}>
        +
      </button>
    </div>
  );
}
