import { readJson, writeJson } from "@/lib/data/store";

/**
 * Minimal Strava API client for a single athlete (the app's owner).
 * Tokens live in data/strava-tokens.json, git-ignored like all personal data.
 */

const API = "https://www.strava.com/api/v3";
const OAUTH = "https://www.strava.com/oauth";
const TOKENS_FILE = "strava-tokens.json";

export const STRAVA_SCOPES = "read,activity:read_all,profile:read_all";

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  athlete?: { id: number; firstname?: string; lastname?: string };
}

export class StravaRateLimitError extends Error {
  constructor(public usage: string | null) {
    super("Strava rate limit reached. Try again in 15 minutes.");
  }
}

function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET in .env.local (see README).");
  }
  return { clientId, clientSecret };
}

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function authorizeUrl(): string {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl()}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPES,
  });
  return `${OAUTH}/authorize?${params}`;
}

export function loadTokens(): StravaTokens | null {
  return readJson<StravaTokens | null>(TOKENS_FILE, null);
}

async function tokenRequest(body: Record<string, string>): Promise<StravaTokens> {
  const { clientId, clientSecret } = credentials();
  const res = await fetch(`${OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...body }),
  });
  if (!res.ok) throw new Error(`Strava token request failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as StravaTokens;
}

export async function exchangeCode(code: string): Promise<StravaTokens> {
  const tokens = await tokenRequest({ code, grant_type: "authorization_code" });
  writeJson(TOKENS_FILE, tokens);
  return tokens;
}

async function accessToken(): Promise<string> {
  const tokens = loadTokens();
  if (!tokens) throw new Error("Strava is not connected yet.");
  if (tokens.expires_at - 60 > Date.now() / 1000) return tokens.access_token;
  const refreshed = await tokenRequest({ refresh_token: tokens.refresh_token, grant_type: "refresh_token" });
  writeJson(TOKENS_FILE, { ...tokens, ...refreshed });
  return refreshed.access_token;
}

export async function stravaGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${API}${path}${query.size ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (res.status === 429) throw new StravaRateLimitError(res.headers.get("x-ratelimit-usage"));
  if (!res.ok) throw new Error(`Strava GET ${path} failed (${res.status})`);
  return (await res.json()) as T;
}
