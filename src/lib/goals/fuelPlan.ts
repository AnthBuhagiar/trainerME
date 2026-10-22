/**
 * Event-day fuelling for a long ride (docs/training-science.md, E7): carb
 * loading before, a pre-event meal, then an hourly intake split into
 * everyday food and drink. Amounts scale with body weight and finish time.
 */

export interface FuelPlan {
  /** Days -2 and -1: grams of carbohydrate per day. */
  loadingPerDay: [number, number];
  /** Breakfast 3 h before the start, grams of carbohydrate. */
  breakfast: number;
  gramsPerHour: number;
  totalGrams: number;
  /** Fluid per hour (ml) and in total (litres). */
  fluidPerHour: [number, number];
  fluidTotal: [number, number];
  sodiumPerHour: [number, number];
  /** What one hour looks like. */
  hour: { item: string; grams: number }[];
  /** Feeding rhythm. */
  every: string;
}

const round10 = (n: number) => Math.round(n / 10) * 10;

export function eventFuelPlan(weightKg: number, seconds: number): FuelPlan {
  const hours = seconds / 3600;
  // 90 g/h for efforts past ~2.5 h, using a glucose + fructose mix; less for shorter events.
  const gramsPerHour = hours > 2.5 ? 90 : hours > 1.5 ? 60 : 30;
  const hour =
    gramsPerHour === 90
      ? [
          { item: "Bottle of sports drink (2:1 glucose:fructose)", grams: 40 },
          { item: "Gel", grams: 25 },
          { item: "Bar, rice cake or chews", grams: 25 },
        ]
      : gramsPerHour === 60
        ? [
            { item: "Bottle of sports drink", grams: 35 },
            { item: "Gel or chews", grams: 25 },
          ]
        : [{ item: "Bottle of sports drink", grams: 30 }];
  return {
    loadingPerDay: [round10(8 * weightKg), round10(10 * weightKg)],
    breakfast: round10(2 * weightKg),
    gramsPerHour,
    totalGrams: round10(gramsPerHour * hours),
    fluidPerHour: [500, 750],
    fluidTotal: [Math.round(0.5 * hours * 10) / 10, Math.round(0.75 * hours * 10) / 10],
    sodiumPerHour: [300, 600],
    hour,
    every: "Something every 20 minutes, starting in the first 20 minutes. Don't wait to feel hungry.",
  };
}
