import crypto from "node:crypto";
import { readJson, writeJson } from "@/lib/data/store";

/**
 * Credential files (Strava and Garmin tokens) encrypted at rest with
 * AES-256-GCM. The key comes from TRAINERME_SECRET_KEY: 32 bytes as 64 hex
 * characters or base64 (`openssl rand -hex 32`). TRAINERME_SECRET_KEY_PREVIOUS
 * (comma-separated) still decrypts files written before a key change, which are
 * re-encrypted with the current key when read.
 *
 * On disk: { "enc": "aes-256-gcm", "kid": <key id>, "iv", "tag", "data" } (base64).
 * A plaintext file (written before encryption, or with no key set) is read as it
 * is and encrypted on that first read once a key is set. With no key, files stay
 * plaintext (0600) and the server logs a setup warning: set the key to encrypt.
 * Nothing here ever logs a token or a file's contents.
 */

interface Sealed {
  enc: "aes-256-gcm";
  kid: string;
  iv: string;
  tag: string;
  data: string;
}

function parseKey(value: string): Buffer {
  const v = value.trim();
  const key = /^[0-9a-f]{64}$/i.test(v) ? Buffer.from(v, "hex") : Buffer.from(v, "base64");
  if (key.length !== 32) throw new Error("TRAINERME_SECRET_KEY must be 32 bytes: 64 hex characters or base64 (openssl rand -hex 32).");
  return key;
}

/** Short id of a key, stored with the ciphertext so a key change is recognised. */
export const keyId = (key: Buffer) => crypto.createHash("sha256").update(key).digest("hex").slice(0, 12);

interface Keys {
  current: Buffer | null;
  all: Map<string, Buffer>;
}

/**
 * A badly formed key (a pasted placeholder, say) must not take the app down:
 * it's ignored, with a clear error in the server log (never the key itself),
 * and tokens are handled as with no key until it's fixed.
 */
const badKeys = new Set<string>();
function tryParseKey(value: string, name: string): Buffer | null {
  try {
    return parseKey(value);
  } catch {
    if (!badKeys.has(name)) {
      badKeys.add(name);
      console.error(`Hour Power: ${name} isn't a valid key (it must be 64 hex characters: openssl rand -hex 32), so it's ignored until it's fixed.`);
    }
    return null;
  }
}

function keys(): Keys {
  const all = new Map<string, Buffer>();
  const current = process.env.TRAINERME_SECRET_KEY ? tryParseKey(process.env.TRAINERME_SECRET_KEY, "TRAINERME_SECRET_KEY") : null;
  if (current) all.set(keyId(current), current);
  for (const old of (process.env.TRAINERME_SECRET_KEY_PREVIOUS ?? "").split(",").filter((s) => s.trim())) {
    const k = tryParseKey(old, "TRAINERME_SECRET_KEY_PREVIOUS");
    if (k) all.set(keyId(k), k);
  }
  return { current, all };
}

let warned = false;
function warnNoKey() {
  if (warned || !process.env.SESSION_SECRET) return; // single-rider copies (codespace, own computer) needn't
  warned = true;
  console.warn("Hour Power: TRAINERME_SECRET_KEY is not set, so Strava and Garmin tokens are stored unencrypted. Add one (openssl rand -hex 32) to encrypt them.");
}

export function seal(value: unknown, key: Buffer): Sealed {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { enc: "aes-256-gcm", kid: keyId(key), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

export function open<T>(sealed: Sealed, key: Buffer): T {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(sealed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(sealed.tag, "base64"));
  const text = Buffer.concat([decipher.update(Buffer.from(sealed.data, "base64")), decipher.final()]).toString("utf8");
  return JSON.parse(text) as T;
}

const isSealed = (v: unknown): v is Sealed => !!v && typeof v === "object" && (v as Sealed).enc === "aes-256-gcm" && typeof (v as Sealed).data === "string";

/** A credential file from this request's data folder, decrypted (and encrypted on the spot if it was still plaintext). */
export function readSecretJson<T>(rel: string, fallback: T): T {
  const stored = readJson<unknown>(rel, null);
  if (stored === null) return fallback;
  const { current, all } = keys();
  if (!isSealed(stored)) {
    // Plaintext from before encryption: move it over now if a key is set.
    if (current) writeJson(rel, seal(stored, current));
    else warnNoKey();
    return stored as T;
  }
  const key = all.get(stored.kid);
  if (!key) {
    console.error(`Hour Power: ${rel} is encrypted with a key this server doesn't have (key id ${stored.kid}). Set TRAINERME_SECRET_KEY (or _PREVIOUS) to that key, or the rider connects again.`);
    return fallback;
  }
  try {
    const value = open<T>(stored, key);
    if (current && stored.kid !== keyId(current)) writeJson(rel, seal(value, current)); // re-encrypt with the current key
    return value;
  } catch {
    console.error(`Hour Power: ${rel} could not be decrypted (damaged or tampered with).`);
    return fallback;
  }
}

/** Write a credential file to this request's data folder, encrypted when a key is set. */
export function writeSecretJson(rel: string, value: unknown): void {
  const { current } = keys();
  if (!current) warnNoKey();
  writeJson(rel, current && value !== null ? seal(value, current) : value);
}
