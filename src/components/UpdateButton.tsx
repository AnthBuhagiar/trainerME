"use client";

import { useEffect, useState } from "react";

type State =
  | { kind: "checking" }
  | { kind: "current" }
  | { kind: "available"; behind: number }
  | { kind: "updating" }
  | { kind: "restarting" }
  | { kind: "error"; message: string }
  | { kind: "off" };

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      if ((await fetch("/api/update", { cache: "no-store" })).ok) return;
    } catch {
      // still restarting
    }
  }
}

export function UpdateButton() {
  const [state, setState] = useState<State>({ kind: "checking" });

  useEffect(() => {
    fetch("/api/update", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => {
        if (!b.enabled) setState({ kind: "off" });
        else if (b.error) setState({ kind: "error", message: "Couldn’t check for updates." });
        else setState(b.behind > 0 ? { kind: "available", behind: b.behind } : { kind: "current" });
      })
      .catch(() => setState({ kind: "error", message: "Couldn’t check for updates." }));
  }, []);

  async function update() {
    setState({ kind: "updating" });
    const res = await fetch("/api/update", { method: "POST" });
    const body = await res.json();
    if (!res.ok) return setState({ kind: "error", message: body.error ?? "Update failed." });
    if (body.restart) {
      setState({ kind: "restarting" });
      await new Promise((r) => setTimeout(r, 3000));
      await waitForServer();
    }
    window.location.reload();
  }

  if (state.kind === "off" || state.kind === "checking") return null;
  if (state.kind === "current") return <p className="text-center text-[13px] text-muted">Hour Power is up to date.</p>;
  if (state.kind === "error") return <p className="text-center text-[13px] text-muted">{state.message}</p>;
  return (
    <button
      onClick={update}
      disabled={state.kind !== "available"}
      className="h-12 rounded-2xl border border-line bg-card text-[15px] font-semibold disabled:opacity-60"
    >
      {state.kind === "available"
        ? `Update Hour Power (${state.behind} new ${state.behind === 1 ? "change" : "changes"})`
        : state.kind === "updating"
          ? "Updating…"
          : "Restarting, back in a moment…"}
    </button>
  );
}
