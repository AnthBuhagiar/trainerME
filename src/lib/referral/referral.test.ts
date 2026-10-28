import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, test } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-referral-"));
process.env.TRAINERME_DATA_DIR = dir;
process.env.SESSION_SECRET = "test-secret";

const store = await import("@/lib/data/store");
const backup = await import("@/lib/data/backup");
const r = await import("@/lib/referral/referral");

afterAll(() => {
  delete process.env.SESSION_SECRET;
  fs.rmSync(dir, { recursive: true, force: true });
});

/** A rider with a folder, as after signing in. */
function join(id: number): string {
  store.runAsAthlete(id, () => store.writeJson("terms.json", {}));
  return r.ensureReferralCode(id);
}

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("referral codes", () => {
  test("codes are 4 characters from an alphabet with no look-alikes or vowels", () => {
    for (const bad of "01OIL AEU") expect(r.CODE_ALPHABET).not.toContain(bad);
    const code = join(1);
    expect(code).toMatch(/^[23456789BCDFGHJKMNPQRSTVWXYZ]{4}$/);
    expect(r.ensureReferralCode(1)).toBe(code); // stable
    expect(r.codeFor(1)).toBe(code);
  });

  test("typed codes are tidied: case, spaces and dashes", () => {
    expect(r.normalizeCode(" bc-d2 ")).toBe("BCD2");
    expect(r.normalizeCode("BC0D")).toBeNull();
    expect(r.normalizeCode("BCD")).toBeNull();
    expect(r.normalizeCode(42)).toBeNull();
  });

  test("a code already taken (or retired) is never handed out again", () => {
    const picks = ["B", "B", "B", "B", "C", "C", "C", "C"];
    const at = (ch: string) => r.CODE_ALPHABET.indexOf(ch);
    let i = 0;
    const fake = () => at(picks[i++ % picks.length]);
    store.runAsAthlete(50, () => store.writeJson("terms.json", {}));
    store.runAsAthlete(51, () => store.writeJson("terms.json", {}));
    expect(r.ensureReferralCode(50, fake)).toBe("BBBB");
    i = 0;
    expect(r.ensureReferralCode(51, fake)).toBe("CCCC");
    r.retireCode(50);
    expect(r.ownerOfCode("BBBB")).toBeNull();
    store.runAsAthlete(52, () => store.writeJson("terms.json", {}));
    const next = [..."BBBBDDDD"];
    let j = 0;
    expect(r.ensureReferralCode(52, () => at(next[j++]))).toBe("DDDD");
  });

  test("a new rider records who recommended them, once, and never themselves", () => {
    const code = join(2);
    join(3);
    expect(r.recordReferrer(3, "ZZZZ")).toBe("unknown-code");
    expect(r.recordReferrer(2, code)).toBe("own-code");
    expect(r.recordReferrer(3, code.toLowerCase())).toBe("saved");
    expect(r.referredBy(3)).toBe(code);
    expect(r.recordReferrer(3, r.codeFor(1))).toBe("already-set");
  });

  test("a rider who has started paying can't add a recommender", () => {
    join(4);
    r.recordSubscriptionPeriod(4, d("2027-01-01"), d("2027-02-01"), d("2027-01-01"));
    expect(r.recordReferrer(4, r.codeFor(1))).toBe("already-paid");
  });

  test("Settings shows counts only, and joining isn't the same as subscribing", () => {
    const s = r.referralSummary(2, d("2027-01-01"));
    expect(s).toMatchObject({ joined: 1, active: 0, freeUntil: null, lifetime: false, reminder: null });
    expect(JSON.stringify(s)).not.toContain('"3"'); // no athlete ids
  });

  test("six subscribed: a free year, renewed while they stay, paid again when they leave, free again at six", () => {
    const code = join(10);
    const refs = [11, 12, 13, 14, 15, 16];
    for (const id of refs) {
      join(id);
      r.recordReferrer(id, code);
    }
    for (const id of refs.slice(0, 5)) r.recordSubscriptionPeriod(id, d("2027-01-01"), d("2028-06-01"), d("2027-01-01"));
    expect(r.isFreeFromReferrals(10, d("2027-01-01"))).toBe(false); // five isn't six
    r.recordSubscriptionPeriod(16, d("2027-01-01"), d("2028-06-01"), d("2027-01-01"));
    expect(r.isFreeFromReferrals(10, d("2027-01-02"))).toBe(true);
    expect(r.referralSummary(10, d("2027-06-01")).freeUntil).toBe("2028-01-01T00:00:00.000Z");
    // All six still subscribed when the year ends: renewed.
    expect(r.referralSummary(10, d("2028-03-01")).freeUntil).toBe("2029-01-01T00:00:00.000Z");
    // They've all gone by the next check: paying again.
    expect(r.isFreeFromReferrals(10, d("2029-01-02"))).toBe(false);
    expect(r.referralSummary(10, d("2029-01-02")).freeUntil).toBeNull();
    // Back to six: a new free year from that day.
    for (const id of refs) r.recordSubscriptionPeriod(id, d("2029-03-01"), d("2029-04-01"), d("2029-03-01"));
    expect(r.isFreeFromReferrals(10, d("2029-03-02"))).toBe(true);
    expect(r.referralSummary(10, d("2029-03-02")).freeUntil).toBe("2030-03-01T00:00:00.000Z");
  });

  test("in the last month of a free year, short of six, a reminder once a week", () => {
    // Rider 10's free year runs to 2030-03-01; its riders left on 2029-04-01.
    expect(r.referralSummary(10, d("2030-01-15")).reminder).toBeNull(); // not the last month yet
    const due = r.referralSummary(10, d("2030-02-05")).reminder;
    expect(due).toEqual({ needed: 6, freeUntil: "2030-03-01T00:00:00.000Z" });
    r.markReminderSeen(10, d("2030-02-05"));
    expect(r.referralSummary(10, d("2030-02-08")).reminder).toBeNull();
    expect(r.referralSummary(10, d("2030-02-12")).reminder).not.toBeNull();
  });

  test("a yearly subscriber's free year starts when their paid year ends", () => {
    const code = join(50);
    r.recordSubscriptionPeriod(50, d("2027-01-01"), d("2028-01-01"), d("2027-01-01"));
    for (let id = 51; id <= 56; id++) {
      join(id);
      r.recordReferrer(id, code);
      r.recordSubscriptionPeriod(id, d("2027-03-01"), d("2029-03-01"), d("2027-03-01"));
    }
    expect(r.isFreeFromReferrals(50, d("2027-06-01"))).toBe(false); // still in the year they paid for
    expect(r.isFreeFromReferrals(50, d("2028-06-01"))).toBe(true);
    expect(r.referralSummary(50, d("2028-06-01")).freeUntil).toBe("2029-01-01T00:00:00.000Z");
  });

  test("a referral who rides free through their own referrals still counts as subscribed", () => {
    const top = join(30);
    const middle = join(31);
    r.recordReferrer(31, top);
    for (let id = 41; id <= 46; id++) {
      join(id);
      r.recordReferrer(id, middle);
      r.recordSubscriptionPeriod(id, d("2027-01-01"), d("2027-12-01"), d("2027-01-01"));
    }
    for (let id = 32; id <= 36; id++) {
      join(id);
      r.recordReferrer(id, top);
      r.recordSubscriptionPeriod(id, d("2027-01-01"), d("2027-12-01"), d("2027-01-01"));
    }
    // 31 never paid, but is free: with 32–36 that's six for rider 30.
    expect(r.isFreeFromReferrals(31, d("2027-02-01"))).toBe(true);
    expect(r.isFreeFromReferrals(30, d("2027-02-01"))).toBe(true);
  });

  test("six riders with 2 years each (breaks allowed): free for life, even after they leave", () => {
    const code = join(60);
    for (let id = 61; id <= 66; id++) {
      join(id);
      r.recordReferrer(id, code);
      r.recordSubscriptionPeriod(id, d("2027-01-01"), d("2028-01-01"), d("2027-01-01"));
      r.recordSubscriptionPeriod(id, d("2028-04-01"), d("2029-04-01"), d("2028-04-01")); // a 3-month break
    }
    expect(r.referralSummary(60, d("2029-02-01")).lifetime).toBe(false); // 22 months so far
    expect(r.referralSummary(60, d("2029-03-15")).longTerm).toBe(0);
    const s = r.referralSummary(60, d("2029-04-01"));
    expect(s).toMatchObject({ lifetime: true, longTerm: 6, reminder: null });
    expect(r.isFreeFromReferrals(60, d("2040-01-01"))).toBe(true);
  });

  test("months add up across breaks and overlaps count once", () => {
    const rec = {
      periods: [
        { start: "2027-01-01T00:00:00.000Z", end: "2027-07-01T00:00:00.000Z", source: "paid" as const },
        { start: "2027-06-01T00:00:00.000Z", end: "2027-08-01T00:00:00.000Z", source: "referral" as const },
        { start: "2028-01-01T00:00:00.000Z", end: "2028-02-01T00:00:00.000Z", source: "paid" as const },
      ],
    };
    expect(r.subscribedMonths(rec, "2030-01-01T00:00:00.000Z")).toBeCloseTo(8, 0);
    expect(r.activeAt(rec, "2027-07-15T00:00:00.000Z")).toBe(true);
    expect(r.activeAt(rec, "2027-09-01T00:00:00.000Z")).toBe(false);
  });

  test("referral records stay out of backups and can't be restored", () => {
    const files = store.runAsAthlete(3, () => Object.keys(backup.createBackup().files));
    expect(files).not.toContain(r.REFERRAL_FILE);
    expect(backup.isSafePath(r.REFERRAL_FILE)).toBe(false);
  });

  test("months add without spilling over short months", () => {
    expect(r.addMonths("2027-01-31T00:00:00.000Z", 1).slice(0, 10)).toBe("2027-02-28");
    expect(r.addMonths("2028-02-29T00:00:00.000Z", 12).slice(0, 10)).toBe("2029-02-28");
  });
});

describe("plans", async () => {
  const plans = await import("@/lib/billing/plans");
  test("the same 5.99 a month or 59 a year, in each rider's own currency", () => {
    const show = (country: string | null) => plans.PLANS.map((p) => plans.formatPrice(p.priceMinor, plans.currencyForCountry(country)));
    expect(show("AU")).toEqual(["A$5.99", "A$59"]);
    expect(show("US")).toEqual(["US$5.99", "US$59"]);
    expect(show("GB")).toEqual(["£5.99", "£59"]);
    expect(show("de")).toEqual(["€5.99", "€59"]);
    expect(show("NZ")).toEqual(["NZ$5.99", "NZ$59"]);
    expect(show("JP")).toEqual(["US$5.99", "US$59"]); // elsewhere: US dollars
    expect(show(null)).toEqual(["A$5.99", "A$59"]); // unknown: the home market
    expect(plans.formatPrice(plans.yearlySavingMinor(), plans.CURRENCIES.GBP)).toBe("£12.88");
  });
});
