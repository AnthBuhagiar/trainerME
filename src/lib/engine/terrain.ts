/**
 * Rolling routes: on a course of short climbs and descents the road, not the
 * rider, decides when power is high. Power and heart rate stop lining up
 * (HR stays high over each crest) and the hardest 20 minutes fall wherever the
 * hills are, so these rides tell us less about fitness.
 */

/** Variability index on per-minute power at or above which a ride counts as rolling. */
export const ROLLING_VI = 1.12;
/** Weight a rolling ride's steady minutes get in the heart-rate efficiency average. */
export const ROLLING_EFFICIENCY_WEIGHT = 0.5;

/** Normalised-style power (4th-power mean) over mean power, from per-minute averages. */
export function variabilityIndex(minutes: [number, number][]): number | null {
  const p = minutes.map((m) => m[0]).filter((x) => x > 0);
  if (p.length < 20) return null;
  const mean = p.reduce((a, b) => a + b, 0) / p.length;
  const np = (p.reduce((a, b) => a + b ** 4, 0) / p.length) ** 0.25;
  return np / mean;
}

export function isRolling(minutes: [number, number][] | undefined): boolean {
  const vi = variabilityIndex(minutes ?? []);
  return vi !== null && vi >= ROLLING_VI;
}
