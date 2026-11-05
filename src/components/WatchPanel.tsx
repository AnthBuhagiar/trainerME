"use client";

import { useState } from "react";

/**
 * Settings › Garmin watch app: link the watch by entering the code it shows.
 * The watch then gets its own key through the phone; nothing to type on it.
 */
export function WatchPanel({ created }: { created: string | null }) {
  const [code, setCode] = useState("");
  const [linked, setLinked] = useState(!!created);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function link(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/watch/link/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "That didn’t work. Try again.");
      setLinked(true);
      setDone(true);
      setCode("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/watch/key", { method: "DELETE" });
      if (!res.ok) throw new Error("That didn’t work. Try again.");
      setLinked(false);
      setDone(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 text-[15px]">
      <p className="text-[14px] leading-snug text-muted">
        Hour power, today’s session with watt targets, the check-in and your goal countdown on the wrist, kept up to date through your phone.
      </p>
      {done ? (
        <p className="text-[14px] font-semibold" aria-live="polite">
          Linked. Your watch shows your day in a few seconds.
        </p>
      ) : (
        linked && <p className="text-[14px]">A watch is linked{created ? ` (since ${new Date(created).toLocaleDateString("en-AU")})` : ""}. Linking another replaces it.</p>
      )}
      <form onSubmit={link} className="flex flex-col gap-2">
        <label htmlFor="watch-code" className="label">
          Code on the watch
        </label>
        <p className="text-[13px] leading-snug text-muted">Open Hour Power on the watch. It shows a code until it’s linked.</p>
        <div className="flex gap-2">
          <input
            id="watch-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="K7P-42Q"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={9}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-card px-4 text-[18px] font-semibold tracking-widest"
          />
          <button type="submit" disabled={busy || code.replace(/[^A-Za-z0-9]/g, "").length !== 6} className="h-12 rounded-2xl bg-signal-ink px-5 text-[15px] font-semibold text-white disabled:opacity-50">
            Link
          </button>
        </div>
      </form>
      {error && (
        <p className="text-[14px] font-semibold text-signal-ink" aria-live="polite">
          {error}
        </p>
      )}
      {linked && (
        <button type="button" disabled={busy} onClick={unlink} className="h-12 rounded-2xl border border-line text-[15px] font-semibold disabled:opacity-60">
          Unlink the watch
        </button>
      )}
    </div>
  );
}
