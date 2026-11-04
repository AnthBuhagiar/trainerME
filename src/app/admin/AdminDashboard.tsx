"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { AdminStats, RiderRow } from "@/lib/admin/stats";
import type { Section, Traffic } from "@/lib/admin/traffic";

/** A country outline, already projected for a 960 × 470 map (Natural Earth). */
export interface WorldShape {
  iso2: string;
  name: string;
  d: string;
}

const C = { hp: "#ff6a1a", fg: "#f3f4f6", soft: "#b7bcc4", mute: "#8d939c", line: "#2b323d", raise: "#1f2530", ink: "#12161c", panel: "#181d25" };
/** A week counts towards progression at 70% of sessions done (rule P14). */
const P14 = 70;
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "riders", label: "Riders" },
  { id: "plan", label: "Plan use" },
  { id: "traffic", label: "Traffic" },
] as const;
type Tab = (typeof TABS)[number]["id"];
type SiteFilter = "All" | Exclude<Section, "Other">;

const int = (n: number) => n.toLocaleString("en-AU");
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n)}%`);
const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const utc = (d: string) => new Date(d.length === 10 ? `${d}T00:00:00Z` : d);
const shortDay = (d: string) => utc(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "UTC" });
const fullDay = (d: string) => utc(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const ago = (iso: string | null) => {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`;
};
const GOAL_WORD: Record<string, string> = {
  event: "Event",
  performance: "Performance",
  segment: "Segment",
  challenge: "Challenge",
  consistency: "Consistency",
  comeback: "Comeback",
  custom: "Custom",
};
const countryName = (() => {
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    names = null;
  }
  return (code: string) => {
    try {
      return names?.of(code) ?? code;
    } catch {
      return code;
    }
  };
})();

/** Width of an element, kept up to date, for charts drawn to fit. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

interface TipState {
  x: number;
  y: number;
  lines: string[];
}

function Tip({ tip }: { tip: TipState | null }) {
  if (!tip) return null;
  return (
    <div className="hp-tip" style={{ left: tip.x, top: tip.y }}>
      <div className="k">{tip.lines[0]}</div>
      {tip.lines.slice(1).map((l) => (
        <div key={l}>{l}</div>
      ))}
    </div>
  );
}

/** Tooltip state placed near the pointer, kept inside the chart box. */
function useTip(box: React.RefObject<HTMLElement | null>) {
  const [tip, setTip] = useState<TipState | null>(null);
  const show = (e: React.PointerEvent, lines: string[]) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(Math.max(0, e.clientX - r.left + 12), Math.max(0, r.width - 180));
    const y = Math.max(0, e.clientY - r.top - 64);
    setTip({ x, y, lines });
  };
  return { tip, show, hide: () => setTip(null) };
}

function AdherenceChart({ weeks }: { weeks: AdminStats["weeklyAdherence"] }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip(ref);
  const pts = weeks.filter((w) => w.adherence != null);
  const H = 220;
  const m = { t: 12, r: 16, b: 26, l: 40 };
  const step = pts.length > 1 ? (W - m.l - m.r) / pts.length : W - m.l - m.r;
  const x = (i: number) => m.l + step * (i + 0.5);
  const y = (v: number) => H - m.b - (v / 100) * (H - m.t - m.b);
  const every = Math.max(1, Math.ceil(pts.length / Math.max(1, Math.floor((W - m.l - m.r) / 70))));
  return (
    <div className={`hp-chart${pts.length ? "" : " flat"}`} ref={ref}>
      {pts.length > 0 && (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={C.line} />
              <text x={m.l - 6} y={y(t)} dy="0.32em" textAnchor="end">{`${t}%`}</text>
            </g>
          ))}
          <line x1={m.l} x2={W - m.r} y1={y(P14)} y2={y(P14)} stroke={C.mute} strokeDasharray="4 4" />
          {pts.map((p, i) =>
            i % every === 0 ? (
              <text key={p.weekStart} x={x(i)} y={H - 6} textAnchor="middle">
                {shortDay(p.weekStart)}
              </text>
            ) : null,
          )}
          <path
            d={pts.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.adherence!)}`).join("")}
            fill="none"
            stroke={C.fg}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {pts.map((p, i) => (
            <circle
              key={p.weekStart}
              cx={x(i)}
              cy={y(p.adherence!)}
              r={5}
              fill={C.ink}
              stroke={p.adherence! >= P14 ? C.hp : C.mute}
              strokeWidth={2}
              onPointerMove={(e) => show(e, [`Week of ${fullDay(p.weekStart)}`, `${pct(p.adherence)} done`, `${p.done} of ${p.planned} sessions`, `${p.riders} riders`])}
              onPointerLeave={hide}
            />
          ))}
        </svg>
      )}
      <Tip tip={tip} />
    </div>
  );
}

function ActiveChart({ days }: { days: AdminStats["dailyActive"] }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip(ref);
  const H = 220;
  const m = { t: 12, r: 8, b: 26, l: 28 };
  const max = Math.max(1, ...days.map((d) => d.riders));
  const band = (W - m.l - m.r) / Math.max(1, days.length);
  const y = (v: number) => H - m.b - (v / max) * (H - m.t - m.b);
  const ticks = Array.from(new Set([0, Math.ceil(max / 2), max]));
  const labelAt = new Set([0, 30, 60, days.length - 1]);
  return (
    <div className="hp-chart" ref={ref}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={C.line} />
            <text x={m.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          labelAt.has(i) ? (
            <text key={`l${d.date}`} x={m.l + band * (i + 0.5)} y={H - 6} textAnchor={i === days.length - 1 ? "end" : i === 0 ? "start" : "middle"}>
              {shortDay(d.date)}
            </text>
          ) : null,
        )}
        {days.map((d, i) => {
          const last = i === days.length - 1;
          return (
            <rect
              key={d.date}
              x={m.l + band * i + band * 0.1}
              width={band * 0.8}
              y={y(d.riders)}
              height={Math.max(0, y(0) - y(d.riders))}
              rx={1.5}
              fill={last ? C.hp : C.soft}
              opacity={last ? 1 : 0.55}
              onPointerMove={(e) => show(e, [fullDay(d.date), `${d.riders} riders`])}
              onPointerLeave={hide}
            />
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

function WorldMap({ world, traffic, site }: { world: WorldShape[]; traffic: Traffic; site: SiteFilter }) {
  const ref = useRef<HTMLDivElement>(null);
  const { tip, show, hide } = useTip(ref);
  const views = useMemo(() => {
    const m = new Map<string, { pageViews: number; visits: number }>();
    for (const c of traffic.countries) {
      if (c.section === "Other" || (site !== "All" && c.section !== site)) continue;
      const v = m.get(c.country) ?? { pageViews: 0, visits: 0 };
      v.pageViews += c.pageViews;
      v.visits += c.visits;
      m.set(c.country, v);
    }
    return m;
  }, [traffic, site]);
  const max = Math.max(1, ...[...views.values()].map((v) => v.pageViews));
  // Square-root ramp from a dark ember to the brand orange, so small countries still show.
  const fill = (n: number) => {
    const t = 0.18 + 0.82 * Math.sqrt(n / max);
    const from = [0x3a, 0x2a, 0x20];
    const to = [0xff, 0x6a, 0x1a];
    return `rgb(${from.map((f, i) => Math.round(f + (to[i] - f) * t)).join(",")})`;
  };
  return (
    <div className="hp-chart map" ref={ref}>
      <svg width="100%" viewBox="0 0 960 470" role="img" aria-label="Map of page views by country">
        {world.map((c) => {
          const v = views.get(c.iso2);
          return (
            <path
              key={`${c.iso2}-${c.name}`}
              d={c.d}
              fill={v ? fill(v.pageViews) : C.raise}
              stroke={C.panel}
              strokeWidth={0.5}
              onPointerMove={(e) => show(e, v ? [c.name, `${int(v.pageViews)} page views`, `${int(v.visits)} visits`] : [c.name, "No visits"])}
              onPointerLeave={hide}
            />
          );
        })}
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

function TrafficDaily({ traffic }: { traffic: Traffic }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const { tip, show, hide } = useTip(ref);
  const H = 220;
  const m = { t: 12, r: 12, b: 26, l: 40 };
  const days = [...new Set(traffic.daily.map((d) => d.date))].sort();
  const series: Exclude<Section, "Other">[] = ["App", "Website"];
  const value = (date: string, s: Section) => traffic.daily.find((d) => d.date === date && d.section === s)?.pageViews ?? 0;
  const max = Math.max(1, ...traffic.daily.map((d) => d.pageViews));
  const x = (i: number) => (days.length > 1 ? m.l + (i / (days.length - 1)) * (W - m.l - m.r) : (m.l + W - m.r) / 2);
  const y = (v: number) => H - m.b - (v / max) * (H - m.t - m.b);
  const [hover, setHover] = useState<number | null>(null);
  const labelEvery = Math.max(1, Math.ceil(days.length / Math.max(2, Math.floor((W - m.l - m.r) / 90))));
  if (!days.length) return <div className="hp-chart flat" ref={ref} />;
  return (
    <div className="hp-chart" ref={ref}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {[0, max / 2, max].map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke={C.line} />
            <text x={m.l - 6} y={y(t)} dy="0.32em" textAnchor="end">
              {compact(Math.round(t))}
            </text>
          </g>
        ))}
        {days.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={d} x={x(i)} y={H - 6} textAnchor="middle">
              {shortDay(d)}
            </text>
          ) : null,
        )}
        {series.map((s, si) => (
          <path
            key={s}
            d={days.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(value(d, s))}`).join("")}
            fill="none"
            stroke={si === 0 ? C.hp : C.soft}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={H - m.b} stroke={C.mute} />}
        <rect
          x={m.l}
          y={m.t}
          width={W - m.l - m.r}
          height={H - m.t - m.b}
          fill="transparent"
          onPointerMove={(e) => {
            const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
            const frac = (e.clientX - r.left) / r.width;
            const i = Math.round(frac * (days.length - 1));
            setHover(i);
            show(e, [fullDay(days[i]), ...series.map((s) => `${s}: ${int(value(days[i], s))}`)]);
          }}
          onPointerLeave={() => {
            setHover(null);
            hide();
          }}
        />
      </svg>
      <Tip tip={tip} />
    </div>
  );
}

function SiteSwitch({ site, setSite }: { site: SiteFilter; setSite: (s: SiteFilter) => void }) {
  return (
    <div className="hp-seg" role="group" aria-label="Site">
      {(["All", "App", "Website"] as SiteFilter[]).map((s) => (
        <button key={s} aria-pressed={site === s} onClick={() => setSite(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}

type SortKey = keyof Pick<RiderRow, "name" | "joined" | "lastSync" | "ridesLast30" | "adherence4" | "nextGoalType" | "referralCode" | "referralsMade" | "joinedWithCode">;

function RidersTable({ riders, viewer }: { riders: RiderRow[]; viewer: number | null }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "joined", dir: 1 });
  const rows = [...riders].sort((a, b) => {
    const x = a[sort.key];
    const y = b[sort.key];
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir;
  });
  const head = (key: SortKey, label: string, cls = "") => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir > 0 ? "ascending" : "descending") : "none"}>
      <button className="hp-sort" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}
      </button>
    </th>
  );
  return (
    <div className="hp-table-wrap">
      <table>
        <thead>
          <tr>
            {head("name", "Rider")}
            {head("joined", "Joined", "hide-narrow")}
            {head("lastSync", "Last sync")}
            {head("ridesLast30", "Rides, 30 days", "num")}
            {head("adherence4", "Plan done, 4 wks", "num")}
            {head("nextGoalType", "Next goal", "hide-narrow")}
            {head("referralCode", "Code")}
            {head("referralsMade", "Riders referred", "num")}
            {head("joinedWithCode", "Joined with", "hide-narrow")}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.athleteId}>
              <td>{r.owner || r.athleteId === viewer ? `${r.name} (you)` : r.name}</td>
              <td className="hide-narrow">{r.joined ? fullDay(r.joined) : "—"}</td>
              <td>{ago(r.lastSync)}</td>
              <td className="num">{int(r.ridesLast30)}</td>
              <td className={`num${r.adherence4 == null ? " hp-muted" : ""}`}>{r.adherence4 == null ? "No full week yet" : pct(r.adherence4)}</td>
              <td className="hide-narrow">{r.nextGoalType ? `${GOAL_WORD[r.nextGoalType] ?? r.nextGoalType}, ${fullDay(r.nextGoalDate!)}` : "—"}</td>
              <td>{r.referralCode ?? "—"}</td>
              <td className="num">{int(r.referralsMade)}</td>
              <td className="hide-narrow">{r.joinedWithCode ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hp-empty">{children}</p>;
}

const sessionLabel = (w: string) => (w === "run" ? "Run or other training" : w);

export function AdminDashboard({ stats, traffic, world, viewer }: { stats: AdminStats; traffic: Traffic; world: WorldShape[]; viewer: number | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [site, setSite] = useState<SiteFilter>("All");
  const [refreshing, startRefresh] = useTransition();
  const s = stats.summary;

  // Open the tab named in the address (#riders, #plan, #traffic) and keep it there as you move.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.slice(1) as Tab;
      if (TABS.some((t) => t.id === h)) setTab(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const open = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  const countries = useMemo(() => {
    const m = new Map<string, { country: string; pageViews: number; visits: number }>();
    for (const c of traffic.countries) {
      if (c.section === "Other" || (site !== "All" && c.section !== site)) continue;
      const v = m.get(c.country) ?? { country: c.country, pageViews: 0, visits: 0 };
      v.pageViews += c.pageViews;
      v.visits += c.visits;
      m.set(c.country, v);
    }
    return [...m.values()].sort((a, b) => b.pageViews - a.pageViews);
  }, [traffic, site]);
  const hasTraffic = traffic.configured && (traffic.daily.length > 0 || traffic.countries.length > 0);
  const updated = new Date(stats.generatedAt).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  const mapCard = (wide: boolean, id: string, note: string) => (
    <div className={`hp-card${wide ? " wide" : ""}`} id={id}>
      <div className="hp-row">
        <h2>Where visits come from</h2>
        <SiteSwitch site={site} setSite={setSite} />
      </div>
      <p className="hp-note">{note}</p>
      {!traffic.configured && <Empty>No traffic yet: Cloudflare isn&apos;t connected on the server. The Traffic tab says how.</Empty>}
      {traffic.configured && !hasTraffic && <Empty>No visits counted yet. Cloudflare counts from when the addresses were switched to Proxied.</Empty>}
      <WorldMap world={world} traffic={traffic} site={site} />
    </div>
  );
  const adherenceCard = (wide: boolean, id: string, note: string) => (
    <div className={`hp-card${wide ? " wide" : ""}`} id={id}>
      <h2>Plan done each week</h2>
      <p className="hp-note">{note}</p>
      {stats.weeklyAdherence.length === 0 && <Empty>No finished week since riders started with Hour Power yet.</Empty>}
      <AdherenceChart weeks={stats.weeklyAdherence} />
    </div>
  );

  return (
    <div className="hp">
      <div className="hp-in">
        <div className="hp-eyebrow">Owner only · live</div>
        <header className="hp-head">
          <div>
            <h1 className="hp-title">
              Hour Power <em>admin</em>
            </h1>
            <p className="hp-takeaway">
              <b>{int(s.riders)}</b> riders, <b>{int(s.active7)}</b> active in the last 7 days. Across all riders, <b>{pct(s.adherence4)}</b> of
              planned sessions were done over the last 4 finished weeks.
            </p>
          </div>
          <div>
            <div className="hp-updated">Worked out {updated}</div>
            <div className="hp-actions">
              <a className="hp-btn" href="/settings">
                Back to the app
              </a>
              <button className="hp-btn" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>
        </header>
        <div className="hp-ruler" aria-hidden="true" />

        <nav className="hp-tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t.id} className="hp-tab" role="tab" aria-selected={tab === t.id} onClick={() => open(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "overview" && (
          <section className="hp-page" id="overview">
            <div className="hp-tiles">
              <div className="hp-tile">
                <div className="hp-tile-label">Riders signed up</div>
                <span className="hp-big">{int(s.riders)}</span>
                <div className="hp-tile-note">
                  <b>{int(s.newLast30)}</b> new in 30 days · Strava allows <b>{stats.capacity.stravaSelfServeCap}</b> before review
                </div>
              </div>
              <div className="hp-tile">
                <div className="hp-tile-label">Active, last 7 days</div>
                <span className="hp-big">{int(s.active7)}</span>
                <div className="hp-tile-note">
                  Opened the app or synced · <b>{int(s.active30)}</b> in 30 days
                </div>
              </div>
              <div className="hp-tile">
                <div className="hp-tile-label">Plan done, last 4 weeks</div>
                <span className="hp-big key">{pct(s.adherence4)}</span>
                <div className="hp-tile-note">
                  <b>{pct(s.adherence8)}</b> over 8 weeks
                </div>
              </div>
              <div className="hp-tile">
                <div className="hp-tile-label">Riders who joined with a code</div>
                <span className="hp-big">{int(s.referralsMade)}</span>
                <div className="hp-tile-note">Rewards start with billing</div>
              </div>
              <div className="hp-tile">
                <div className="hp-tile-label">Rides synced, last 30 days</div>
                <span className="hp-big">{int(s.ridesLast30)}</span>
                <div className="hp-tile-note">
                  <b>{compact(s.rides)}</b> rides in all
                </div>
              </div>
            </div>
            <div className="hp-grid">
              {mapCard(true, "card-map-overview", "Page views by country, last 30 days, from Cloudflare. Brighter is more.")}
              {adherenceCard(false, "card-adherence-overview", "Share of planned sessions done, all riders. Dashed line: 70%, where a week counts towards progression (rule P14).")}
              <div className="hp-card" id="card-active">
                <h2>Riders opening the app each day</h2>
                <p className="hp-note">Last 90 days. Counting started on 30 October 2026, so earlier days show none.</p>
                <ActiveChart days={stats.dailyActive} />
              </div>
            </div>
          </section>
        )}

        {tab === "riders" && (
          <section className="hp-page" id="riders">
            <div className="hp-card wide">
              <h2>Riders</h2>
              <p className="hp-note">Account and usage only. Plan done counts each rider&apos;s finished weeks since they started with Hour Power. Click a heading to sort.</p>
              <RidersTable riders={stats.riders} viewer={viewer} />
            </div>
          </section>
        )}

        {tab === "plan" && (
          <section className="hp-page" id="plan">
            <div className="hp-grid">
              {adherenceCard(
                true,
                "card-adherence",
                "Share of planned sessions done, all riders, from each rider's first full week with Hour Power. A session counts as done when a ride or strength session of that kind happened that day or week; a run of 30+ minutes covers an easy ride (rule P18). Dashed line: 70% (rule P14).",
              )}
              <div className="hp-card wide" id="card-workouts">
                <h2>Sessions: done, swapped and adjusted</h2>
                <p className="hp-note">
                  Each session as the plan first built it, last 8 finished weeks. Swapped: the rider got a different workout. Shortened or moved: same
                  workout, less time or another day. Sorted by most changed.
                </p>
                {stats.workouts.length === 0 ? (
                  <Empty>No finished weeks to count yet.</Empty>
                ) : (
                  <div className="hp-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Session</th>
                          <th className="num">Planned</th>
                          <th className="num">Done</th>
                          <th className="num">Changed</th>
                          <th className="num hide-narrow">Swapped</th>
                          <th className="num hide-narrow">Shortened</th>
                          <th className="num hide-narrow">Moved</th>
                          <th className="hide-narrow">Main reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.workouts.map((w) => (
                          <tr key={`${w.kind}-${w.workout}`}>
                            <td>{sessionLabel(w.workout)}</td>
                            <td className="num">{int(w.planned)}</td>
                            <td className="num">
                              {pct(w.completion)}
                              <span className="hp-bar" style={{ width: Math.round((w.completion / 100) * 48), background: w.completion < 50 ? C.mute : C.hp }} />
                            </td>
                            <td className="num">{int(w.changed)}</td>
                            <td className="num hide-narrow">{int(w.swapped)}</td>
                            <td className="num hide-narrow">{int(w.shortened)}</td>
                            <td className="num hide-narrow">{int(w.moved)}</td>
                            <td className="hide-narrow">{w.topReason ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="hp-card" id="card-reasons">
                <h2>Why sessions changed</h2>
                <p className="hp-note">Every change from the plan as built, last 8 finished weeks.</p>
                {stats.changeReasons.length === 0 ? (
                  <Empty>No session has been changed yet.</Empty>
                ) : (
                  <ul className="hp-list">
                    {stats.changeReasons.map((r) => (
                      <li key={r.reason}>
                        <span>{r.reason}</span>
                        <span className="track">
                          <span className="fill" style={{ display: "block", width: `${(r.times / Math.max(...stats.changeReasons.map((x) => x.times))) * 100}%` }} />
                        </span>
                        <b>{int(r.times)}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="hp-card" id="card-swaps">
                <h2>Most common swaps</h2>
                <p className="hp-note">What riders were given instead, most often first.</p>
                {stats.swaps.length === 0 ? (
                  <Empty>No swaps yet.</Empty>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Planned</th>
                        <th>Given instead</th>
                        <th className="num">Times</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.swaps.map((w) => (
                        <tr key={`${w.from}-${w.to}`}>
                          <td>{w.from}</td>
                          <td>{w.to}</td>
                          <td className="num">{int(w.times)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        )}

        {tab === "traffic" && (
          <section className="hp-page" id="traffic">
            {!traffic.configured && (
              <div className="hp-card wide setup" style={{ marginBottom: 16 }}>
                <h2>Connect Cloudflare to see traffic</h2>
                <p className="hp-note">
                  Add <code className="hp-code">CLOUDFLARE_API_TOKEN</code> (Zone · Analytics · Read for hourpowerapp.cc) to <code className="hp-code">/etc/hour-power.env</code>,
                  restart hour-power, and make sure both addresses are proxied (orange cloud) in Cloudflare DNS.
                </p>
              </div>
            )}
            <div className="hp-grid">
              {mapCard(true, "card-map", "Page views by country, last 30 days.")}
              <div className="hp-card" id="card-countries">
                <h2>Top countries</h2>
                <p className="hp-note">Page views and visits (arrivals from another site or a direct link), for the site picked above.</p>
                {countries.length === 0 ? (
                  <Empty>No visits counted yet.</Empty>
                ) : (
                  <div className="hp-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Country</th>
                          <th className="num">Page views</th>
                          <th className="num">Visits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {countries.map((c) => (
                          <tr key={c.country}>
                            <td>{countryName(c.country)}</td>
                            <td className="num">{int(c.pageViews)}</td>
                            <td className="num">{int(c.visits)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="hp-card" id="card-daily-traffic">
                <div className="hp-row">
                  <h2>Page views each day</h2>
                  <div className="hp-legend">
                    <span>
                      <span className="hp-sw hp-sw-0" />
                      App
                    </span>
                    <span>
                      <span className="hp-sw hp-sw-1" />
                      Website
                    </span>
                  </div>
                </div>
                <p className="hp-note">Last 30 days.</p>
                {traffic.daily.length === 0 && <Empty>No visits counted yet.</Empty>}
                <TrafficDaily traffic={traffic} />
              </div>
              <div className="hp-card" id="card-paths">
                <h2>Top pages</h2>
                <p className="hp-note">Page views, last 30 days.</p>
                {traffic.paths.length === 0 ? (
                  <Empty>No page views counted yet.</Empty>
                ) : (
                  <div className="hp-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Page</th>
                          <th>Site</th>
                          <th className="num">Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...traffic.paths]
                          .filter((p) => p.section !== "Other")
                          .sort((a, b) => b.pageViews - a.pageViews)
                          .map((p) => (
                            <tr key={`${p.section}-${p.path}`}>
                              <td>{p.path}</td>
                              <td>{p.section}</td>
                              <td className="num">{int(p.pageViews)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="hp-card" id="card-referrers">
                <h2>Where visitors came from</h2>
                <p className="hp-note">Visits by referring site, last 30 days. Clicks between the website and the app are left out.</p>
                {traffic.referrers.length === 0 ? (
                  <Empty>Not available on Cloudflare&apos;s free plan, or none counted yet.</Empty>
                ) : (
                  <div className="hp-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>From</th>
                          <th>Site</th>
                          <th className="num">Visits</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traffic.referrers.map((r) => (
                          <tr key={`${r.section}-${r.referrer}`}>
                            <td>{r.referrer}</td>
                            <td>{r.section}</td>
                            <td className="num">{int(r.visits)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
