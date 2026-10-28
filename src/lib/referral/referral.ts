import crypto from "node:crypto";
import { athleteIds } from "@/lib/auth/owner";
import { readJson, readServerJson, runAsAthlete, writeJson, writeServerJson } from "@/lib/data/store";

/**
 * Referral codes (F1, F2 in docs/product-strategy.md).
 *
 * Every rider on a hosted copy gets a 4-character code. A new rider can enter
 * a code when they sign up (or once, later, in Settings). When six riders who
 * joined with a code have paid for a subscription, the code's owner gets 12
 * months free, applied automatically by billing. Each block of six more paid
 * referrals earns another 12 months.
 *
 * Where it's kept:
 * - data/referral-codes.json (server-wide): code → athlete id. A deleted
 *   rider's code stays as null so it's never handed to someone else.
 * - data/athletes/<id>/referral.json: the code this rider joined with, when
 *   they first paid, and whether that payment has already counted towards a
 *   reward; for the code's owner, how long they ride free.
 *
 * Riders only ever see counts, never who used their code (ethics policy:
 * no rider's data is shown to another). referral.json is left out of backups
 * and can't be restored, so nobody can write their own referral history.
 *
 * Until billing exists nothing calls recordFirstPayment, so no referral counts
 * as paid yet and nobody is free.
 */

/** No 0/O, 1/I/L (look alike) and no vowels (so codes don't spell words). */
export const CODE_ALPHABET = "23456789BCDFGHJKMNPQRSTVWXYZ";
export const CODE_LENGTH = 4;
export const REFERRALS_FOR_REWARD = 6;
export const REWARD_MONTHS = 12;
/** Flip when subscriptions go live and billing calls recordFirstPayment. */
export const BILLING_OPEN = false;

const INDEX = "referral-codes.json";
export const REFERRAL_FILE = "referral.json";
/** Carries a code typed on the sign-in page through the Strava round trip. */
export const REFERRAL_COOKIE = "hp_ref";

interface CodeIndex {
  codes: Record<string, number | null>;
}

export interface ReferralRecord {
  /** The code this rider entered when they joined. Set once, never changed. */
  referredBy?: string;
  referredAt?: string;
  /** Their first successful subscription payment (set by billing). */
  firstPaidAt?: string;
  /** That payment has been used towards their recommender's reward. */
  counted?: boolean;
  /** As a recommender: subscription is free until this date. */
  freeUntil?: string;
  /** As a recommender: how many 12-month rewards they've earned. */
  rewardsEarned?: number;
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

/** Save who recommended this rider. Only once, never their own code, and not after they've started paying. */
export function recordReferrer(athleteId: number, input: unknown, now = new Date()): RecordResult {
  const owner = ownerOfCode(input);
  if (owner === null) return "unknown-code";
  if (owner === athleteId) return "own-code";
  const record = readRecord(athleteId);
  if (record.referredBy) return "already-set";
  if (record.firstPaidAt) return "already-paid";
  writeRecord(athleteId, { ...record, referredBy: normalizeCode(input)!, referredAt: now.toISOString() });
  return "saved";
}

export function referredBy(athleteId: number): string | null {
  return readRecord(athleteId).referredBy ?? null;
}

/**
 * For billing: this rider's first successful payment. Their recommender's
 * reward is settled straight after, so it's applied without anyone asking.
 */
export function recordFirstPayment(athleteId: number, now = new Date()): void {
  const record = readRecord(athleteId);
  if (record.firstPaidAt) return;
  writeRecord(athleteId, { ...record, firstPaidAt: now.toISOString() });
  const owner = record.referredBy ? ownerOfCode(record.referredBy) : null;
  if (owner !== null) settleRewards(owner, now);
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
 * Turn every six paid, not-yet-counted referrals into 12 more free months.
 * A reward stays earned even if those riders later cancel or leave.
 */
export function settleRewards(athleteId: number, now = new Date()): ReferralRecord {
  const code = codeFor(athleteId);
  const mine = readRecord(athleteId);
  if (!code) return mine;
  const waiting = referralsOf(code)
    .filter((r) => r.record.firstPaidAt && !r.record.counted)
    .sort((a, b) => a.record.firstPaidAt!.localeCompare(b.record.firstPaidAt!));
  let changed = false;
  while (waiting.length >= REFERRALS_FOR_REWARD) {
    for (const r of waiting.splice(0, REFERRALS_FOR_REWARD)) writeRecord(r.athleteId, { ...r.record, counted: true });
    const from = mine.freeUntil && mine.freeUntil > now.toISOString() ? mine.freeUntil : now.toISOString();
    mine.freeUntil = addMonths(from, REWARD_MONTHS);
    mine.rewardsEarned = (mine.rewardsEarned ?? 0) + 1;
    changed = true;
  }
  if (changed) writeRecord(athleteId, mine);
  return mine;
}

/** For billing: is this rider's subscription free right now? */
export function isFreeFromReferrals(athleteId: number, now = new Date()): boolean {
  const until = readRecord(athleteId).freeUntil;
  return !!until && until > now.toISOString();
}

export interface ReferralSummary {
  code: string;
  /** Riders who joined with the code (paid or not). */
  joined: number;
  /** Paid referrals counting towards the next reward (0–5). */
  towardsNext: number;
  freeUntil: string | null;
  /** Who recommended this rider, if anyone (their code only). */
  referredBy: string | null;
  /** Can this rider still enter a recommender's code? */
  canEnterCode: boolean;
}

/** What Settings shows: counts only, never who. */
export function referralSummary(athleteId: number, now = new Date()): ReferralSummary {
  const code = ensureReferralCode(athleteId);
  const mine = readRecord(athleteId);
  const referrals = referralsOf(code);
  return {
    code,
    joined: referrals.length,
    towardsNext: referrals.filter((r) => r.record.firstPaidAt && !r.record.counted).length,
    freeUntil: mine.freeUntil && mine.freeUntil > now.toISOString() ? mine.freeUntil : null,
    referredBy: mine.referredBy ?? null,
    canEnterCode: !mine.referredBy && !mine.firstPaidAt,
  };
}
