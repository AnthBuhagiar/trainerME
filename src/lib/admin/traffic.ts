/**
 * Website and app traffic for the admin dashboard (F4), from Cloudflare's
 * GraphQL Analytics API. The domain already runs through Cloudflare, so this
 * reads what Cloudflare counts at the edge: no tracking script, no cookies,
 * nothing per visitor. Needs CLOUDFLARE_API_TOKEN (Zone → Analytics → Read) on
 * the server; without it traffic is left out. The zone is hourpowerapp.cc's unless
 * CLOUDFLARE_ZONE_ID says otherwise (a zone ID is an identifier, not a secret).
 *
 * Page views are HTML responses to real visitors (requestSource "eyeball").
 */

const ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
/** hourpowerapp.cc's Cloudflare zone. */
export const HOUR_POWER_ZONE_ID = "cb9d99cc237b7f756e7bc3818edc5a7c";
export const TRAFFIC_DAYS = 29; // free plans allow 30 days a query

export type Section = "App" | "Website" | "Other";

export interface TrafficDay {
  date: string;
  section: Section;
  pageViews: number;
  visits: number;
}
export interface TrafficCountry {
  country: string;
  section: Section;
  pageViews: number;
  visits: number;
}
export interface TrafficPath {
  section: Section;
  path: string;
  pageViews: number;
}
export interface TrafficReferrer {
  section: Section;
  referrer: string;
  visits: number;
}
export interface TrafficDevice {
  section: Section;
  device: string;
  pageViews: number;
}

export interface Traffic {
  configured: boolean;
  error?: string;
  from?: string;
  to?: string;
  hosts?: { app: string | null; website: string };
  daily: TrafficDay[];
  countries: TrafficCountry[];
  paths: TrafficPath[];
  referrers: TrafficReferrer[];
  devices: TrafficDevice[];
}

const empty = (configured: boolean, error?: string): Traffic => ({ configured, error, daily: [], countries: [], paths: [], referrers: [], devices: [] });

export function appHost(): string | null {
  try {
    return process.env.APP_URL ? new URL(process.env.APP_URL).hostname : null;
  } catch {
    return null;
  }
}
export const websiteHost = () => process.env.WEBSITE_HOST || "www.hourpowerapp.cc";

export function sectionOf(host: string): Section {
  if (host === appHost()) return "App";
  if (host === websiteHost() || host === websiteHost().replace(/^www\./, "")) return "Website";
  return "Other";
}

const QUERY = `
query Traffic($zone: string!, $from: Date!, $to: Date!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      daily: httpRequestsAdaptiveGroups(limit: 2000, filter: { date_geq: $from, date_leq: $to, requestSource: "eyeball", edgeResponseContentTypeName: "html" }) {
        count
        sum { visits }
        dimensions { date clientRequestHTTPHost }
      }
      countries: httpRequestsAdaptiveGroups(limit: 2000, filter: { date_geq: $from, date_leq: $to, requestSource: "eyeball", edgeResponseContentTypeName: "html" }) {
        count
        sum { visits }
        dimensions { clientCountryName clientRequestHTTPHost }
      }
      paths: httpRequestsAdaptiveGroups(limit: 60, orderBy: [count_DESC], filter: { date_geq: $from, date_leq: $to, requestSource: "eyeball", edgeResponseContentTypeName: "html" }) {
        count
        dimensions { clientRequestPath clientRequestHTTPHost }
      }
      referrers: httpRequestsAdaptiveGroups(limit: 60, orderBy: [sum_visits_DESC], filter: { date_geq: $from, date_leq: $to, requestSource: "eyeball", edgeResponseContentTypeName: "html" }) {
        sum { visits }
        dimensions { clientRefererHost clientRequestHTTPHost }
      }
      devices: httpRequestsAdaptiveGroups(limit: 50, filter: { date_geq: $from, date_leq: $to, requestSource: "eyeball", edgeResponseContentTypeName: "html" }) {
        count
        dimensions { clientDeviceType clientRequestHTTPHost }
      }
    }
  }
}`;

interface Group {
  count?: number;
  sum?: { visits?: number };
  dimensions: Record<string, string>;
}

function merge<T>(rows: T[], key: (r: T) => string, add: (a: T, b: T) => T): T[] {
  const m = new Map<string, T>();
  for (const r of rows) {
    const k = key(r);
    const prev = m.get(k);
    m.set(k, prev ? add(prev, r) : r);
  }
  return [...m.values()];
}

let cache: { at: number; value: Traffic } | null = null;
const CACHE_MS = 10 * 60_000;

export async function fetchTraffic(now = new Date(), fetchImpl: typeof fetch = fetch): Promise<Traffic> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID || HOUR_POWER_ZONE_ID;
  if (!token || !zone) return empty(false);
  if (cache && now.getTime() - cache.at < CACHE_MS) return cache.value;
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - TRAFFIC_DAYS * 86_400_000).toISOString().slice(0, 10);
  try {
    const res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { zone, from, to } }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json()) as { data?: { viewer?: { zones?: Record<string, Group[]>[] } }; errors?: { message: string }[] | null };
    if (body.errors?.length) return empty(true, body.errors.map((e) => e.message).join("; "));
    const z = body.data?.viewer?.zones?.[0];
    if (!z) return empty(true, "Cloudflare returned no data for this zone.");
    const sec = (g: Group) => sectionOf(g.dimensions.clientRequestHTTPHost ?? "");

    const daily = merge(
      z.daily.map((g) => ({ date: g.dimensions.date, section: sec(g), pageViews: g.count ?? 0, visits: g.sum?.visits ?? 0 })),
      (r) => `${r.date}|${r.section}`,
      (a, b) => ({ ...a, pageViews: a.pageViews + b.pageViews, visits: a.visits + b.visits }),
    ).sort((a, b) => a.date.localeCompare(b.date));
    const countries = merge(
      z.countries.map((g) => ({ country: g.dimensions.clientCountryName || "Unknown", section: sec(g), pageViews: g.count ?? 0, visits: g.sum?.visits ?? 0 })),
      (r) => `${r.country}|${r.section}`,
      (a, b) => ({ ...a, pageViews: a.pageViews + b.pageViews, visits: a.visits + b.visits }),
    ).sort((a, b) => b.pageViews - a.pageViews);
    const paths = z.paths
      .map((g) => ({ section: sec(g), path: g.dimensions.clientRequestPath, pageViews: g.count ?? 0 }))
      .filter((p) => !p.path.startsWith("/api/"));
    const referrers = merge(
      z.referrers
        .map((g) => ({ section: sec(g), referrer: g.dimensions.clientRefererHost || "Direct / none", visits: g.sum?.visits ?? 0 }))
        // Clicks from the website to the app (and within a site) aren't outside referrals.
        .filter((r) => r.visits > 0 && r.referrer !== appHost() && r.referrer !== websiteHost()),
      (r) => `${r.referrer}|${r.section}`,
      (a, b) => ({ ...a, visits: a.visits + b.visits }),
    ).sort((a, b) => b.visits - a.visits);
    const devices = merge(
      z.devices.map((g) => ({ section: sec(g), device: g.dimensions.clientDeviceType || "unknown", pageViews: g.count ?? 0 })),
      (r) => `${r.device}|${r.section}`,
      (a, b) => ({ ...a, pageViews: a.pageViews + b.pageViews }),
    );
    const value: Traffic = { configured: true, from, to, hosts: { app: appHost(), website: websiteHost() }, daily, countries, paths, referrers, devices };
    cache = { at: now.getTime(), value };
    return value;
  } catch (err) {
    return empty(true, err instanceof Error ? err.message : "Couldn't reach Cloudflare.");
  }
}

/** For tests. */
export function clearTrafficCache(): void {
  cache = null;
}
