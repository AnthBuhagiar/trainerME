"use client";

import { useState } from "react";

export interface ChartPoint {
  date: string;
  hourPower: number;
  low: number;
  high: number;
}

const RANGES = [
  { label: "3M", days: 91 },
  { label: "6M", days: 182 },
  { label: "1Y", days: 365 },
  { label: "All", days: Infinity },
];

/** Drawing size; the chart scales to the card's width. */
const W = 340;
const H = 224;
const LEFT = 48;
const RIGHT = 8;
const TOP = 8;
const BOTTOM = 22;

const month = new Intl.DateTimeFormat("en-AU", { month: "short" });
const full = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });

export function HourPowerChart({ points, goal }: { points: ChartPoint[]; goal?: number }) {
  const [range, setRange] = useState(1);
  const [active, setActive] = useState<number | null>(null);
  const last = points.length ? Date.parse(points[points.length - 1].date) : 0;
  const data = points
    .map((p) => ({ t: Date.parse(p.date), hp: Math.round(p.hourPower), band: [Math.round(p.low), Math.round(p.high)] as [number, number] }))
    .filter((p) => last - p.t <= RANGES[range].days * 86_400_000);
  if (data.length < 2) return <p className="text-[15px] text-muted">Not enough rides in this range yet.</p>;
  const lo = Math.min(...data.map((d) => d.band[0]), goal ?? Infinity);
  const hi = Math.max(...data.map((d) => d.band[1]), goal ?? 0);
  const y0 = Math.floor((lo - 5) / 5) * 5;
  const y1 = Math.ceil((hi + 5) / 5) * 5;
  const t0 = data[0].t;
  const t1 = data[data.length - 1].t;
  const x = (t: number) => LEFT + ((t - t0) / (t1 - t0 || 1)) * (W - LEFT - RIGHT);
  const y = (w: number) => TOP + ((y1 - w) / (y1 - y0)) * (H - TOP - BOTTOM);
  const step = [5, 10, 20, 25, 50, 100].find((s) => (y1 - y0) / s <= 5) ?? 100;
  const yTicks: number[] = [];
  for (let w = Math.ceil(y0 / step) * step; w <= y1; w += step) yTicks.push(w);
  // A label at each month start, skipping any too close to the one before.
  const xTicks: number[] = [];
  for (let d = new Date(t0), m = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); m <= t1; d = new Date(m), m = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()) {
    if (x(m) <= W - 16 && (!xTicks.length || x(m) - x(xTicks[xTicks.length - 1]) >= 36)) xTicks.push(m);
  }
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(d.t).toFixed(1)} ${y(d.hp).toFixed(1)}`).join("");
  const band = [...data.map((d) => `${x(d.t).toFixed(1)},${y(d.band[1]).toFixed(1)}`), ...[...data].reverse().map((d) => `${x(d.t).toFixed(1)},${y(d.band[0]).toFixed(1)}`)].join(" ");
  const p = active !== null ? data[Math.min(active, data.length - 1)] : null;

  // Touch or hover: the ride nearest the finger.
  function pick(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const at = ((e.clientX - box.left) / box.width) * W;
    let best = 0;
    data.forEach((d, i) => {
      if (Math.abs(x(d.t) - at) < Math.abs(x(data[best].t) - at)) best = i;
    });
    setActive(best);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1" role="group" aria-label="Time range">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => {
              setRange(i);
              setActive(null);
            }}
            aria-pressed={range === i}
            className={`h-9 flex-1 rounded-full text-[14px] font-semibold ${range === i ? "bg-asphalt text-chalk dark:bg-chalk dark:text-asphalt" : "border border-line"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-pan-y select-none"
          role="img"
          aria-label={`Hour power from ${data[0].hp} W to ${data[data.length - 1].hp} W`}
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={() => setActive(null)}
        >
          {yTicks.map((w) => (
            <g key={w}>
              <line x1={LEFT} x2={W - RIGHT} y1={y(w)} y2={y(w)} stroke="var(--line)" />
              <text x={LEFT - 6} y={y(w) + 4} textAnchor="end" fontSize={12} fill="var(--muted)">
                {w} W
              </text>
            </g>
          ))}
          {xTicks.map((m) => (
            <text key={m} x={x(m)} y={H - 4} textAnchor="middle" fontSize={12} fill="var(--muted)">
              {month.format(new Date(m))}
            </text>
          ))}
          <polygon points={band} fill="var(--muted)" fillOpacity={0.18} />
          <path d={line} fill="none" stroke="var(--foreground)" strokeWidth={2} strokeLinejoin="round" />
          {goal && <line x1={LEFT} x2={W - RIGHT} y1={y(goal)} y2={y(goal)} stroke="var(--signal-ink)" strokeDasharray="4 4" />}
          {p && (
            <g>
              <line x1={x(p.t)} x2={x(p.t)} y1={TOP} y2={H - BOTTOM} stroke="var(--muted)" />
              <circle cx={x(p.t)} cy={y(p.hp)} r={5} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
            </g>
          )}
        </svg>
        {p && (
          <div
            className="pointer-events-none absolute top-0 rounded-xl border border-line bg-card px-3 py-2 text-[13px] shadow-sm"
            style={x(p.t) > W / 2 ? { right: `${100 - (x(p.t) / W) * 100 + 3}%` } : { left: `${(x(p.t) / W) * 100 + 3}%` }}
          >
            <div className="text-muted">{full.format(new Date(p.t))}</div>
            <div className="font-semibold">{p.hp} W hour power</div>
            <div className="text-muted">
              likely {p.band[0]}–{p.band[1]} W
            </div>
          </div>
        )}
      </div>
      <p className="text-[13px] text-muted">
        Shaded: likely range.{goal ? ` Dashed: ${goal} W goal.` : ""}
      </p>
    </div>
  );
}
