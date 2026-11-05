import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { multiUser, readServerJson, runAsAthlete, writeServerJson } from "@/lib/data/store";
import { createWatchKey } from "@/lib/watch/key";

/**
 * Linking a watch from the phone, as with signing in to a TV: the watch asks for
 * a short code and shows it; the rider, signed in on their phone, enters it on
 * Settings; the watch, checking back every few seconds, then gets its watch key.
 * Nothing is typed on the watch or in Garmin Connect, and the watch never signs in.
 *
 * Pending links are server-wide (the watch doesn't know whose it is yet), each with
 * the code and the watch's own poll token stored as hashes. A code works once and
 * lapses after ten minutes. The key is made only when the watch collects it.
 */

const FILE = "watch-links.json";
export const LINK_MINUTES = 10;
/** Room for this many watches linking at once; more is refused rather than growing the file. */
const MAX_PENDING = 500;
/** No 0/O, 1/I/L: read off a watch and typed on a phone. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

interface PendingLink {
  codeHash: string;
  tokenHash: string;
  expiresAt: number;
  /** Set when the rider enters the code: their athlete id, or 0 single-rider. */
  athlete?: number;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

function same(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

function load(now: number): PendingLink[] {
  return readServerJson<PendingLink[]>(FILE, []).filter((l) => l.expiresAt > now);
}

function save(links: PendingLink[]): void {
  writeServerJson(FILE, links);
}

/** "K7P42Q" from whatever was typed: "k7p-42q", "K7P 42Q". */
export function normaliseCode(typed: string): string {
  return typed.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** As the watch shows it. */
export const showCode = (code: string) => `${code.slice(0, 3)}-${code.slice(3)}`;

/** A new code for a watch, and the token only that watch holds to collect its key. */
export function startLink(now = Date.now()): { code: string; token: string; expiresIn: number } | null {
  const links = load(now);
  if (links.length >= MAX_PENDING) return null;
  let code = "";
  do {
    const bytes = randomBytes(6);
    code = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  } while (links.some((l) => l.codeHash === sha256(code)));
  const token = randomBytes(24).toString("hex");
  links.push({ codeHash: sha256(code), tokenHash: sha256(token), expiresAt: now + LINK_MINUTES * 60_000 });
  save(links);
  return { code: showCode(code), token, expiresIn: LINK_MINUTES * 60 };
}

/**
 * The signed-in rider enters the code their watch shows. `athleteId` is null
 * single-rider. False when no watch is waiting with that code.
 */
export function confirmLink(typed: string, athleteId: number | null, now = Date.now()): boolean {
  const code = normaliseCode(typed);
  if (code.length !== 6) return false;
  const links = load(now);
  const link = links.find((l) => l.athlete === undefined && same(l.codeHash, sha256(code)));
  if (!link) return false;
  link.athlete = athleteId ?? 0;
  // Time for the watch to check back, even if the code was entered at the last moment.
  link.expiresAt = Math.max(link.expiresAt, now + 2 * 60_000);
  save(links);
  return true;
}

/**
 * The watch checks back with its token: "waiting" until the code is entered,
 * then its watch key (once), or "expired" when there's no such link any more.
 */
export function collectLink(token: string | null, now = Date.now()): { status: "waiting" } | { status: "linked"; key: string } | { status: "expired" } {
  if (!token || !/^[0-9a-f]{48}$/.test(token)) return { status: "expired" };
  const links = load(now);
  const link = links.find((l) => same(l.tokenHash, sha256(token)));
  if (!link) return { status: "expired" };
  if (link.athlete === undefined) return { status: "waiting" };
  save(links.filter((l) => l !== link));
  const id = link.athlete;
  if (multiUser()) {
    if (id <= 0) return { status: "expired" };
    return { status: "linked", key: runAsAthlete(id, () => createWatchKey(id)) };
  }
  return { status: "linked", key: createWatchKey(null) };
}
