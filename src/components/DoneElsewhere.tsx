"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Mark a trainer workout as done in another app (Zwift, MyWhoosh…), or undo it. */
export function DoneElsewhere({ date, start, apps, doneIn }: { date: string; start: string; apps: readonly string[]; doneIn?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(method: "POST" | "DELETE", app?: string) {
    setBusy(true);
    await fetch("/api/completions", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ date, start, app }) });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (doneIn) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
        <span className="text-[15px] font-semibold">
          <span className="text-done">✓</span> Done in {doneIn}
        </span>
        <button onClick={() => send("DELETE")} disabled={busy} className="text-[14px] font-semibold text-muted">
          Undo
        </button>
      </div>
    );
  }
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="h-12 rounded-2xl border border-line bg-card text-[15px] font-semibold">
        Done it in another app
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
      <span className="label">Done it in</span>
      <div className="flex flex-wrap gap-2">
        {apps.map((app) => (
          <button key={app} onClick={() => send("POST", app)} disabled={busy} className="h-10 rounded-full border border-line px-4 text-[15px] font-semibold disabled:opacity-50">
            {app}
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(false)} className="self-start text-[14px] font-semibold text-muted">
        Cancel
      </button>
    </div>
  );
}
