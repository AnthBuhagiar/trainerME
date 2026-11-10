import { NextResponse } from "next/server";
import { currentAthlete } from "@/lib/data/store";
import { allow, clientKey } from "@/lib/security/rateLimit";

/**
 * Guards for API routes: rate limits and capped request bodies.
 */

/** Too many of `name` from this rider (signed in) or client (not signed in) in the window: a 429 to return, else null. */
export function rateLimited(name: string, req: Request, limit: number, windowMs: number): NextResponse | null {
  const who = currentAthlete() ?? clientKey(req);
  if (allow(`${name}:${who}`, limit, windowMs)) return null;
  return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429, headers: { "retry-after": String(Math.ceil(windowMs / 1000)) } });
}

export class BodyTooLarge extends Error {
  constructor(public limit: number) {
    super(`Request body over ${limit} bytes.`);
  }
}

/**
 * The request's JSON body, read no further than `maxBytes` (refused at once
 * when Content-Length says it's bigger). Throws BodyTooLarge, or SyntaxError
 * for bad JSON.
 */
export async function readJsonBody<T>(req: Request, maxBytes: number): Promise<T> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLarge(maxBytes);
  const reader = req.body?.getReader();
  if (!reader) return JSON.parse("") as T;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new BodyTooLarge(maxBytes);
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
}

/** A 413 for an oversized body, a 400 for anything else unreadable. */
export function badBody(e: unknown): NextResponse {
  if (e instanceof BodyTooLarge) return NextResponse.json({ error: "That's too much data for one request." }, { status: 413 });
  return NextResponse.json({ error: "That request couldn't be read." }, { status: 400 });
}
