"use client";

import { useState } from "react";

interface Props {
  /** Intervals.icu API key present on the server. */
  intervals: boolean;
  /** Limit to one session (session page); otherwise the rest of this week and next week. */
  session?: { date: string; start: string; minutes?: string };
}

const row = "flex items-center justify-between gap-3 px-4 py-3";

/**
 * Optional hand-off to other apps. Hour Power runs workouts itself; this is for
 * riders who'd rather ride them elsewhere. Folded away by default.
 */
export function SendExternal({ intervals, session }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const query = session ? `&date=${session.date}&start=${session.start}${session.minutes ? `&minutes=${session.minutes}` : ""}` : "";
  const what = session ? "this workout" : "this week and next";

  async function sendIntervals() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/intervals/send", { method: "POST" });
      const body = await res.json();
      setMessage(
        body.error ?? `Sent ${body.sent} rides to Intervals.icu${body.replaced ? `, replacing ${body.replaced} sent earlier` : ""}. They reach Garmin Connect and Zwift when those sync.`,
      );
    } catch {
      setMessage("Couldn’t reach the app.");
    } finally {
      setBusy(false);
    }
  }

  const download = (format: string) => `/api/export?format=${format}${query}`;

  return (
    <details className="group rounded-2xl border border-line bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] font-semibold">
        Use another app instead
        <span className="text-muted transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <p className="px-4 pb-2 text-[13px] text-muted">Send {what} to:</p>
      <ul className="flex flex-col divide-y divide-line border-t border-line">
        {!session && (
          <li className={row}>
            <span className="text-[14px]">
              <span className="font-semibold">Intervals.icu</span>
              <span className="block text-[13px] text-muted">On to Garmin Connect and Zwift, if connected there</span>
            </span>
            {intervals ? (
              <button onClick={sendIntervals} disabled={busy} className="shrink-0 rounded-full bg-signal-ink px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-60">
                {busy ? "Sending…" : "Send"}
              </button>
            ) : (
              <span className="shrink-0 text-[12px] text-muted">Add API key</span>
            )}
          </li>
        )}
        <li className={row}>
          <span className="text-[14px]">
            <span className="font-semibold">Zwift</span>
            <span className="block text-[13px] text-muted">.zwo: put in Documents/Zwift/Workouts/&lt;your id&gt;</span>
          </span>
          <a href={download("zwo")} className="shrink-0 rounded-full border border-line px-4 py-2 text-[14px] font-semibold">
            Download
          </a>
        </li>
        <li className={row}>
          <span className="text-[14px]">
            <span className="font-semibold">Other trainer apps</span>
            <span className="block text-[13px] text-muted">.erg with watt targets, for apps that import ERG files</span>
          </span>
          <a href={download("erg")} className="shrink-0 rounded-full border border-line px-4 py-2 text-[14px] font-semibold">
            Download
          </a>
        </li>
        <li className={row}>
          <span className="text-[14px]">
            <span className="font-semibold">Phone calendar</span>
            <span className="block text-[13px] text-muted">.ics for Google or Apple Calendar, linking back here</span>
          </span>
          <a href={download("ics")} className="shrink-0 rounded-full border border-line px-4 py-2 text-[14px] font-semibold">
            Download
          </a>
        </li>
      </ul>
      {message && (
        <p className="border-t border-line px-4 py-3 text-[13px] text-muted" aria-live="polite">
          {message}
        </p>
      )}
    </details>
  );
}
