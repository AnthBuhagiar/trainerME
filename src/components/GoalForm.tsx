"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Goal, GoalType } from "@/lib/goals/model";
import { parseGpx, type Route } from "@/lib/route/gpx";

const TYPES: { value: GoalType; label: string }[] = [
  { value: "event", label: "Event" },
  { value: "performance", label: "Hour power" },
  { value: "climb", label: "Climb" },
  { value: "challenge", label: "Challenge" },
  { value: "consistency", label: "Consistency" },
  { value: "comeback", label: "Comeback" },
  { value: "custom", label: "Other" },
];

const input = "h-12 w-full rounded-xl border border-line bg-card px-3 text-[16px]";

export function GoalForm({ goal, hourPower }: { goal: Goal | null; hourPower: number | null }) {
  const router = useRouter();
  const [type, setType] = useState<GoalType>(goal?.type ?? "event");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = goal?.event?.targetMinutes;
  const [route, setRoute] = useState<Route | null>(null);
  const [routeName, setRouteName] = useState(goal?.event?.routeName);
  const [routeError, setRouteError] = useState<string | null>(null);
  const distanceRef = useRef<HTMLInputElement>(null);
  const climbingRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  async function importRoute(file: File | undefined) {
    if (!file) return;
    setRouteError(null);
    try {
      const r = parseGpx(await file.text());
      setRoute(r);
      setRouteName(r.name);
      if (distanceRef.current) distanceRef.current.value = String(r.distanceKm);
      if (climbingRef.current && r.hasElevation) climbingRef.current.value = String(r.climbingM);
      if (nameRef.current && !nameRef.current.value) nameRef.current.value = r.name;
    } catch (e) {
      setRouteError((e as Error).message);
    }
  }
  const hasRoute = type === "event" || type === "challenge" || type === "climb";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = Object.fromEntries(new FormData(e.currentTarget));
    delete form.routeFile;
    const body = { ...form, type, id: goal?.id, startHourPower: hourPower ?? undefined, route: route ?? undefined, removeRoute: !routeName };
    const res = await fetch("/api/goals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Couldn’t save the goal.");
    router.push("/");
    router.refresh();
  }

  async function remove() {
    if (!goal || !confirm(`Delete ${goal.name}?`)) return;
    await fetch(`/api/goals?id=${encodeURIComponent(goal.id)}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-2">What are you training for?</legend>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={`h-10 rounded-full border px-4 text-[15px] font-semibold ${
                type === t.value ? "border-asphalt bg-asphalt text-chalk" : "border-line bg-card"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="label">Name</span>
        <input ref={nameRef} name="name" required defaultValue={goal?.name} placeholder="e.g. Bathurst Cycling Festival" className={input} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">Date</span>
        <input name="date" type="date" required defaultValue={goal?.date} className={input} />
      </label>

      {hasRoute && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label">Distance (km)</span>
            <input ref={distanceRef} name="distanceKm" inputMode="decimal" defaultValue={goal?.event?.distanceKm} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label">Climbing (m)</span>
            <input ref={climbingRef} name="climbingM" inputMode="numeric" defaultValue={goal?.event?.climbingM} className={input} />
          </label>
        </div>
      )}

      {hasRoute && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="label mb-1.5">Target moving time (optional)</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2">
              <input name="targetHours" inputMode="numeric" defaultValue={target ? Math.floor(target / 60) : ""} className={input} />
              <span className="text-muted">h</span>
            </label>
            <label className="flex items-center gap-2">
              <input name="targetMins" inputMode="numeric" defaultValue={target ? target % 60 : ""} className={input} />
              <span className="text-muted">min</span>
            </label>
          </div>
        </fieldset>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="label">Target hour power (W, optional)</span>
        <input name="targetWatts" inputMode="numeric" defaultValue={goal?.targetWatts} placeholder={hourPower ? `Now ${hourPower} W` : ""} className={input} />
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="label mb-1.5">Priority</legend>
        <select name="priority" defaultValue={goal?.priority ?? "A"} className={input}>
          <option value="A">A · the one the plan is built around</option>
          <option value="B">B · important, train through it</option>
          <option value="C">C · just for fun</option>
        </select>
      </fieldset>

      {hasRoute && (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-card px-4 py-3">
          <span className="label">Route file (optional)</span>
          {routeName ? (
            <div className="flex items-baseline justify-between gap-3 text-[15px]">
              <span>
                {routeName}
                {route && (
                  <span className="block text-[13px] text-muted">
                    {route.distanceKm} km · {route.climbingM.toLocaleString("en-AU")} m · {route.climbs.length}{" "}
                    {route.climbs.length === 1 ? "climb" : "climbs"} found
                  </span>
                )}
              </span>
              <button type="button" onClick={() => {
                  setRoute(null);
                  setRouteName(undefined);
                }} className="shrink-0 text-[14px] font-semibold text-muted">
                Remove
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-muted">
              Import a GPX from Strava, RideWithGPS, Komoot or the event website for climb-by-climb pacing and a better finish time.
            </p>
          )}
          <input
            name="routeFile"
            type="file"
            accept=".gpx,application/gpx+xml,application/xml,text/xml"
            onChange={(e) => importRoute(e.target.files?.[0])}
            className="text-[14px] file:mr-3 file:h-10 file:rounded-full file:border file:border-line file:bg-background file:px-4 file:font-semibold"
          />
          {routeError && <p className="text-[13px] font-semibold text-signal-ink">{routeError}</p>}
        </div>
      )}

      {error && <p className="text-[14px] font-semibold text-signal-ink">{error}</p>}

      <button disabled={busy} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white disabled:opacity-60">
        {busy ? "Saving…" : goal ? "Save goal" : "Set goal"}
      </button>
      {goal && (
        <button type="button" onClick={remove} className="h-12 text-[15px] font-semibold text-muted">
          Delete goal
        </button>
      )}
    </form>
  );
}
