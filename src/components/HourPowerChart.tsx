"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

const month = new Intl.DateTimeFormat("en-AU", { month: "short" });
const full = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });

export function HourPowerChart({ points, goal, goalName }: { points: ChartPoint[]; goal?: number; goalName?: string }) {
  const [range, setRange] = useState(1);
  const last = points.length ? Date.parse(points[points.length - 1].date) : 0;
  const data = points
    .map((p) => ({ t: Date.parse(p.date), hp: Math.round(p.hourPower), band: [Math.round(p.low), Math.round(p.high)] as [number, number] }))
    .filter((p) => last - p.t <= RANGES[range].days * 86_400_000);
  if (data.length < 2) return <p className="text-[15px] text-muted">Not enough rides in this range yet.</p>;
  const lo = Math.min(...data.map((d) => d.band[0]), goal ?? Infinity);
  const hi = Math.max(...data.map((d) => d.band[1]), goal ?? 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1" role="group" aria-label="Time range">
        {RANGES.map((r, i) => (
          <button
            key={r.label}
            onClick={() => setRange(i)}
            aria-pressed={range === i}
            className={`h-9 flex-1 rounded-full text-[14px] font-semibold ${range === i ? "bg-asphalt text-chalk dark:bg-chalk dark:text-asphalt" : "border border-line"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t) => month.format(new Date(t))}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={[Math.floor((lo - 5) / 5) * 5, Math.ceil((hi + 5) / 5) * 5]}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={56}
              unit=" W"
            />
            <Area dataKey="band" stroke="none" fill="var(--muted)" fillOpacity={0.18} isAnimationActive={false} activeDot={false} />
            <Line dataKey="hp" stroke="var(--foreground)" strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
            {goal && (
              <ReferenceLine
                y={goal}
                stroke="var(--signal-ink)"
                strokeDasharray="4 4"
              />
            )}
            <Tooltip
              cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = active && payload?.[0]?.payload;
                if (!p) return null;
                return (
                  <div className="rounded-xl border border-line bg-card px-3 py-2 text-[13px] shadow-sm">
                    <div className="text-muted">{full.format(new Date(p.t))}</div>
                    <div className="font-semibold">{p.hp} W hour power</div>
                    <div className="text-muted">
                      likely {p.band[0]}–{p.band[1]} W
                    </div>
                  </div>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[13px] text-muted">
        Line: estimated hour power after each ride. Shaded: the likely range.{goal ? ` Dashed: ${goal} W, the hour power ${goalName ?? "your goal"} needs.` : ""}
      </p>
    </div>
  );
}
