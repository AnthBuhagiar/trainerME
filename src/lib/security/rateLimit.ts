/**
 * A small in-memory limiter (one server process): at most `limit` hits per
 * `windowMs` for each key. Enough to stop a flood from one client; not shared
 * between processes.
 */

const buckets = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.delete(key); // keep insertion order = last use, for the cap below
  buckets.set(key, recent);
  if (buckets.size > MAX_KEYS) buckets.delete(buckets.keys().next().value!);
  return true;
}

/** The client's address as Caddy passes it on (first X-Forwarded-For entry), for keying limits. */
export function clientKey(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/** For tests. */
export function resetRateLimits(): void {
  buckets.clear();
}
