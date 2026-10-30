import { readJson, writeJson } from "@/lib/data/store";

/**
 * The days a rider opened the app (UTC dates, last 120 only), so the owner can
 * see how many riders are active (F4, admin dashboard). Nothing about what they
 * did that day is kept, and it's deleted with the rest of their folder.
 */
export const SEEN_FILE = "seen.json";
const KEEP_DAYS = 120;

export interface Seen {
  days: string[];
}

export function loadSeen(): Seen {
  const s = readJson<Seen>(SEEN_FILE, { days: [] });
  return { days: Array.isArray(s.days) ? s.days.filter((d) => typeof d === "string") : [] };
}

/** Note today for the signed-in rider; writes at most once a day. */
export function recordSeen(now = new Date()): void {
  const today = now.toISOString().slice(0, 10);
  const { days } = loadSeen();
  if (days.includes(today)) return;
  writeJson(SEEN_FILE, { days: [...days, today].sort().slice(-KEEP_DAYS) } satisfies Seen);
}
