import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { multiUser, readJson, runAsAthlete, writeJson } from "@/lib/data/store";

/**
 * The key the Hour Power watch app sends instead of a sign-in cookie. Made on
 * Settings and typed once into the watch app's settings in Garmin Connect.
 * Only its hash is kept (watch.json, in the rider's own folder), so a copy of
 * the data can't be used to read anyone's plan; making a new key or turning it
 * off stops the old one at once.
 *
 * Format: "<athlete id>-<secret>" hosted, "me-<secret>" single-rider. The id
 * only says which folder to check; the secret (80 random bits) is the proof.
 */

const FILE = "watch.json";
const LOCAL = "me";

interface WatchRecord {
  hash: string;
  createdAt: string;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Easy to type on a phone: lower-case letters and digits, no 0/o or 1/l, in groups of four. */
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
function secret(): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < 16; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out.match(/.{4}/g)!.join("-");
}

/** A new key for the signed-in rider (or the single rider). Shown once; replaces any earlier key. */
export function createWatchKey(athleteId: number | null, now = new Date()): string {
  const s = secret();
  writeJson(FILE, { hash: sha256(s), createdAt: now.toISOString() } satisfies WatchRecord);
  return `${athleteId ?? LOCAL}-${s}`;
}

export function revokeWatchKey(): void {
  writeJson(FILE, null);
}

export function watchKeyCreated(): string | null {
  return readJson<WatchRecord | null>(FILE, null)?.createdAt ?? null;
}

function matches(s: string): boolean {
  const record = readJson<WatchRecord | null>(FILE, null);
  if (!record?.hash) return false;
  const a = Buffer.from(sha256(s), "hex");
  const b = Buffer.from(record.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Who a watch key belongs to: the athlete id hosted, 0 single-rider, null when
 * it isn't a current key. Spaces and capitals are forgiven (typed on a phone).
 */
export function athleteForWatchKey(key: string | null | undefined): number | null {
  const clean = (key ?? "").trim().toLowerCase().replace(/\s+/g, "");
  const m = /^(\d+|me)-([a-z0-9]{4}(?:-[a-z0-9]{4}){3})$/.exec(clean);
  if (!m) return null;
  const [, who, s] = m;
  if (multiUser()) {
    if (who === LOCAL) return null;
    const id = Number(who);
    if (!Number.isSafeInteger(id) || id <= 0) return null;
    return runAsAthlete(id, () => matches(s)) ? id : null;
  }
  return who === LOCAL && matches(s) ? 0 : null;
}

/** The key from an "Authorization: Bearer …" header. */
export function bearer(request: Request): string | null {
  const h = request.headers.get("authorization") ?? "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7) : null;
}
