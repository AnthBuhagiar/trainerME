"use client";

import { useState } from "react";

/**
 * Settings › Garmin watch app: make the key the watch sends, shown once, with
 * the server address to type beside it in the app's settings in Garmin Connect.
 */
export function WatchPanel({ server, created }: { server: string; created: string | null }) {
  const [key, setKey] = useState<string | null>(null);
  const [on, setOn] = useState(!!created);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(method: "POST" | "DELETE") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/watch/key", { method });
      const body = (await res.json()) as { key?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "That didn’t work. Try again.");
      setKey(body.key ?? null);
      setOn(method === "POST");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 text-[15px]">
      <p className="text-[14px] leading-snug text-muted">
        Hour power, today’s session with watt targets, the check-in and your goal countdown on the wrist. In the Connect IQ app, open Hour Power’s settings and enter
        these two:
      </p>
      <div className="flex flex-col gap-1">
        <span className="label">Server</span>
        <code className="break-all rounded-xl bg-asphalt/5 px-3 py-2 text-[14px]">{server}</code>
      </div>
      {key ? (
        <div className="flex flex-col gap-1">
          <span className="label">Watch key</span>
          <code className="break-all rounded-xl bg-asphalt/5 px-3 py-2 text-[16px] font-semibold tracking-wide">{key}</code>
          <span className="text-[13px] text-muted">Shown once. Making a new key stops this one.</span>
        </div>
      ) : (
        on && <p className="text-[14px]">A watch key is on{created ? ` (made ${new Date(created).toLocaleDateString("en-AU")})` : ""}.</p>
      )}
      {error && (
        <p className="text-[14px] font-semibold text-signal-ink" aria-live="polite">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => call("POST")}
        className="h-12 rounded-2xl bg-signal-ink text-[15px] font-semibold text-white disabled:opacity-60"
      >
        {on ? "Make a new watch key" : "Make a watch key"}
      </button>
      {on && (
        <button type="button" disabled={busy} onClick={() => call("DELETE")} className="h-12 rounded-2xl border border-line text-[15px] font-semibold disabled:opacity-60">
          Turn the watch off
        </button>
      )}
    </div>
  );
}
