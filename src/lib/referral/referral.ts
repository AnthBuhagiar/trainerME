import crypto from "node:crypto";
import { athleteIds } from "@/lib/auth/owner";
import { readJson, readServerJson, runAsAthlete, writeJson, writeServerJson } from "@/lib/data/store";

/**
 * Referral codes and rewards (F1, F2 in docs/product-strategy.md).
 *
 * Every rider on a hosted copy gets a 4-character code. A new rider can enter
 * a code when they sign up (or once, later, in Settings, before they pay).
 *
 * The reward:
 * - Six riders who joined with your code are subscribed → your subscription is
 *   free for a year. It starts straight away, or when the time you've already
 *   paid for runs out (so a yearly subscriber isn't paying and free at once).
 * - At the end of each free year it renews if six of them are still
 *   subscribed. If not, payment starts again, and a new free year starts the
 *   day you're back to six (replace the riders who left).
 * - In the last month of a free year, if you're short, a reminder pops up once
 *   a week saying how many riders you need.
 * - Six of your riders have each been subscribed for 24 months in total
 *   (breaks are fine) → free for life, even if they later leave.
 * - "Subscribed" means any active subscription, including riders who are free
 *   through their own referrals.
 *
 * Where it's kept:
 * - data/referral-codes.json (server-wide): code → athlete id. A deleted
 *   rider's code stays as null so it's never handed to someone else.
 * - data/athletes/<id>/referral.json: the code this rider joined with, their
 *   subscription periods (paid by billing, or free from referrals), and their
 *   own reward state.
 *
 * Riders only ever see counts, never who used their code (ethics policy:
 * no rider's data is shown to another). referral.json is left out of backups
 * and can't be restored, so nobody can write their own referral history.
 *
 * Rewards are worked out from the subscription periods whenever they're
 * needed (settleRewards), so no scheduled job is required. Until billing
 * exists nothing calls recordSubscriptionPeriod, so nobody counts as
 * subscribed and nobody is free.
 */

/** No 0/O, 1/I/L (look alike) and no vowels (so codes don't spell words). */
export const CODE_ALPHABET = "23456789BCDFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 4;
/** Active referrals for a free year. */
export const REFERRALS_FOR_REWARD = 6;
export const REWARD_MONTHS = 12;
/** Months each of six referrals must have been subscribed (in total) for free for life. */
export const LIFETIME_MONTHS = 24;
/** The reminder shows in the last this-many days of a free year, at most once a week. */
export const REMINDER_DAYS = 30;
export const REMINDER_EVERY_DAYS = 7;
/** Flip when subscriptions go live and billing calls recordSubscriptionPeriod. */
export const BILLING_OPEN = false;

const INDEX = "referral-codes.json";
export const REFERRAL_FILE = "referral.json";
/** Carries a code typed on the sign-in page through the Strava round trip. */
export const REFERRAL_COOKIE = "hp_ref";

const FOREVER = "9999-12-31T00:00:00.000Z";
const DAY_MS = 86_400_000;

interface CodeIndex {
  codes: Record<string, number | null>;
}

/** A stretch of time with an active subscription: paid (from billing) or free from referrals. */
export interface Period {
  start: string;
  end: string;
  source: "paid" | "referral";
}

export interface ReferralRecord {
  /** The code this rider entered when they joined. Set once, never changed. */
  referredBy?: string;
  referredAt?: string;
  periods?: Period[];
  /** End of the current (or last) free year from referrals. */
  freeUntil?: string;
  /** The last free year ended without six active referrals: paying until back to six. */
  lapsedAt?: string;
  lifetime?: boolean;
  lifetimeSince?: string;
  lastReminderAt?: string;
}

const loadIndex = (): CodeIndex => readServerJson<CodeIndex>(INDEX, { codes: {} });

/** Upper case, without spaces or dashes; null unless it could be a code. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const code = input.trim().toUpperCase().replace(/[\s-]/g, "");
  return code.length === CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

export function randomCode(random: (max: number) => number = crypto.randomInt): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[random(CODE_ALPHABET.length)];
  return code;
}

/** This rider's code, if they have one. */
export function codeFor(athleteId: number): string | null {
  for (const [code, id] of Object.entries(loadIndex().codes)) if (id === athleteId) return code;
  return null;
}

/** Give the rider a code if they don't have one yet. Codes are never reused, even after an account is deleted. */
export function ensureReferralCode(athleteId: number, random?: (max: number) => number): string {
  const existing = codeFor(athleteId);
  if (existing) return existing;
  const index = loadIndex();
  let code = randomCode(random);
  for (let tries = 0; code in index.codes; tries++) {
    if (tries > 1000) throw new Error("No referral codes left.");
    code = randomCode(random);
  }
  index.codes[code] = athleteId;
  writeServerJson(INDEX, index);
  return code;
}

/** The rider who owns a live code, or null (unknown, malformed or retired). */
export function ownerOfCode(input: unknown): number | null {
  const code = normalizeCode(input);
  return code ? (loadIndex().codes[code] ?? null) : null;
}

/** On account deletion: the code stops working and is never given out again. */
export function retireCode(athleteId: number): void {
  const index = loadIndex();
  let changed = false;
  for (const [code, id] of Object.entries(index.codes)) {
    if (id === athleteId) {
      index.codes[code] = null;
      changed = true;
    }
  }
  if (changed) writeServerJson(INDEX, index);
}

const readRecord = (athleteId: number) => runAsAthlete(athleteId, () => readJson<ReferralRecord>(REFERRAL_FILE, {}));
const writeRecord = (athleteId: number, record: ReferralRecord) => runAsAthlete(athleteId, () => writeJson(REFERRAL_FILE, record));

export type RecordResult = "saved" | "unknown-code" | "own-code" | "already-set" | "already-paid";

const hasPaid = (r: ReferralRecord) => !!r.periods?.some((p) => p.source === "paid");

/** Save who recommended this rider. Only once, never their own code, and not after they've started paying. */
export function recordReferrer(athleteId: number, input: unknown, now = new Date()): RecordResult {
  const owner = ownerOfCode(input);
  if (owner === null) return "unknown-code";
  if (owner === athleteId) return "own-code";
  const record = readRecord(athleteId);
  if (record.referredBy) return "already-set";
  if (hasPaid(record)) return "already-paid";
  writeRecord(athleteId, { ...record, referredBy: normalizeCode(input)!, referredAt: now.toISOString() });
  return "saved";
}

export function referredBy(athleteId: number): string | null {
  return readRecord(athleteId).referredBy ?? null;
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString();
}

/** Subscribed at this moment (paid, or free from referrals). */
export function activeAt(record: ReferralRecord, at: string): boolean {
  return !!record.periods?.some((p) => p.start <= at && at < p.end);
}

/** Calendar months from a to b: 1 Jan → 1 Mar is 2, 1 Jan → 15 Jan about 0.45. */
function monthsBetween(a: number, b: number): number {
  const x = new Date(a);
  const y = new Date(b);
  const whole = (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + (y.getUTCMonth() - x.getUTCMonth());
  const anchor = Date.parse(addMonths(x.toISOString(), whole));
  const next = Date.parse(addMonths(x.toISOString(), whole + (b >= anchor ? 1 : -1)));
  return whole + (b - anchor) / Math.abs(next - anchor);
}

/** Total calendar months subscribed up to `at`, overlaps counted once and breaks allowed. */
export function subscribedMonths(record: ReferralRecord, at: string): number {
  const end = Date.parse(at);
  const spans = (record.periods ?? [])
    .map((p) => [Date.parse(p.start), Math.min(Date.parse(p.end), end)] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0]);
  const merged: [number, number][] = [];
  for (const [a, b] of spans) {
    const last = merged[merged.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else merged.push([a, b]);
  }
  return merged.reduce((sum, [a, b]) => sum + monthsBetween(a, b), 0);
}

/** When the time this rider has already paid (or been given) runs out, from `at`. */
function coveredUntil(record: ReferralRecord, at: string): string {
  let until = at;
  for (let moved = true; moved; ) {
    moved = false;
    for (const p of record.periods ?? []) {
      if (p.start <= until && p.end > until) {
        until = p.end;
        moved = true;
      }
    }
  }
  return until;
}

/**
 * For billing: a stretch this rider has paid for (a month or a year). Their
 * recommender's reward is settled straight after, so it's applied without
 * anyone asking.
 */
export function recordSubscriptionPeriod(athleteId: number, start: Date, end: Date, now = new Date()): void {
  const record = readRecord(athleteId);
  writeRecord(athleteId, { ...record, periods: [...(record.periods ?? []), { start: start.toISOString(), end: end.toISOString(), source: "paid" }] });
  const owner = record.referredBy ? ownerOfCode(record.referredBy) : null;
  if (owner !== null) settleRewards(owner, now);
  settleRewards(athleteId, now);
}

interface Referral {
  athleteId: number;
  record: ReferralRecord;
}

/** Everyone who joined with this code (scans the athlete folders: fine at this size). */
function referralsOf(code: string): Referral[] {
  return athleteIds()
    .map((athleteId) => ({ athleteId, record: readRecord(athleteId) }))
    .filter((r) => r.record.referredBy === code);
}

/**
 * Bring this rider's reward up to date at `now`: renew or end free years
 * that have finished, start a new one if six referrals are subscribed, and
 * grant free for life. Referrals are settled first, so a referral who is free
 * through their own referrals counts as subscribed.
 */
export function settleRewards(athleteId: number, now = new Date(), seen = new Set<number>()): ReferralRecord {
  const mine = readRecord(athleteId);
  if (seen.has(athleteId)) return mine;
  seen.add(athleteId);
  const code = codeFor(athleteId);
  if (!code || mine.lifetime) return mine;
  const refs = referralsOf(code).map((r) => ({ ...r, record: settleRewards(r.athleteId, now, seen) }));
  const at = now.toISOString();
  const activeCount = (t: string) => refs.filter((r) => activeAt(r.record, t)).length;
  const before = JSON.stringify(mine);
  const periods = (mine.periods ??= []);

  // Finished free years: renew while six are still subscribed on the day it ends.
  while (mine.freeUntil && mine.freeUntil <= at && !mine.lapsedAt) {
    const ended = mine.freeUntil;
    if (activeCount(ended) >= REFERRALS_FOR_REWARD) {
      mine.freeUntil = addMonths(ended, REWARD_MONTHS);
      periods.push({ start: ended, end: mine.freeUntil, source: "referral" });
    } else mine.lapsedAt = ended;
  }

  // Six riders with 24 months each: free for life.
  if (refs.filter((r) => subscribedMonths(r.record, at) >= LIFETIME_MONTHS - 1e-9).length >= REFERRALS_FOR_REWARD) {
    const from = coveredUntil(mine, at);
    mine.lifetime = true;
    mine.lifetimeSince = at;
    mine.lapsedAt = undefined;
    periods.push({ start: from, end: FOREVER, source: "referral" });
  } else if (!(mine.freeUntil && mine.freeUntil > at) && activeCount(at) >= REFERRALS_FOR_REWARD) {
    // Not in a free year, and six are subscribed: a new free year, from when what's paid runs out.
    const from = coveredUntil(mine, at);
    mine.freeUntil = addMonths(from, REWARD_MONTHS);
    mine.lapsedAt = undefined;
    periods.push({ start: from, end: mine.freeUntil, source: "referral" });
  }

  if (!periods.length) delete mine.periods;
  if (JSON.stringify(mine) !== before) writeRecord(athleteId, mine);
  return mine;
}

/** For billing: is this rider's subscription free right now? */
export function isFreeFromReferrals(athleteId: number, now = new Date()): boolean {
  const at = now.toISOString();
  return !!settleRewards(athleteId, now).periods?.some((p) => p.source === "referral" && p.start <= at && at < p.end);
}

export interface ReferralSummary {
  code: string;
  /** Riders who joined with the code. */
  joined: number;
  /** Of those, subscribed now. */
  active: number;
  /** Of those, subscribed 24 months or more in total (towards free for life). */
  longTerm: number;
  /** A free year from referrals that hasn't ended (it may start after time already paid for). */
  freeUntil: string | null;
  lifetime: boolean;
  /** Who recommended this rider, if anyone (their code only). */
  referredBy: string | null;
  /** Can this rider still enter a recommender's code? */
  canEnterCode: boolean;
  /** In the last month of a free year without six subscribed: riders still needed. Once a week. */
  reminder: { needed: number; freeUntil: string } | null;
}

/** What Settings and Today show: counts only, never who. */
export function referralSummary(athleteId: number, now = new Date()): ReferralSummary {
  const code = ensureReferralCode(athleteId);
  const mine = settleRewards(athleteId, now);
  const at = now.toISOString();
  const refs = referralsOf(code);
  const active = refs.filter((r) => activeAt(r.record, at)).length;
  const freeUntil = mine.freeUntil && mine.freeUntil > at && !mine.lifetime ? mine.freeUntil : null;
  const inLastMonth = !!freeUntil && Date.parse(freeUntil) - now.getTime() <= REMINDER_DAYS * DAY_MS;
  const weekSinceLast = !mine.lastReminderAt || now.getTime() - Date.parse(mine.lastReminderAt) >= REMINDER_EVERY_DAYS * DAY_MS;
  return {
    code,
    joined: refs.length,
    active,
    longTerm: refs.filter((r) => subscribedMonths(r.record, at) >= LIFETIME_MONTHS - 1e-9).length,
    freeUntil,
    lifetime: !!mine.lifetime,
    referredBy: mine.referredBy ?? null,
    canEnterCode: !mine.referredBy && !hasPaid(mine),
    reminder: inLastMonth && weekSinceLast && active < REFERRALS_FOR_REWARD ? { needed: REFERRALS_FOR_REWARD - active, freeUntil: freeUntil! } : null,
  };
}

/** The rider closed this week's reminder. */
export function markReminderSeen(athleteId: number, now = new Date()): void {
  writeRecord(athleteId, { ...readRecord(athleteId), lastReminderAt: now.toISOString() });
}
