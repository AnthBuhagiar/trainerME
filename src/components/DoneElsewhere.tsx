"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Confirm a trainer workout was done in another app (Zwift, MyWhoosh…) so the week stays as planned, or undo it. */
export function DoneElsewhere({ date, start, doneIn }: { date: string; start: string; doneIn?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(method: "POST" | "DELETE") {
    setBusy(true);
    await fetch("/api/completions", { method, headers: { "content-type": "application/json" }, body: JSON.stringify({ date, start }) });
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
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <span className="text-[15px] font-semibold">Mark this workout as done?</span>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button onClick={() => send("POST")} disabled={busy} className="h-12 rounded-2xl bg-signal-ink text-[15px] font-semibold text-white disabled:opacity-50">
          Yes, it’s done
        </button>
        <button onClick={() => setOpen(false)} className="h-12 px-4 text-[15px] font-semibold text-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}
