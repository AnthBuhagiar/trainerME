"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Confirm a trainer workout was done in another app (Zwift, MyWhoosh…) so the week stays as planned, or undo it. */
export function DoneElsewhere({ date, start, doneIn, row }: { date: string; start: string; doneIn?: string; /** As a row inside "Use another app instead". */ row?: boolean }) {
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
  if (row) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-[14px] font-semibold">{open ? "Mark this workout as done?" : "Done it there already?"}</span>
        {open ? (
          <span className="flex shrink-0 gap-2">
            <button onClick={() => setOpen(false)} className="px-2 text-[14px] font-semibold text-muted">
              Cancel
            </button>
            <button onClick={() => send("POST")} disabled={busy} className="rounded-full bg-signal-ink px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-50">
              Yes, done
            </button>
          </span>
        ) : (
          <button onClick={() => setOpen(true)} className="shrink-0 rounded-full border border-line px-4 py-2 text-[14px] font-semibold">
            Mark done
          </button>
        )}
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
