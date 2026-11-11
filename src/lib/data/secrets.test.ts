import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

process.env.TRAINERME_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "hourpower-secrets-"));
const store = await import("@/lib/data/store");
const { readSecretJson, writeSecretJson, keyId } = await import("@/lib/data/secrets");

// Synthetic tokens only: never a real rider's.
const TOKENS = { access_token: "AT-synthetic-123", refresh_token: "RT-synthetic-456", expires_at: 1 };
const KEY = crypto.randomBytes(32).toString("hex");
const OTHER = crypto.randomBytes(32).toString("hex");
const file = () => path.join(store.DATA_DIR, "strava-tokens.json");
const onDisk = () => fs.readFileSync(file(), "utf8");

describe("credential files at rest", () => {
  beforeEach(() => {
    fs.rmSync(store.DATA_DIR, { recursive: true, force: true });
    delete process.env.TRAINERME_SECRET_KEY;
    delete process.env.TRAINERME_SECRET_KEY_PREVIOUS;
  });
  afterEach(() => vi.restoreAllMocks());

  test("are encrypted with the key: no token text on disk, read back intact", () => {
    process.env.TRAINERME_SECRET_KEY = KEY;
    writeSecretJson("strava-tokens.json", TOKENS);
    const raw = onDisk();
    expect(raw).not.toContain("AT-synthetic");
    expect(raw).not.toContain("RT-synthetic");
    expect(JSON.parse(raw)).toMatchObject({ enc: "aes-256-gcm", kid: keyId(Buffer.from(KEY, "hex")) });
    expect(readSecretJson("strava-tokens.json", null)).toEqual(TOKENS);
  });

  test("a plaintext file from before is encrypted on its first read", () => {
    store.writeJson("strava-tokens.json", TOKENS); // as an existing rider's file
    process.env.TRAINERME_SECRET_KEY = KEY;
    expect(readSecretJson("strava-tokens.json", null)).toEqual(TOKENS);
    expect(onDisk()).not.toContain("AT-synthetic");
    expect(readSecretJson("strava-tokens.json", null)).toEqual(TOKENS);
  });

  test("a key change: the previous key still reads, and the file moves to the new key", () => {
    process.env.TRAINERME_SECRET_KEY = OTHER;
    writeSecretJson("strava-tokens.json", TOKENS);
    process.env.TRAINERME_SECRET_KEY = KEY;
    process.env.TRAINERME_SECRET_KEY_PREVIOUS = OTHER;
    expect(readSecretJson("strava-tokens.json", null)).toEqual(TOKENS);
    expect(JSON.parse(onDisk()).kid).toBe(keyId(Buffer.from(KEY, "hex")));
  });

  test("the wrong key or a tampered file reads as not connected, without throwing or logging secrets", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.TRAINERME_SECRET_KEY = OTHER;
    writeSecretJson("strava-tokens.json", TOKENS);
    process.env.TRAINERME_SECRET_KEY = KEY;
    expect(readSecretJson("strava-tokens.json", null)).toBeNull();

    process.env.TRAINERME_SECRET_KEY = OTHER;
    const sealed = JSON.parse(onDisk());
    sealed.data = Buffer.from("x".repeat(40)).toString("base64");
    fs.writeFileSync(file(), JSON.stringify(sealed));
    expect(readSecretJson("strava-tokens.json", null)).toBeNull();
    expect(JSON.stringify(errors.mock.calls)).not.toMatch(/synthetic/);
  });

  test("with no key, files stay readable plaintext (and a hosted server warns once)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.SESSION_SECRET = "hosted";
    try {
      store.runAsAthlete(42, () => {
        writeSecretJson("strava-tokens.json", TOKENS);
        expect(readSecretJson("strava-tokens.json", null)).toEqual(TOKENS);
      });
    } finally {
      delete process.env.SESSION_SECRET;
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/synthetic/);
  });

  test("a badly formed key (a pasted placeholder) doesn't break anything: ignored, logged once, without the key", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.TRAINERME_SECRET_KEY = "<paste the output of: openssl rand>"; // 36 characters, not a key
    expect(() => writeSecretJson("strava-tokens.json", TOKENS)).not.toThrow();
    expect(readSecretJson("strava-tokens.json", null)).toEqual(TOKENS);
    expect(errors).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(errors.mock.calls)).not.toContain("paste the output");
    // Fixed later: the file is encrypted on its next read.
    process.env.TRAINERME_SECRET_KEY = KEY;
    expect(readSecretJson("strava-tokens.json", null)).toEqual(TOKENS);
    expect(onDisk()).not.toContain("AT-synthetic");
  });

    test("data files are 0600 and their folders 0700", () => {
    process.env.TRAINERME_SECRET_KEY = KEY;
    writeSecretJson("strava-tokens.json", TOKENS);
    store.writeJson("rides/1.json", { id: "1" });
    const mode = (p: string) => fs.statSync(p).mode & 0o777;
    expect(mode(file())).toBe(0o600);
    expect(mode(path.join(store.DATA_DIR, "rides", "1.json"))).toBe(0o600);
    expect(mode(store.DATA_DIR)).toBe(0o700);
    expect(mode(path.join(store.DATA_DIR, "rides"))).toBe(0o700);
  });
});
