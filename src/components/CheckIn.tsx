"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Mood } from "@/lib/plan/checkin";

const OPTIONS: { mood: Mood; label: string }[] = [
  { mood: "good", label: "Good to go" },
  { mood: "tired", label: "Tired" },
  { mood: "short", label: "Short on time" },
];

export function CheckIn({ date, mood }: { date: string; mood?: Mood }) {
  const router = useRouter();
  const [current, setCurrent] = useState<Mood | undefined>(mood);

  async function pick(next: Mood) {
    const value = next === current ? null : next; // tap again to undo
    setCurrent(value ?? undefined);
    await fetch("/api/checkin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ date, mood: value }) });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1.5 px-1">
      <span className="text-[14px] text-muted">How are you today?</span>
      <div className="flex gap-2" role="group" aria-label="Check-in">
        {OPTIONS.map((o) => (
          <button
            key={o.mood}
            onClick={() => pick(o.mood)}
            aria-pressed={current === o.mood}
            className={`h-10 flex-1 rounded-full border text-[14px] font-semibold ${
              current === o.mood ? "border-asphalt bg-asphalt text-chalk dark:border-chalk dark:bg-chalk dark:text-asphalt" : "border-line bg-card"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
