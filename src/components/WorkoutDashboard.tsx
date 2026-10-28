"use client";

import type { PlayerStep } from "@/lib/player/steps";

interface Props {
  steps: PlayerStep[];
  index: number;
  /** Seconds left in the current step. */
  remaining: number;
  elapsed: number;
  total: number;
  target: number;
  offset: number;
  live: { power?: number; cadence?: number; hr?: number };
  /** Average power so far in this step. */
  stepAvg: number | null;
  running: boolean;
  trainer: boolean;
  error: string | null;
  onToggle: () => void;
  onSkip: () => void;
  onOffset: (delta: number) => void;
  onMinimise: () => void;
  onConnect: () => void;
  /** Pop the workout out as a floating tile; only where the browser supports it. */
  onMini?: () => void;
  miniOpen?: boolean;
}

const clock = (s: number) => {
  const t = Math.max(0, Math.ceil(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

const MUTED = { color: "#9AA6B2" };

/**
 * Full-screen view while riding: big, glanceable numbers for a sweaty rider a
 * metre from the screen. Only the essentials, in the brand's dark palette.
 */
export function WorkoutDashboard(p: Props) {
  const step = p.steps[p.index];
  const next = p.steps[p.index + 1];
  const scaled = (w: number) => Math.round((w * (1 + p.offset / 100)) / 5) * 5;
  const diff = p.live.power !== undefined ? p.live.power - p.target : null;
  const onTarget = diff !== null && Math.abs(diff) <= Math.max(5, p.target * 0.05);
  const stepStart = p.steps.slice(0, p.index).reduce((n, s) => n + s.seconds, 0);
  const stepProgress = step ? Math.min(1, (p.elapsed - stepStart) / step.seconds) : 1;
  const maxW = Math.max(...p.steps.map((s) => s.watts), 1);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-asphalt px-4 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] text-chalk"
      role="dialog"
      aria-label="Workout dashboard"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="label" style={MUTED}>
          Step {p.index + 1} of {p.steps.length}
        </span>
        <div className="flex gap-2">
          {p.onMini && (
            <button onClick={p.onMini} className="rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: p.miniOpen ? "#2A323D" : "#1E242C" }}>
              {p.miniOpen ? "Mini player on" : "Mini player"}
            </button>
          )}
          <button onClick={p.onMinimise} className="rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: "#1E242C" }}>
            Minimise
          </button>
        </div>
      </div>

      <div className="grid flex-1 gap-3 landscape:grid-cols-2">
        {/* Section and countdown */}
        <section className="flex flex-col justify-center gap-1 rounded-3xl p-4" style={{ background: "#1A1F26" }}>
          <div className="display text-[22px] leading-tight">{step?.label}</div>
          <div className={`display leading-none tabular-nums ${step?.work ? "text-signal" : ""}`} style={{ fontSize: "clamp(48px, min(22vw, 20vh), 140px)" }}>
            {clock(p.remaining)}
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: "#2A323D" }}>
            <div className="h-full rounded-full bg-chalk" style={{ width: `${stepProgress * 100}%` }} />
          </div>
          <div className="flex justify-between text-[14px]" style={MUTED}>
            <span>{clock(p.elapsed)} ridden</span>
            <span>{clock(p.total - p.elapsed)} to go</span>
          </div>
        </section>

        {/* Power */}
        <section className="grid grid-cols-2 gap-3 landscape:grid-cols-3">
          <div className="flex flex-col justify-center rounded-3xl p-4 landscape:p-3" style={{ background: "#1A1F26" }}>
            <div className="label" style={MUTED}>
              Target
            </div>
            <div className="display leading-none tabular-nums" style={{ fontSize: "clamp(36px, min(14vw, 11vh), 88px)" }}>
              {p.target}
            </div>
            <div className="text-[13px]" style={MUTED}>
              watts{p.offset ? ` (${p.offset > 0 ? "+" : ""}${p.offset}%)` : ""}
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-3xl p-4 landscape:p-3" style={{ background: onTarget ? "#123524" : "#1A1F26" }}>
            <div className="label" style={MUTED}>
              Power
            </div>
            <div className="display leading-none tabular-nums" style={{ fontSize: "clamp(36px, min(14vw, 11vh), 88px)" }}>
              {p.live.power ?? "–"}
            </div>
            <div className="text-[13px] font-semibold" style={{ color: onTarget ? "#5CC28A" : diff === null ? "#9AA6B2" : "#FF6A1A" }}>
              {diff === null ? "no power yet" : onTarget ? "on target" : diff < 0 ? `${-diff} W low` : `${diff} W high`}
            </div>
          </div>
          {[
            ["Cadence", p.live.cadence !== undefined ? Math.round(p.live.cadence) : null, "rpm"],
            ["Heart rate", p.live.hr ?? null, "bpm"],
            ["Step avg", p.stepAvg, "W"],
            ["Next", next ? scaled(next.watts) : null, next ? `W · ${clock(next.seconds)}` : "finish"],
          ].map(([label, value, unit]) => (
            <div key={label as string} className="rounded-3xl px-4 py-3 landscape:py-2" style={{ background: "#1A1F26" }}>
              <div className="label" style={MUTED}>
                {label}
              </div>
              <div className="display text-[32px] leading-tight tabular-nums landscape:text-[26px]">{value ?? "–"}</div>
              <div className="text-[12px]" style={MUTED}>
                {unit}
              </div>
            </div>
          ))}
        </section>
      </div>

      {/* Workout profile: where you are */}
      <svg viewBox={`0 0 ${p.total} 100`} preserveAspectRatio="none" className="h-16 w-full shrink-0 landscape:h-8" aria-label="Workout profile">
        {p.steps.map((s, i) => {
          const x = p.steps.slice(0, i).reduce((n, q) => n + q.seconds, 0);
          const h = Math.max(8, (s.watts / maxW) * 100);
          const fill = i < p.index ? "#4A5562" : i === p.index ? "#FF6A1A" : s.work ? "#C2410C" : "#2A323D";
          return <rect key={i} x={x} y={100 - h} width={Math.max(1, s.seconds - p.total * 0.002)} height={h} fill={fill} />;
        })}
        <line x1={p.elapsed} x2={p.elapsed} y1={0} y2={100} stroke="#F3F5F7" strokeWidth={p.total * 0.004} />
      </svg>

      {p.error && <p className="text-[14px] font-semibold" style={{ color: "#FF6A1A" }}>{p.error}</p>}

      <div className="grid grid-cols-[auto_1fr_auto_auto] gap-2">
        <button onClick={() => p.onOffset(-5)} className="h-14 w-14 rounded-2xl text-[16px] font-semibold landscape:h-12" style={{ background: "#1E242C" }} aria-label="Targets down 5%">
          −5%
        </button>
        {p.trainer ? (
          <button onClick={p.onToggle} className="h-14 rounded-2xl bg-signal-ink text-[18px] font-semibold text-white">
            {p.running ? "Pause" : "Resume"}
          </button>
        ) : (
          <button onClick={p.onConnect} className="h-14 rounded-2xl bg-signal-ink text-[18px] font-semibold text-white">
            Connect trainer
          </button>
        )}
        <button onClick={p.onSkip} className="h-14 rounded-2xl px-4 text-[15px] font-semibold" style={{ background: "#1E242C" }}>
          Skip
        </button>
        <button onClick={() => p.onOffset(5)} className="h-14 w-14 rounded-2xl text-[16px] font-semibold" style={{ background: "#1E242C" }} aria-label="Targets up 5%">
          +5%
        </button>
      </div>
    </div>
  );
}
