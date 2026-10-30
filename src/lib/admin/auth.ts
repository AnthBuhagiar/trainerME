import crypto from "node:crypto";

/** A long random ADMIN_TOKEN, compared in constant time. */
export function tokenMatches(header: string | null, token = process.env.ADMIN_TOKEN): boolean {
  if (!token || token.length < 32 || !header?.startsWith("Bearer ")) return false;
  const a = crypto.createHash("sha256").update(header.slice(7)).digest();
  const b = crypto.createHash("sha256").update(token).digest();
  return crypto.timingSafeEqual(a, b);
}
