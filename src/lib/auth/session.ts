/**
 * Sign-in for a hosted copy of the app. Off unless SESSION_SECRET is set (the
 * codespace is already private behind GitHub). The rider signs in with Strava;
 * the first athlete to sign in owns the app and nobody else can. The session
 * is a signed cookie, checked in middleware with Web Crypto (no file access).
 */

export const SESSION_COOKIE = "hp_session";
export const SESSION_DAYS = 180;

export function authEnabled(): boolean {
  return !!process.env.SESSION_SECRET;
}

const enc = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createSession(athleteId: number, secret = process.env.SESSION_SECRET!, now = Date.now()): Promise<string> {
  const payload = `${athleteId}.${now + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

/** The athlete id if the cookie is genuine and unexpired, else null. */
export async function verifySession(value: string | undefined, secret = process.env.SESSION_SECRET!, now = Date.now()): Promise<number | null> {
  if (!value || !secret) return null;
  const [id, expires, sig] = value.split(".");
  if (!id || !expires || !sig || Number(expires) < now) return null;
  const expected = await hmac(secret, `${id}.${expires}`);
  // Constant-time-ish comparison; both are fixed-length hex.
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? Number(id) : null;
}
