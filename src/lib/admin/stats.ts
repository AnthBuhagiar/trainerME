import fs from "node:fs";
import { athleteIds, ownerId } from "@/lib/auth/owner";
import { athleteDir, readJson, runAsAthlete, type RawActivity } from "@/lib/data/store";
import type { Goal } from "@/lib/goals/model";
import { hasIntervalsKey } from "@/lib/intervals/client";
import { TERMS_VERSION } from "@/lib/legal/terms";
import { codeFor, referredBy } from "@/lib/referral/referral";
import { loadSeen } from "@/lib/admin/seen";
import { planUsage, type PlanUsage } from "@/lib/admin/planUsage";

/**
 * What the owner sees on the admin dashboard (F4): who has signed up and how
 * they use the app. Account and usage only — no power, heart rate, check-in
 * answers, weights or routes (ethics policy: collect and show the minimum).
 * Names are first name and last initial.
 */

export interface RiderRow {
  athleteId: number;
  name: string;
  owner: boolean;
  /** First sign-in we know of (terms accepted, else the folder's creation). */
  joined: string | null;
  lastSeen: string | null;
  daysActive30: number;
  lastSync: string | null;
  activities: number;
  rides: number;
  ridesLast30: number;
  latestActivity: string | null;
  goals: number;
  nextGoalType: string | null;
  nextGoalDate: string | null;
  trainingDaysSet: boolean;
  checkInsLast30: number;
  stravaUpload: boolean;
  intervalsLinked: boolean;
  termsCurrent: boolean;
  referralCode: string | null;
  joinedWithCode: string | null;
  referralsMade: number;
  /** Sessions planned and done over the last 4 finished weeks, and the share done (%). */
  plannedLast4: number;
  doneLast4: number;
  adherence4: number | null;
}

export interface WeekAdherence {
  weekStart: string;
  riders: number;
  planned: number;
  done: number;
  adherence: number | null;
}

export interface WorkoutRow {
  workout: string;
  kind: string;
  planned: number;
  done: number;
  completion: number;
  changed: number;
  swapped: number;
  shortened: number;
  moved: number;
  changeRate: number;
  topReason: string | null;
}

export interface SwapRow {
  from: string;
  to: string;
  times: number;
}

export interface ReasonRow {
  reason: string;
  times: number;
}

export interface DailyActive {
  date: string;
  riders: number;
}

export interface WeeklySignups {
  weekStart: string;
  signups: number;
  total: number;
}

export interface AdminStats {
  generatedAt: string;
  capacity: { riders: number; maxAthletes: number | null; stravaSelfServeCap: number };
  summary: {
    riders: number;
    active7: number;
    active30: number;
    newLast30: number;
    activities: number;
    rides: number;
    ridesLast30: number;
    withGoal: number;
    withTrainingDays: number;
    usingCheckIns: number;
    withStravaUpload: number;
    referralsMade: number;
    pendingTerms: number;
    /** Share of planned sessions done across all riders, last 4 and 8 finished weeks (%). */
    adherence4: number | null;
    adherence8: number | null;
    sessionsChanged8: number;
  };
  weeklyAdherence: WeekAdherence[];
  workouts: WorkoutRow[];
  swaps: SwapRow[];
  changeReasons: ReasonRow[];
  riders: RiderRow[];
  dailyActive: DailyActive[];
  weeklySignups: WeeklySignups[];
}

const day = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (now: Date, n: number) => day(new Date(now.getTime() - n * 86_400_000));

function displayName(first?: string, last?: string): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (!f && !l) return "Unnamed rider";
  return l ? `${f} ${l[0].toUpperCase()}.`.trim() : f;
}

function folderCreated(id: number): string | null {
  try {
    const s = fs.statSync(athleteDir(id));
    const t = s.birthtimeMs > 0 ? s.birthtimeMs : s.ctimeMs;
    return new Date(t).toISOString();
  } catch {
    return null;
  }
}

const pct = (done: number, planned: number) => (planned ? Math.round((done / planned) * 1000) / 10 : null);

function safeUsage(): PlanUsage {
  try {
    return planUsage(8);
  } catch {
    return { weeks: [], sessions: [] };
  }
}

function riderRow(id: number, owner: number | null, now: Date): RiderRow & { usage: PlanUsage } {
  return runAsAthlete(id, () => {
    const tokens = readJson<{ athlete?: { firstname?: string; lastname?: string }; scope?: string } | null>("strava-tokens.json", null);
    const terms = readJson<{ version?: string; acceptedAt?: string } | null>("terms.json", null);
    const sync = readJson<{ lastSyncedAt?: number }>("sync-state.json", {});
    const raw = readJson<RawActivity[]>("activities.json", []);
    const goals = readJson<Goal[]>("goals.json", []);
    const checkins = readJson<Record<string, string>>("checkins.json", {});
    const availability = readJson<unknown[] | null>("availability.json", null);
    const seen = loadSeen().days;

    const since30 = daysAgo(now, 30);
    const today = day(now);
    const rides = raw.filter((a) => a.sport_type?.includes("Ride"));
    const starts = raw.map((a) => a.start_local).filter(Boolean).sort();
    const upcoming = goals.filter((g) => g.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const next = upcoming.find((g) => g.priority === "A") ?? upcoming[0];
    const code = codeFor(id);

    const usage = safeUsage();
    const last4 = usage.weeks.slice(-4);
    const plannedLast4 = last4.reduce((n, w) => n + w.planned, 0);
    const doneLast4 = last4.reduce((n, w) => n + w.done, 0);
    const joinedCandidates = [terms?.acceptedAt, folderCreated(id)].filter((x): x is string => !!x).sort();
    return {
      athleteId: id,
      name: displayName(tokens?.athlete?.firstname, tokens?.athlete?.lastname),
      owner: id === owner,
      joined: joinedCandidates[0] ?? null,
      lastSeen: seen.at(-1) ?? null,
      daysActive30: seen.filter((d) => d >= since30).length,
      lastSync: sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toISOString() : null,
      activities: raw.length,
      rides: rides.length,
      ridesLast30: rides.filter((a) => a.start_local >= since30).length,
      latestActivity: starts.at(-1)?.slice(0, 10) ?? null,
      goals: goals.length,
      nextGoalType: next?.type ?? null,
      nextGoalDate: next?.date ?? null,
      trainingDaysSet: Array.isArray(availability) && availability.length > 0,
      checkInsLast30: Object.keys(checkins).filter((d) => d >= since30).length,
      stravaUpload: (tokens?.scope ?? "").split(",").includes("activity:write"),
      intervalsLinked: hasIntervalsKey(),
      termsCurrent: terms?.version === TERMS_VERSION,
      referralCode: code,
      joinedWithCode: referredBy(id),
      referralsMade: 0, // filled in below from everyone's records
      plannedLast4,
      doneLast4,
      adherence4: pct(doneLast4, plannedLast4),
      usage,
    };
  });
}

/** Monday-start ISO week for a YYYY-MM-DD date. */
function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return day(new Date(d.getTime() - offset * 86_400_000));
}

export function buildAdminStats(now = new Date()): AdminStats {
  const owner = ownerId();
  const withUsage = athleteIds()
    .sort((a, b) => a - b)
    .map((id) => riderRow(id, owner, now));
  const riders: RiderRow[] = withUsage.map((r) => {
    const { usage, ...row } = r;
    void usage;
    return row;
  });
  const usages = withUsage.map((r) => r.usage);

  // Plan adherence by week, across riders.
  const byWeek = new Map<string, WeekAdherence>();
  for (const u of usages)
    for (const w of u.weeks) {
      const row = byWeek.get(w.weekStart) ?? { weekStart: w.weekStart, riders: 0, planned: 0, done: 0, adherence: null };
      row.riders++;
      row.planned += w.planned;
      row.done += w.done;
      byWeek.set(w.weekStart, row);
    }
  const weeklyAdherence = [...byWeek.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).map((w) => ({ ...w, adherence: pct(w.done, w.planned) }));
  const sumWeeks = (ws: WeekAdherence[]) => pct(ws.reduce((n, w) => n + w.done, 0), ws.reduce((n, w) => n + w.planned, 0));

  // Which sessions get done, changed and swapped, by the session the plan first built.
  const sessions = usages.flatMap((u) => u.sessions);
  const workoutMap = new Map<string, WorkoutRow & { reasons: Map<string, number> }>();
  const swapMap = new Map<string, SwapRow>();
  const reasonMap = new Map<string, number>();
  for (const s of sessions) {
    const key = `${s.kind}|${s.planned}`;
    const w = workoutMap.get(key) ?? { workout: s.planned, kind: s.kind, planned: 0, done: 0, completion: 0, changed: 0, swapped: 0, shortened: 0, moved: 0, changeRate: 0, topReason: null, reasons: new Map() };
    w.planned++;
    if (s.done) w.done++;
    if (s.change) {
      w.changed++;
      w[s.change]++;
      if (s.reason) {
        w.reasons.set(s.reason, (w.reasons.get(s.reason) ?? 0) + 1);
        reasonMap.set(s.reason, (reasonMap.get(s.reason) ?? 0) + 1);
      }
    }
    if (s.change === "swapped" && s.became) {
      const k = `${s.planned}→${s.became}`;
      const row = swapMap.get(k) ?? { from: s.planned, to: s.became, times: 0 };
      row.times++;
      swapMap.set(k, row);
    }
    workoutMap.set(key, w);
  }
  const workouts: WorkoutRow[] = [...workoutMap.values()]
    .map(({ reasons, ...w }) => ({
      ...w,
      completion: pct(w.done, w.planned) ?? 0,
      changeRate: pct(w.changed, w.planned) ?? 0,
      topReason: [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }))
    .sort((a, b) => b.changed - a.changed || b.planned - a.planned);
  const swaps = [...swapMap.values()].sort((a, b) => b.times - a.times);
  const changeReasons = [...reasonMap.entries()].map(([reason, times]) => ({ reason, times })).sort((a, b) => b.times - a.times);

  // Referrals each rider made: counts of riders who joined with their code.
  const byCode = new Map<string, number>();
  for (const r of riders) if (r.joinedWithCode) byCode.set(r.joinedWithCode, (byCode.get(r.joinedWithCode) ?? 0) + 1);
  for (const r of riders) r.referralsMade = r.referralCode ? (byCode.get(r.referralCode) ?? 0) : 0;

  // Active = opened the app, or synced, in the window.
  const lastActive = (r: RiderRow) => [r.lastSeen, r.lastSync?.slice(0, 10)].filter(Boolean).sort().at(-1) ?? "";
  const since7 = daysAgo(now, 7);
  const since30 = daysAgo(now, 30);

  const seenByRider = athleteIds().map((id) => runAsAthlete(id, () => new Set(loadSeen().days)));
  const dailyActive: DailyActive[] = [];
  for (let i = 89; i >= 0; i--) {
    const date = daysAgo(now, i);
    dailyActive.push({ date, riders: seenByRider.filter((s) => s.has(date)).length });
  }

  const counts = new Map<string, number>();
  for (const r of riders) if (r.joined) counts.set(weekStart(r.joined.slice(0, 10)), (counts.get(weekStart(r.joined.slice(0, 10))) ?? 0) + 1);
  const weeks = [...counts.keys()].sort();
  const weeklySignups: WeeklySignups[] = [];
  if (weeks.length) {
    let total = 0;
    for (let w = weeks[0]; w <= weekStart(day(now)); w = day(new Date(Date.parse(`${w}T00:00:00Z`) + 7 * 86_400_000))) {
      const n = counts.get(w) ?? 0;
      total += n;
      weeklySignups.push({ weekStart: w, signups: n, total });
    }
  }

  const max = Number(process.env.MAX_ATHLETES);
  return {
    generatedAt: now.toISOString(),
    capacity: { riders: riders.length, maxAthletes: Number.isFinite(max) && max > 0 ? max : null, stravaSelfServeCap: 10 },
    summary: {
      riders: riders.length,
      active7: riders.filter((r) => lastActive(r) >= since7).length,
      active30: riders.filter((r) => lastActive(r) >= since30).length,
      newLast30: riders.filter((r) => (r.joined ?? "") >= since30).length,
      activities: riders.reduce((n, r) => n + r.activities, 0),
      rides: riders.reduce((n, r) => n + r.rides, 0),
      ridesLast30: riders.reduce((n, r) => n + r.ridesLast30, 0),
      withGoal: riders.filter((r) => r.goals > 0).length,
      withTrainingDays: riders.filter((r) => r.trainingDaysSet).length,
      usingCheckIns: riders.filter((r) => r.checkInsLast30 > 0).length,
      withStravaUpload: riders.filter((r) => r.stravaUpload).length,
      referralsMade: riders.filter((r) => r.joinedWithCode).length,
      pendingTerms: riders.filter((r) => !r.termsCurrent).length,
      adherence4: sumWeeks(weeklyAdherence.slice(-4)),
      adherence8: sumWeeks(weeklyAdherence),
      sessionsChanged8: sessions.filter((s) => s.change).length,
    },
    weeklyAdherence,
    workouts,
    swaps,
    changeReasons,
    riders,
    dailyActive,
    weeklySignups,
  };
}
