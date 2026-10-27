/**
 * The Hour Ring: 60 ticks, one per minute of the hour, filling clockwise from
 * 12 o'clock. Orange ticks are where your hour power is now; the sky-blue tick
 * is your goal (the same blue marks the goal everywhere in the app), with a
 * faint blue track for the distance still to go. Grey shows the likely range.
 * The goal sits at 50 minutes, leaving room to show going past it.
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
const GOAL_TICK = 50;
const ORANGE = "#FF6A1A";
const SKY = "#38BDF8";

export function tickIndex(value: number, start: number, goal: number): number {
  const t = goal > start ? (value - start) / (goal - start) : 1;
  return Math.max(0, Math.min(TICKS - 1, Math.round(t * GOAL_TICK)));
}

export function HourRing({ hourPower, low, high, start, goal, size = 220 }: Props) {
  const now = tickIndex(hourPower, start, goal);
  const rangeFrom = tickIndex(low, start, goal);
  const rangeTo = tickIndex(high, start, goal);
  const c = 100;
  const outer = 94;
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
    const isGoal = i === GOAL_TICK;
    const isNow = i === now && now > 0;
    let stroke = "#2A323D";
    let opacity = 1;
    if (i >= rangeFrom && i <= rangeTo) stroke = "#5B6672";
    if (i > now && i < GOAL_TICK) {
      stroke = SKY; // still to go
      opacity = 0.38;
    }
    if (i > 0 && i <= now) stroke = ORANGE;
    if (isGoal) {
      stroke = SKY;
      opacity = 1;
    }
    const len = isGoal || isNow ? 17 : 11;
    const r1 = outer - len;
    return (
      <line
        key={i}
        x1={c + r1 * Math.cos(a)}
        y1={c + r1 * Math.sin(a)}
        x2={c + outer * Math.cos(a)}
        y2={c + outer * Math.sin(a)}
        stroke={stroke}
        strokeOpacity={opacity}
        strokeWidth={isGoal || isNow ? 4.5 : 2.6}
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
        {size >= 180 && (
          <div className="label" style={{ color: "#9AA6B2" }}>
            Hour power
          </div>
        )}
        <div className="flex items-baseline gap-1">
          <span className="display" style={{ fontSize: size * 0.3, lineHeight: 1 }}>
            {Math.round(hourPower)}
          </span>
          <span className="display" style={{ fontSize: size * 0.08 }}>
            W
          </span>
        </div>
        {size >= 180 && (
          <div className="text-[13px]" style={{ color: "#9AA6B2" }}>
            likely {Math.round(low)}–{Math.round(high)}
          </div>
        )}
      </div>
    </div>
  );
}
