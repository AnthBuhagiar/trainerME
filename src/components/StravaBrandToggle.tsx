"use client";

import { useState } from "react";

export function StravaBrandToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);

  async function toggle(value: boolean) {
    setOn(value);
    await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stravaBrand: value }) });
  }

  return (
    <label className="flex items-start gap-3 text-[15px]">
      <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--signal-ink)]" />
      <span className="flex flex-col gap-0.5">
        <span>Say “Hour Power workout” on my Strava rides</span>
        <span className="text-[13px] text-muted">One line on rides from Hour Power, including workouts sent to Garmin.</span>
      </span>
    </label>
  );
}
