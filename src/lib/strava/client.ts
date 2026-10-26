import { readJson, writeJson } from "@/lib/data/store";

/**
 * Minimal Strava API client for the athlete of the current request.
 * Tokens live in their data folder (strava-tokens.json), git-ignored like all personal data.
 */

const API = "https://www.strava.com/api/v3";
const OAUTH = "https://www.strava.com/oauth";
const TOKENS_FILE = "strava-tokens.json";

export const STRAVA_SCOPES = "read,activity:read_all,profile:read_all,activity:write";
/** Needed to read rides. activity:write is optional: it only enables uploading rides ridden in Hour Power. */
export const REQUIRED_SCOPES = ["read", "activity:read_all", "profile:read_all"];

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch seconds
  athlete?: { id: number; firstname?: string; lastname?: string };
  /** Scopes the rider approved, e.g. "read,activity:read_all,...". */
  scope?: string;
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
    throw new Error("Add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET as Codespaces secrets or in .env.local (see README).");
  }
  return { clientId, clientSecret };
}

/**
 * Where the browser reaches the app: APP_URL if set, the forwarded address
 * inside GitHub Codespaces, otherwise localhost.
 */
export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  // Hosts that publish the app's address: Railway, Fly.io, Render.
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  if (process.env.FLY_APP_NAME) return `https://${process.env.FLY_APP_NAME}.fly.dev`;
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  const codespace = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  if (codespace && domain) return `https://${codespace}-3000.${domain}`;
  return "http://localhost:3000";
}

/** The value to enter as "Authorization Callback Domain" in Strava's API settings. */
export function callbackDomain(): string {
  return new URL(appUrl()).hostname;
}

export function hasCredentials(): boolean {
  return !!process.env.STRAVA_CLIENT_ID && !!process.env.STRAVA_CLIENT_SECRET;
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

/** Swap the approval code for tokens. Doesn't save them: the caller checks who signed in first. */
export async function exchangeCode(code: string, scope?: string): Promise<StravaTokens> {
  return { ...(await tokenRequest({ code, grant_type: "authorization_code" })), scope };
}

export function saveTokens(tokens: StravaTokens): void {
  writeJson(TOKENS_FILE, tokens);
}

/**
 * Does Strava still accept this athlete's tokens? Used before acting on a
 * webhook saying they removed access (webhook events aren't signed).
 */
export async function stillAuthorized(): Promise<boolean> {
  try {
    await stravaGet("/athlete");
    return true;
  } catch (e) {
    return !/\((400|401|403)\)|not connected/.test((e as Error).message);
  }
}

/** Tell Strava to revoke Hour Power's access (when an athlete deletes their account). */
export async function deauthorize(): Promise<void> {
  const tokens = loadTokens();
  if (!tokens) return;
  await fetch(`${OAUTH}/deauthorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ access_token: await accessToken() }),
  }).catch(() => {});
}

export function canUpload(tokens = loadTokens()): boolean {
  return !!tokens?.scope?.split(",").includes("activity:write");
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

export interface UploadResult {
  activityId?: number;
  status: string;
  error?: string;
}

/**
 * Upload a ride file (TCX) to Strava and wait briefly for it to be processed.
 * Strava processes uploads asynchronously; most finish within a few seconds.
 */
export async function stravaUpload(file: string, meta: { name: string; description?: string; externalId: string }): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", new Blob([file], { type: "application/xml" }), `${meta.externalId}.tcx`);
  form.append("data_type", "tcx");
  form.append("name", meta.name);
  form.append("trainer", "1");
  form.append("sport_type", "VirtualRide");
  form.append("external_id", meta.externalId);
  if (meta.description) form.append("description", meta.description);
  const token = await accessToken();
  const res = await fetch(`${API}/uploads`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  if (res.status === 401 || res.status === 403) throw new Error("Strava didn't allow the upload. Reconnect Strava and tick the upload permission.");
  if (res.status === 429) throw new StravaRateLimitError(res.headers.get("x-ratelimit-usage"));
  if (!res.ok) throw new Error(`Strava upload failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  let upload = (await res.json()) as { id: number; status: string; error: string | null; activity_id: number | null };
  for (let i = 0; i < 8 && !upload.activity_id && !upload.error; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    upload = await stravaGet(`/uploads/${upload.id}`);
  }
  return { activityId: upload.activity_id ?? undefined, status: upload.status, error: upload.error ?? undefined };
}
