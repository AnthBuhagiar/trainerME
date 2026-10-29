"use client";

import { clock } from "@/lib/player/miniPlayer";

/** The workout's time is up: end it here and upload, or ride on freely. */
export function RideFinished({ elapsed, avg, onEnd, onFree }: { elapsed: number; avg: number | null; onEnd: () => void; onFree: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Workout complete">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-asphalt p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-chalk">
        <div className="flex flex-col gap-1">
          <span className="label" style={{ color: "#9AA6B2" }}>
            Workout complete
          </span>
          <span className="display text-[30px] leading-tight">Nice work.</span>
          <span className="text-[15px]" style={{ color: "#C9D3DD" }}>
            {clock(elapsed)} ridden{avg ? ` · ${avg} W average` : ""}
          </span>
        </div>
        <button onClick={onEnd} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
          End and upload
        </button>
        <button onClick={onFree} className="h-14 rounded-2xl text-[17px] font-semibold" style={{ background: "#1E242C" }}>
          Free ride
        </button>
      </div>
    </div>
  );
}
