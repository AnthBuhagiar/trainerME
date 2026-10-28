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

const day = (n: number) => new Date(Date.UTC(2027, 0, n));

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
    r.recordFirstPayment(4, day(1));
    expect(r.recordReferrer(4, r.codeFor(1))).toBe("already-paid");
  });

  test("Settings shows counts only, and joining isn't the same as paying", () => {
    const s = r.referralSummary(2);
    expect(s).toMatchObject({ joined: 1, towardsNext: 0, freeUntil: null });
    expect(JSON.stringify(s)).not.toContain('"3"'); // no athlete ids
  });

  test("six paid referrals earn 12 months free, applied automatically", () => {
    const code = join(10);
    for (let id = 11; id <= 16; id++) {
      join(id);
      r.recordReferrer(id, code);
    }
    for (let id = 11; id <= 15; id++) r.recordFirstPayment(id, day(id));
    expect(r.referralSummary(10, day(20))).toMatchObject({ joined: 6, towardsNext: 5, freeUntil: null });
    expect(r.isFreeFromReferrals(10, day(20))).toBe(false);
    r.recordFirstPayment(16, day(16));
    expect(r.isFreeFromReferrals(10, day(20))).toBe(true);
    const s = r.referralSummary(10, day(20));
    expect(s.towardsNext).toBe(0);
    expect(s.freeUntil?.slice(0, 10)).toBe("2028-01-16");
  });

  test("the reward stays earned if those riders leave, and runs out after 12 months", () => {
    for (let id = 11; id <= 16; id++) {
      r.retireCode(id);
      fs.rmSync(path.join(dir, "athletes", String(id)), { recursive: true, force: true });
    }
    expect(r.isFreeFromReferrals(10, new Date(Date.UTC(2027, 11, 1)))).toBe(true);
    expect(r.isFreeFromReferrals(10, new Date(Date.UTC(2028, 1, 1)))).toBe(false);
  });

  test("the next six add 12 months on from the end of the current free period", () => {
    const code = r.codeFor(10)!;
    for (let id = 21; id <= 26; id++) {
      join(id);
      r.recordReferrer(id, code);
      r.recordFirstPayment(id, new Date(Date.UTC(2027, 5, 1)));
    }
    expect(r.referralSummary(10, new Date(Date.UTC(2027, 5, 2))).freeUntil?.slice(0, 10)).toBe("2029-01-16");
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
