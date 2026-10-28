"use client";

import { useRouter } from "next/navigation";
import { DurationInput } from "@/components/DurationInput";

/** Change a workout's length before riding it: opens the same page at the new length. */
export function LengthPicker({ value, planned, min, max, baseHref }: { value: number; planned: number; min: number; max: number; baseHref: string }) {
  const router = useRouter();
  const go = (m: number) => {
    if (m === value) return;
    router.replace(m === planned ? baseHref : `${baseHref}&minutes=${m}`, { scroll: false });
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <DurationInput value={value} onChange={go} min={min} max={max} label="Workout length" />
      {value !== planned && (
        <button type="button" onClick={() => go(planned)} className="text-[14px] font-semibold text-muted">
          Back to planned
        </button>
      )}
    </div>
  );
}
