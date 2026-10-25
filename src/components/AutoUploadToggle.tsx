"use client";

import { useState } from "react";

export function AutoUploadToggle({ initial, canUpload }: { initial: boolean; canUpload: boolean }) {
  const [on, setOn] = useState(initial);

  async function toggle(value: boolean) {
    setOn(value);
    await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ autoUpload: value }) });
  }

  return (
    <label className="flex items-start gap-3 text-[15px]">
      <input type="checkbox" checked={on} onChange={(e) => toggle(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--signal-ink)]" />
      <span className="flex flex-col gap-0.5">
        <span>Upload rides I do in Hour Power to Strava automatically</span>
        {on && !canUpload && (
          <span className="text-[13px] text-signal-ink">
            Strava needs your OK first:{" "}
            <a href="/api/strava/connect" className="font-semibold underline">
              reconnect Strava
            </a>{" "}
            and tick “Upload your activities”.
          </span>
        )}
      </span>
    </label>
  );
}
