"use client";

import { clock } from "@/lib/player/miniPlayer";

interface Props {
  watts: number;
  /** Seconds ridden in total (workout plus free ride). */
  elapsed: number;
  live: { power?: number; cadence?: number; hr?: number };
  running: boolean;
  trainer: boolean;
  onWatts: (watts: number) => void;
  onToggle: () => void;
  onEnd: () => void;
  onMinimise: () => void;
}

const MUTED = { color: "#9AA6B2" };
const CARD = { background: "#1A1F26" };
const STEPS = [-20, -5, 5, 20];

/** After the workout: ride on at a power you set, with End ride always in reach. */
export function FreeRide(p: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-asphalt px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] text-chalk"
      role="dialog"
      aria-label="Free ride"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="label" style={MUTED}>
          Free ride
        </span>
        <button onClick={p.onMinimise} className="rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: "#1E242C" }}>
          Minimise
        </button>
      </div>

      <section className="flex flex-col items-center gap-2 rounded-3xl p-5" style={CARD}>
        <div className="label" style={MUTED}>
          Target
        </div>
        <div className="display leading-none tabular-nums" style={{ fontSize: "clamp(64px, min(26vw, 18vh), 140px)" }}>
          {p.watts}
          <span className="text-[28px]"> W</span>
        </div>
        <div className="grid w-full grid-cols-4 gap-2">
          {STEPS.map((d) => (
            <button
              key={d}
              onClick={() => p.onWatts(Math.max(50, Math.min(600, p.watts + d)))}
              className="h-14 rounded-2xl text-[18px] font-semibold"
              style={{ background: "#2A323D" }}
              aria-label={`${d > 0 ? "Up" : "Down"} ${Math.abs(d)} watts`}
            >
              {d > 0 ? `+${d}` : `−${-d}`}
            </button>
          ))}
        </div>
        {!p.trainer && <p className="text-[13px]" style={MUTED}>Trainer not connected: ride to the number yourself.</p>}
      </section>

      <section className="grid grid-cols-3 gap-3">
        {[
          ["Power", p.live.power, "W"],
          ["Cadence", p.live.cadence !== undefined ? Math.round(p.live.cadence) : undefined, "rpm"],
          ["Heart", p.live.hr, "bpm"],
        ].map(([label, value, unit]) => (
          <div key={label as string} className="rounded-3xl px-3 py-3 text-center" style={CARD}>
            <div className="label" style={MUTED}>
              {label}
            </div>
            <div className="display text-[30px] tabular-nums">{value ?? "–"}</div>
            <div className="text-[12px]" style={MUTED}>
              {unit}
            </div>
          </div>
        ))}
      </section>

      <div className="flex items-baseline justify-between px-1">
        <span className="label" style={MUTED}>
          Ridden
        </span>
        <span className="display text-[28px] tabular-nums">{clock(p.elapsed)}</span>
      </div>

      <div className="mt-auto grid grid-cols-[auto_1fr] gap-2">
        <button onClick={p.onToggle} className="h-16 rounded-2xl px-5 text-[16px] font-semibold" style={{ background: "#1E242C" }}>
          {p.running ? "Pause" : "Resume"}
        </button>
        <button onClick={p.onEnd} className="h-16 rounded-2xl bg-signal-ink text-[19px] font-semibold text-white">
          End ride
        </button>
      </div>
    </div>
  );
}
