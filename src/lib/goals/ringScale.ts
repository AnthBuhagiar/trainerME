/** The Hour Ring's goal: the rider's target, or without one, an example 20% above today. */
export function ringGoal(target: number | undefined, hourPower: number) {
  return { goal: target ?? Math.ceil((hourPower * 1.2) / 5) * 5, example: target === undefined };
}
