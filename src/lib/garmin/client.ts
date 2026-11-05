import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { dataDir, readJson, writeJson } from "@/lib/data/store";
import { appUrl } from "@/lib/strava/client";

/**
 * Garmin Connect Developer Program client for the athlete of the current
 * request: OAuth 2.0 sign-in with PKCE, then the Training API to put planned
 * rides on the rider's Garmin Connect calendar (and from there their watch or
 * Edge). Tokens live in the athlete's data folder (garmin-tokens.json),
 * git-ignored like all personal data.
 *
 * The addresses below follow Garmin's developer documentation. Garmin changes
 * them now and then: if a call starts failing, compare with the current docs
 * in the developer portal first.
 */

export const GARMIN = {
  authorize: "https://connect.garmin.com/oauth2Confirm",
  token: "https://diauth.garmin.com/di-oauth2-service/oauth/token",
  userId: "https://apis.garmin.com/wellness-api/rest/user/id",
  permissions: "https://apis.garmin.com/wellness-api/rest/user/permissions",
  registration: "https://apis.garmin.com/wellness-api/rest/user/registration",
  workout: "https://apis.garmin.com/workoutportal/workout/v2",
  schedule: "https://apis.garmin.com/training-api/schedule",
};

const TOKENS_FILE = "garmin-tokens.json";
/** The permission a rider grants for workouts to be sent to their calendar. */
export const WORKOUT_PERMISSION = "WORKOUT_IMPORT";

export interface GarminTokens {
  access_token: string;
  refresh_token: string;
  /** Epoch seconds. */
  expires_at: number;
  refresh_expires_at?: number;
  userId?: string;
  permissions?: string[];
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_token_expires_in?: number;
}

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GARMIN_CLIENT_ID;
  const clientSecret = process.env.GARMIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Add GARMIN_CLIENT_ID and GARMIN_CLIENT_SECRET as Codespaces secrets or in .env.local (see README).");
  return { clientId, clientSecret };
}

export function hasGarminCredentials(): boolean {
  return !!process.env.GARMIN_CLIENT_ID && !!process.env.GARMIN_CLIENT_SECRET;
}

export const redirectUri = () => `${appUrl()}/api/garmin/callback`;

/** Cookies kept across the trip to Garmin: the random state and the PKCE verifier. */
export const GARMIN_STATE_COOKIE = "hp_garmin_state";
export const GARMIN_VERIFIER_COOKIE = "hp_garmin_verifier";
/** Where to land after connecting (e.g. back on a workout). */
export const GARMIN_NEXT_COOKIE = "hp_garmin_next";

/** PKCE: a random verifier the browser keeps, and its SHA-256 sent to Garmin. */
export function pkce(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function authorizeUrl(state: string, challenge: string): string {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${GARMIN.authorize}?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<GarminTokens> {
  const { clientId, clientSecret } = credentials();
  const res = await fetch(GARMIN.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...body }),
  });
  if (!res.ok) throw new Error(`Garmin token request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const t = (await res.json()) as TokenResponse;
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expires_at: now + t.expires_in,
    refresh_expires_at: t.refresh_token_expires_in ? now + t.refresh_token_expires_in : undefined,
  };
}

/** Swap the approval code for tokens, then ask Garmin who the rider is and what they allowed. */
export async function exchangeCode(code: string, verifier: string): Promise<GarminTokens> {
  const tokens = await tokenRequest({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri() });
  const auth = { Authorization: `Bearer ${tokens.access_token}` };
  const user = (await (await fetch(GARMIN.userId, { headers: auth })).json().catch(() => ({}))) as { userId?: string };
  const permissions = await fetch(GARMIN.permissions, { headers: auth })
    .then((r) => (r.ok ? (r.json() as Promise<string[]>) : undefined))
    .catch(() => undefined);
  return { ...tokens, userId: user.userId, permissions };
}

export function loadGarminTokens(): GarminTokens | null {
  return readJson<GarminTokens | null>(TOKENS_FILE, null);
}

export function saveGarminTokens(tokens: GarminTokens): void {
  writeJson(TOKENS_FILE, tokens);
}

export function garminConnected(): boolean {
  return !!loadGarminTokens();
}

/** For the send buttons: undefined hides Garmin (no developer keys on this server). */
export function garminStatus(): { connected: boolean; canSend: boolean } | undefined {
  if (!hasGarminCredentials()) return undefined;
  const tokens = loadGarminTokens();
  return { connected: !!tokens, canSend: canSendWorkouts(tokens) };
}

/** Connected but the rider didn't tick the workouts permission on Garmin's page. */
export function canSendWorkouts(tokens = loadGarminTokens()): boolean {
  return !!tokens && (!tokens.permissions || tokens.permissions.includes(WORKOUT_PERMISSION));
}

/** Forget Garmin for this athlete (the tokens and the record of what was sent). */
export function forgetGarmin(): void {
  for (const f of [TOKENS_FILE, SENT_FILE]) fs.rmSync(path.join(dataDir(), f), { force: true });
}

async function accessToken(): Promise<string> {
  const tokens = loadGarminTokens();
  if (!tokens) throw new Error("Garmin isn't connected yet.");
  if (tokens.expires_at - 60 > Date.now() / 1000) return tokens.access_token;
  const refreshed = await tokenRequest({ grant_type: "refresh_token", refresh_token: tokens.refresh_token });
  saveGarminTokens({ ...tokens, ...refreshed });
  return refreshed.access_token;
}

export async function garminCall<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 401) throw new Error("Garmin didn't accept Hour Power's access. Connect Garmin again in Settings.");
  if (res.status === 403) throw new Error("Garmin needs the workouts permission. Connect Garmin again and allow workouts.");
  if (res.status === 429) throw new Error("Garmin is busy. Try again in a few minutes.");
  if (!res.ok) throw new Error(`Garmin request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Does Garmin still accept this athlete's tokens? Used before acting on an unsigned deregistration ping. */
export async function stillConnected(): Promise<boolean> {
  try {
    await garminCall(GARMIN.userId);
    return true;
  } catch (e) {
    return !/didn't accept|not connected|token request failed \((400|401)\)/.test((e as Error).message);
  }
}

/** Tell Garmin to remove Hour Power's access, then forget the tokens. */
export async function disconnectGarmin(): Promise<void> {
  if (loadGarminTokens()) await garminCall(GARMIN.registration, { method: "DELETE" }).catch(() => {});
  forgetGarmin();
}

// ---- What Hour Power has put on the rider's Garmin calendar ----

const SENT_FILE = "garmin-sent.json";

export interface SentWorkout {
  /** The planned session: "YYYY-MM-DD HH:MM". */
  key: string;
  date: string;
  workoutId: number;
  scheduleId?: number;
}

export function loadSent(): SentWorkout[] {
  return readJson<SentWorkout[]>(SENT_FILE, []);
}

export function saveSent(sent: SentWorkout[]): void {
  writeJson(SENT_FILE, sent);
}
