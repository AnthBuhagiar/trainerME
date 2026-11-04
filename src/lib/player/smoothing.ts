/** Readings kept for the shown power: the last few seconds. */
export type Readings = { at: number; watts: number }[];

/**
 * Power as shown while riding: the average of the trainer's readings over the
 * last `windowMs` (3 s, like a bike computer), so the number doesn't jump
 * second to second. The ride still records every reading as it came.
 */
export function threeSecondPower(readings: Readings, at: number, watts: number, windowMs = 3000): { readings: Readings; power: number } {
  const kept = [...readings.filter((r) => at - r.at < windowMs), { at, watts }];
  return { readings: kept, power: Math.round(kept.reduce((n, r) => n + r.watts, 0) / kept.length) };
}
