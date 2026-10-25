/**
 * The training week runs Sunday to Saturday (ending 11:59 pm Saturday).
 * Days of the week are numbered Monday = 0 ... Sunday = 6 everywhere in the
 * planner (usual-week slots, placement); this file maps them onto dates.
 */

const DAY = 86_400_000;

/** JavaScript day number the week starts on: 0 = Sunday. */
export const WEEK_STARTS_ON = 0;

export const addDays = (date: string, n: number) => new Date(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** Start of the week (Sunday) containing the date. */
export function weekStartOf(date: string): string {
  const dow = new Date(`${date.slice(0, 10)}T00:00:00Z`).getUTCDay();
  return addDays(date, -((dow - WEEK_STARTS_ON + 7) % 7));
}

/** Last day of the week (Saturday). */
export const weekEndOf = (weekStart: string) => addDays(weekStart, 6);

/** Position of a Monday-based weekday inside the week: Sunday 0 ... Saturday 6. */
export function dayIndex(weekday: number): number {
  return (weekday + 1 - WEEK_STARTS_ON + 7) % 7;
}

/** The date of a Monday-based weekday in the week starting weekStart. */
export function dateOf(weekStart: string, weekday: number): string {
  return addDays(weekStart, dayIndex(weekday));
}

/** Monday-based weekday (0 = Monday ... 6 = Sunday) of a date. */
export function weekdayOf(date: string): number {
  return (new Date(`${date.slice(0, 10)}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** True on the last day of the week, when the week's recap is shown. */
export const isLastDayOfWeek = (date: string) => weekEndOf(weekStartOf(date)) === date.slice(0, 10);
