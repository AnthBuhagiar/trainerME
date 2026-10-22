"use client";

import { useState } from "react";

export function RestoreBackup() {
  const [message, setMessage] = useState<string | null>(null);

  async function restore(file: File | undefined) {
    if (!file) return;
    if (!confirm("Restore this backup? It replaces your goals, plan settings and rides here with the ones in the file.")) return;
    try {
      const res = await fetch("/api/backup", { method: "POST", headers: { "content-type": "application/json" }, body: await file.text() });
      const body = await res.json();
      setMessage(body.error ?? `Restored ${body.restored} files. Reloading…`);
      if (res.ok) setTimeout(() => window.location.assign("/"), 1200);
    } catch {
      setMessage("That file couldn’t be read.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="file"
        accept=".json,application/json"
        onChange={(e) => restore(e.target.files?.[0])}
        className="text-[14px] file:mr-3 file:h-10 file:rounded-full file:border file:border-line file:bg-background file:px-4 file:font-semibold"
      />
      {message && <p className="text-[13px] text-muted">{message}</p>}
    </div>
  );
}
