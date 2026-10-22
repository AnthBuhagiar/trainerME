"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Offer a new training hour power; nothing changes until the rider says so. */
export function TargetsPrompt({ training, proposal }: { training: number; proposal: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const up = proposal > training;

  async function answer(accept: boolean) {
    setBusy(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(accept ? { trainingHourPower: proposal } : { declinedHourPower: proposal }),
    });
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 border-signal-ink bg-card p-5">
      <div className="label" style={{ color: "var(--signal-ink)" }}>{up ? "You’ve got stronger" : "Your hour power has dipped"}</div>
      <p className="text-[15px] leading-snug">
        Your estimate is now <strong>{proposal} W</strong>. Workouts are set from <strong>{training} W</strong>.{" "}
        {up
          ? "Update your targets so sessions keep pace with you?"
          : "Lower your targets to match? Keep them if you think it’s just a few rough days."}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => answer(true)} disabled={busy} className="h-12 rounded-2xl bg-signal-ink text-[15px] font-semibold text-white disabled:opacity-60">
          Use {proposal} W
        </button>
        <button onClick={() => answer(false)} disabled={busy} className="h-12 rounded-2xl border border-line text-[15px] font-semibold disabled:opacity-60">
          Keep {training} W
        </button>
      </div>
    </section>
  );
}
