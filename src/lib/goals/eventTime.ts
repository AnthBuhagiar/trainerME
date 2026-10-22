/**
 * Rough finish-time model for an event from distance, climbing and power.
 * Without a route file, climbing is spread over 40% of the distance with an
 * equal amount of descending. Good enough for a realism check; a GPX import
 * replaces it with the real profile.
 */

const G = 9.81;

export interface RiderPhysics {
  massKg: number; // rider + bike + kit
  cda: number; // m^2; ~0.24 in a bunch, ~0.32 solo on the hoods
  crr: number;
  rho: number; // air density kg/m^3
}

export const DEFAULT_PHYSICS: Omit<RiderPhysics, "massKg"> = { cda: 0.28, crr: 0.005, rho: 1.15 };

export function speedFor(power: number, grade: number, p: RiderPhysics, vmax = 15.3): number {
  const theta = Math.atan(grade);
  let lo = 0.3;
  let hi = 30;
  for (let i = 0; i < 60; i++) {
    const v = (lo + hi) / 2;
    const need = (v * (p.massKg * G * (Math.sin(theta) + p.crr * Math.cos(theta)) + 0.5 * p.rho * p.cda * v * v)) / 0.975;
    if (need > power) hi = v;
    else lo = v;
  }
  return Math.min(lo, vmax);
}

/** Moving time in seconds at an average target power. */
export function eventMovingSeconds(distanceKm: number, climbingM: number, power: number, physics: RiderPhysics): number {
  const dist = distanceKm * 1000;
  const up = 0.4 * dist;
  const down = 0.4 * dist;
  const flat = dist - up - down;
  const grade = up > 0 ? climbingM / up : 0;
  return (
    up / speedFor(power * 1.05, grade, physics) +
    flat / speedFor(power, 0, physics) +
    down / speedFor(power * 0.5, -grade, physics)
  );
}

/**
 * Share of hour power a rider can average for a long event: ~0.86 at 3 h
 * falling to ~0.78 at 7 h, scaled by durability (0.94-1.00). Calibrated on
 * Bowral 2025: ~145 W average over 6 h 13 moving on an hour power of ~180 W.
 */
export function sustainableFraction(hours: number, durability = 0.97): number {
  const base = Math.max(0.7, Math.min(0.88, 0.92 - 0.02 * hours));
  return base * (durability / 0.97);
}

export interface EventPrediction {
  /** Average power the rider can hold for the event (W). */
  power: number;
  seconds: number;
}

/** Iterate: duration depends on power, sustainable power depends on duration. */
export function predictEvent(distanceKm: number, climbingM: number, hourPower: number, physics: RiderPhysics, durability = 0.97): EventPrediction {
  let hours = 5;
  let power = hourPower * sustainableFraction(hours, durability);
  for (let i = 0; i < 6; i++) {
    const s = eventMovingSeconds(distanceKm, climbingM, power, physics);
    hours = s / 3600;
    power = hourPower * sustainableFraction(hours, durability);
  }
  return { power: Math.round(power), seconds: eventMovingSeconds(distanceKm, climbingM, power, physics) };
}

/** Average power needed to finish in the target time. */
export function powerForTarget(distanceKm: number, climbingM: number, targetSeconds: number, physics: RiderPhysics): number {
  let lo = 40;
  let hi = 500;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (eventMovingSeconds(distanceKm, climbingM, mid, physics) > targetSeconds) lo = mid;
    else hi = mid;
  }
  return Math.round(hi);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m === 60 ? `${h + 1} h 00` : `${h} h ${String(m).padStart(2, "0")}`;
}
