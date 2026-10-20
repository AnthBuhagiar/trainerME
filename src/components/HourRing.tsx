/**
 * The Hour Ring: 60 ticks, one per minute of the hour. White ticks fill from
 * the starting hour power towards the goal, grey shows the likely range, and
 * one orange tick at 12 o'clock is the goal.
 */

interface Props {
  hourPower: number;
  low: number;
  high: number;
  start: number;
  goal: number;
  size?: number;
}

const TICKS = 60;

function tickIndex(value: number, start: number, goal: number): number {
  const t = (value - start) / (goal - start);
  return Math.max(0, Math.min(TICKS, Math.round(t * TICKS)));
}

export function HourRing({ hourPower, low, high, start, goal, size = 220 }: Props) {
  const filled = tickIndex(hourPower, start, goal);
  const rangeFrom = tickIndex(low, start, goal);
  const rangeTo = tickIndex(high, start, goal);
  const c = 100;
  const outer = 94;
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
    const isGoal = i === 0;
    const len = isGoal ? 16 : 11;
    const r1 = outer - len;
    let stroke = "#2A323D";
    if (i >= rangeFrom && i < rangeTo) stroke = "#5B6672";
    if (i > 0 && i <= filled) stroke = "#F3F5F7";
    if (isGoal) stroke = "#FF6A1A";
    return (
      <line
        key={i}
        x1={c + r1 * Math.cos(a)}
        y1={c + r1 * Math.sin(a)}
        x2={c + outer * Math.cos(a)}
        y2={c + outer * Math.sin(a)}
        stroke={stroke}
        strokeWidth={isGoal ? 4.5 : 2.6}
        strokeLinecap="round"
      />
    );
  });
  const pct = Math.round(((hourPower - start) / (goal - start)) * 100);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        role="img"
        aria-label={`Hour ring: ${Math.round(hourPower)} watts, ${pct}% of the way from ${start} to your ${goal} watt goal`}
        width={size}
        height={size}
        viewBox="0 0 200 200"
      >
        {ticks}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-chalk">
        <div className="label" style={{ color: "#9AA6B2" }}>
          Hour power
        </div>
        <div className="flex items-baseline gap-1">
          <span className="display" style={{ fontSize: size * 0.3, lineHeight: 1 }}>
            {Math.round(hourPower)}
          </span>
          <span className="display" style={{ fontSize: size * 0.08 }}>
            W
          </span>
        </div>
        <div className="text-[13px]" style={{ color: "#9AA6B2" }}>
          likely {Math.round(low)}–{Math.round(high)}
        </div>
      </div>
    </div>
  );
}
