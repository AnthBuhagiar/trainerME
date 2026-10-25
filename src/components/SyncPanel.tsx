"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Result {
  newActivities: number;
  totalActivities: number;
  streamsFetched: number;
  ridesMissingStreams: number;
  rateLimited: boolean;
  error?: string;
  sources?: string[];
  intervalsError?: string;
}

interface Props {
  connected: boolean;
  missing: number;
  autoUpload: boolean;
  canUpload: boolean;
  /** Epoch ms of the last finished sync, or null. */
  lastSync: number | null;
}

/** Opening the app syncs on its own if the last sync is older than this. */
const AUTO_SYNC_AFTER_MS = 15 * 60_000;

function ago(ms: number): string {
  const min = Math.round((Date.now() - ms) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

export function SyncPanel({ connected, missing, autoUpload, canUpload, lastSync }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [upload, setUpload] = useState(autoUpload);

  async function toggleUpload(on: boolean) {
    setUpload(on);
    await fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ autoUpload: on }) });
  }
  const [result, setResult] = useState<Result | null>(null);
  const started = useRef(false);

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

  // Sync on open when it's been a while, so there is no button to remember.
  useEffect(() => {
    if (!connected || started.current) return;
    if (lastSync && Date.now() - lastSync < AUTO_SYNC_AFTER_MS) return;
    started.current = true;
    void sync();
    // Runs once per visit; sync() only touches state setters and the router.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, lastSync]);

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
  let message = remaining ? `${remaining} rides still to download.` : `Up to date${lastSync && !result ? ` · synced ${ago(lastSync)}` : ""}.`;
  if (result?.error) message = result.error;
  else if (result?.rateLimited) message = `Strava's limit reached. ${remaining} rides left; sync again in 15 minutes.`;
  else if (result) message = result.newActivities || result.streamsFetched ? `${result.newActivities} new activities, ${result.streamsFetched} rides downloaded. ${message}` : `Synced just now. ${message}`;
  if (result?.sources && result.sources.length > 1) message += ` From ${result.sources.join(" and ")}.`;
  if (result?.intervalsError) message += ` ${result.intervalsError}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-[13px] text-muted" aria-live="polite">
          {busy ? "Syncing with Strava…" : message}
        </p>
        <button onClick={sync} disabled={busy} className="shrink-0 text-[14px] font-semibold text-signal-ink disabled:opacity-50">
          {remaining ? "Download rides" : "Sync now"}
        </button>
      </div>
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
