"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Result {
  newActivities: number;
  totalActivities: number;
  streamsFetched: number;
  ridesMissingStreams: number;
  rateLimited: boolean;
  error?: string;
}

interface Props {
  connected: boolean;
  missing: number;
  autoUpload: boolean;
  canUpload: boolean;
}

export function SyncPanel({ connected, missing, autoUpload, canUpload }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState(autoUpload);

  async function toggleUpload(on: boolean) {
    setUpload(on);
    await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ autoUpload: on }) });
  }
  const [result, setResult] = useState<Result | null>(null);

  async function sync() {
    setBusy(true);
    try {
      const res = await fetch("/api/strava/sync", { method: "POST" });
      setResult(await res.json());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!connected) {
    return (
      <a
        href="/api/strava/connect"
        className="flex h-14 items-center justify-center rounded-2xl bg-signal-ink text-[17px] font-semibold text-white"
      >
        Connect Strava
      </a>
    );
  }

  const remaining = result ? result.ridesMissingStreams : missing;
  let message = remaining ? `${remaining} rides still to download.` : "Up to date.";
  if (result?.error) message = result.error;
  else if (result?.rateLimited) message = `Strava's limit reached. ${remaining} rides left; sync again in 15 minutes.`;
  else if (result) message = `${result.newActivities} new activities, ${result.streamsFetched} rides downloaded. ${message}`;

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={sync}
        disabled={busy}
        className="h-14 rounded-2xl border border-line bg-card text-[16px] font-semibold disabled:opacity-60"
      >
        {busy ? "Syncing with Strava…" : remaining ? "Sync and download rides" : "Sync with Strava"}
      </button>
      <p className="text-center text-[13px] text-muted" aria-live="polite">
        {message}
      </p>
      <label className="flex items-start gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-[15px]">
        <input type="checkbox" checked={upload} onChange={(e) => toggleUpload(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--signal-ink)]" />
        <span className="flex flex-col gap-0.5">
          <span>Upload rides I do in Hour Power to Strava automatically</span>
          {upload && !canUpload && (
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
    </div>
  );
}
