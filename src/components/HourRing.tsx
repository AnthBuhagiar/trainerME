/**
 * The Hour Ring: a clock face from 0 W at 12 o'clock round to 350 W at 11:59,
 * 60 ticks of about 6 W each, the same scale for every rider. Orange ticks are
 * where your hour power is now; the sky-blue tick is your goal (the same blue
 * marks the goal everywhere in the app), with a faint blue track for the
 * distance still to go. Grey shows the likely range.
 */

interface Props {
  hourPower: number;
  low: number;
  high: number;
  goal: number;
  size?: number;
}

const TICKS = 60;
/** The top of the scale: 350 W sits at 11:59. */
export const RING_MAX_WATTS = 350;
const ORANGE = "#FF6A1A";
const SKY = "#38BDF8";

/** Which tick a wattage lands on: 0 W is 12 o'clock, 350 W (or more) the last tick before it. */
export function tickIndex(watts: number): number {
  return Math.max(0, Math.min(TICKS - 1, Math.round((watts / RING_MAX_WATTS) * TICKS)));
}

export function HourRing({ hourPower, low, high, goal, size = 220 }: Props) {
  const now = tickIndex(hourPower);
  const goalTick = tickIndex(goal);
  const rangeFrom = tickIndex(low);
  const rangeTo = tickIndex(high);
  const c = 100;
  const outer = 94;
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const a = (i / TICKS) * 2 * Math.PI - Math.PI / 2;
    const isGoal = i === goalTick;
    const isNow = i === now && now > 0;
    let stroke = "#2A323D";
    let opacity = 1;
    if (i >= rangeFrom && i <= rangeTo) stroke = "#5B6672";
    if (i > now && i < goalTick) {
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

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        role="img"
        aria-label={`Hour ring: ${Math.round(hourPower)} watts now, goal ${goal} watts, on a scale of 0 to ${RING_MAX_WATTS}`}
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
