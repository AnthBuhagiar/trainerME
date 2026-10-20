"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Goal, GoalType } from "@/lib/goals/model";

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
  const hasRoute = type === "event" || type === "challenge" || type === "climb";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...Object.fromEntries(new FormData(e.currentTarget)), type, id: goal?.id, startHourPower: hourPower ?? undefined };
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
        <input name="name" required defaultValue={goal?.name} placeholder="e.g. Bathurst Cycling Festival" className={input} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label">Date</span>
        <input name="date" type="date" required defaultValue={goal?.date} className={input} />
      </label>

      {hasRoute && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="label">Distance (km)</span>
            <input name="distanceKm" inputMode="decimal" defaultValue={goal?.event?.distanceKm} className={input} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label">Climbing (m)</span>
            <input name="climbingM" inputMode="numeric" defaultValue={goal?.event?.climbingM} className={input} />
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

      <p className="text-[13px] text-muted">Route file (GPX) import is coming; distance and climbing are enough for now.</p>

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
