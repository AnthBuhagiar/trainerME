"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  date: string;
  start: string;
  name: string;
  minutes: number;
  /** Logged with "Done it" (and its Strava activity, if saved there). */
  logged: { stravaId?: number } | null;
  /** Saving to Strava is allowed (upload permission). */
  canUpload: boolean;
}

const btn = "h-12 rounded-2xl border border-line bg-card text-[15px] font-semibold";

/** "Done it" for a gym session that wasn't recorded: counts it, and saves it to Strava as Weight Training. */
export function StrengthDone({ date, start, name, minutes, logged, canUpload }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; reconnect?: boolean } | null>(null);

  async function send(method: "POST" | "DELETE") {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/strength/done", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ date, start }) });
      const body = await res.json();
      if (!res.ok) setMessage({ text: body.error ?? "That didn't work. Try again." });
      else if (method === "POST" && body.stravaError) setMessage({ text: `Done in Hour Power. ${body.stravaError}`, reconnect: body.reconnect });
      else if (method === "DELETE" && body.stravaId) setMessage({ text: "Undone here. It's still on Strava: delete it there if you need to." });
      setConfirming(false);
      router.refresh();
    } catch {
      setMessage({ text: "Couldn’t reach the app." });
    } finally {
      setBusy(false);
    }
  }

  const note = message && (
    <p className="text-center text-[14px] text-muted" aria-live="polite">
      {message.text}{" "}
      {message.reconnect && (
        <a href={`/api/strava/connect?next=${encodeURIComponent(`/session/${date}?start=${start}`)}`} className="font-semibold text-signal-ink">
          Reconnect Strava
        </a>
      )}
    </p>
  );

  if (logged) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
          <span className="text-[15px] font-semibold">
            <span className="text-done">✓</span> Done
            {logged.stravaId && (
              <>
                {" · "}
                <a href={`https://www.strava.com/activities/${logged.stravaId}`} target="_blank" rel="noreferrer" className="text-signal-ink">
                  On Strava
                </a>
              </>
            )}
          </span>
          <button onClick={() => send("DELETE")} disabled={busy} className="text-[14px] font-semibold text-muted disabled:opacity-50">
            Undo
          </button>
        </div>
        {note}
      </div>
    );
  }

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <button onClick={() => setConfirming(true)} className={btn}>
          Done it
        </button>
        {note}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <span className="text-[15px] font-semibold">Mark {name} as done?</span>
      {canUpload && <span className="text-[14px] text-muted">It’s saved to Strava as Weight Training, {minutes} min.</span>}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button onClick={() => send("POST")} disabled={busy} className="h-12 rounded-2xl bg-signal-ink text-[15px] font-semibold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Yes, done"}
        </button>
        <button onClick={() => setConfirming(false)} className="h-12 px-4 text-[15px] font-semibold text-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}
