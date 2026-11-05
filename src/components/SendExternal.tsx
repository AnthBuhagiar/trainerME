"use client";

import { useState, type ReactNode } from "react";
import type { GarminStatus } from "@/lib/garmin/client";

interface Props {
  /** Intervals.icu API key present on the server. */
  intervals: boolean;
  /** Limit to one session (session page); otherwise the rest of this week and next week. */
  session?: { date: string; start: string; minutes?: string };
  /** A last row, e.g. marking the workout done in that app. */
  footer?: ReactNode;
  /** Garmin Connect: shown when the server has Garmin developer keys. */
  garmin?: GarminStatus;
  /** Where to come back to after connecting Garmin. */
  returnTo?: string;
}

const row = "flex items-center justify-between gap-3 px-4 py-3";

/**
 * Optional hand-off to other apps. Hour Power runs workouts itself; this is for
 * riders who'd rather ride them elsewhere. Folded away by default.
 */
export function SendExternal({ intervals, session, footer, garmin, returnTo }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Sent from this page just now (the server's view arrives with the next page load). */
  const [sentNow, setSentNow] = useState(false);
  const garminState = sentNow ? "sent" : garmin?.sent;
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

  async function sendGarmin() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/garmin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session ?? {}),
      });
      const body = await res.json().catch(() => ({
        // Not the app's own answer: the server crashed, or a proxy gave up waiting.
        error:
          res.status === 524 || res.status === 504
            ? "Garmin took too long to answer. Try again in a minute."
            : `Hour Power couldn’t finish sending (error ${res.status}). The server log says why.`,
      }));
      if (!body.error) setSentNow(true);
      setMessage(
        body.error ??
          (session
            ? "On your Garmin Connect calendar. It reaches your watch or Edge at its next sync."
            : `Sent ${body.sent} rides to Garmin Connect${body.replaced ? `, replacing ${body.replaced} sent earlier` : ""}. They reach your watch or Edge at its next sync.`),
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
      <summary className="relative flex h-12 cursor-pointer list-none items-center justify-center px-10 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
        Use another app instead
        <span className="absolute right-4 text-[13px] text-muted transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <p className="px-4 pb-2 text-[13px] text-muted">Send {what} to:</p>
      <ul className="flex flex-col divide-y divide-line border-t border-line">
        {garmin && (
          <li className={row}>
            <span className="text-[14px]">
              <span className="font-semibold">Garmin Connect</span>
              <span className="block text-[13px] text-muted">
                {garmin.connected && !garmin.canSend
                  ? "Connect again and allow workouts"
                  : garminState === "sent"
                    ? "On your Garmin calendar"
                    : garminState === "changed"
                      ? "Plan changed since you sent it"
                      : "Straight to your calendar, then your watch or Edge"}
              </span>
            </span>
            {garmin.connected && garmin.canSend ? (
              garminState === "sent" ? (
                <button
                  onClick={sendGarmin}
                  disabled={busy}
                  aria-label="Sent to Garmin. Tap to send again"
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-done px-4 py-2 text-[14px] font-semibold text-done disabled:opacity-60"
                >
                  {busy ? (
                    "Sending…"
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <path d="M2.5 7.5 L5.5 10.5 L11.5 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Sent
                    </>
                  )}
                </button>
              ) : (
                <button onClick={sendGarmin} disabled={busy} className="shrink-0 rounded-full bg-signal-ink px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-60">
                  {busy ? "Sending…" : garminState === "changed" ? "Update" : "Send"}
                </button>
              )
            ) : (
              <a
                href={`/api/garmin/connect${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ""}`}
                className="shrink-0 rounded-full border border-line px-4 py-2 text-[14px] font-semibold"
              >
                Connect
              </a>
            )}
          </li>
        )}
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
      {footer && <div className="border-t border-line">{footer}</div>}
      {message && (
        <p className="border-t border-line px-4 py-3 text-[13px] text-muted" aria-live="polite">
          {message}
        </p>
      )}
    </details>
  );
}
