"use client";

import { useState } from "react";

export function SendToGarmin({ configured }: { configured: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!configured) {
    return (
      <p className="rounded-2xl border border-line bg-card px-4 py-3 text-[14px] text-muted">
        To get these on your Garmin calendar, connect Intervals.icu: add your Intervals.icu API key as the Codespaces secret{" "}
        <code>INTERVALS_API_KEY</code> and restart the codespace (see README).
      </p>
    );
  }

  async function send() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/intervals/send", { method: "POST" });
      const body = await res.json();
      setMessage(
        body.error ??
          `Sent ${body.sent} rides to Intervals.icu${body.replaced ? ` (replaced ${body.replaced} sent earlier)` : ""}. They reach Garmin Connect on its next sync.`,
      );
    } catch {
      setMessage("Couldn’t reach the app. Is it still running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={send} disabled={busy} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white disabled:opacity-60">
        {busy ? "Sending…" : "Send rides to Garmin"}
      </button>
      {message && (
        <p className="text-center text-[13px] text-muted" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
}
