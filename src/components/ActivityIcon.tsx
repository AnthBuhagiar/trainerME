import type { ReactNode } from "react";
import type { StripIcon } from "@/lib/plan/weekStrip";

/** Line icons for each kind of session, drawn on a 24-unit grid in the current colour. */
const PATHS: Record<StripIcon, ReactNode> = {
  // Outdoor: a road bike.
  bike: (
    <>
      <circle cx="5" cy="15.5" r="3.5" />
      <circle cx="19" cy="15.5" r="3.5" />
      <path d="M5 15.5h6L9 7.5h7l3 8M11 15.5l5-8M5 15.5l4-8M7.5 7.5h3M16 7.5l-.6-2.5h2.3" />
    </>
  ),
  // Indoor: the same bike, its back wheel held in a trainer and the front on a riser block.
  indoor: (
    <>
      <circle cx="5" cy="13" r="3.5" />
      <circle cx="19" cy="13" r="3.5" />
      <path d="M5 13h6L9 5h7l3 8M11 13l5-8M5 13l4-8M7.5 5h3M16 5l-.6-2.5h2.3" />
      <path d="M5 13 2.5 20M5 13l2.5 7M16.5 18h5v2M1.5 20h21" />
    </>
  ),
  // Strength: a barbell.
  strength: <path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11M3.5 12h-1.5M20.5 12H22" />,
  // Run: a sneaker with speed lines.
  run: <path d="M9 9.5v-2h3l1.5 3 4.5 1.2c2.3.6 3.5 1.8 3.5 3.3v1.5H9zM9 16.5h12.5M12 10.5l1.2-.6M13.2 12.3l1.2-.6M2 10h4M1 13h5M2 16h4" />,
  swim: (
    <>
      <circle cx="16.5" cy="6.5" r="2" />
      <path d="M4 12.5 9 9l3.5 3M2 17c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5" />
    </>
  ),
  row: <path d="M2 16h20l-2.5 3.5h-15zM6 16 16 5M14 5.5l3.5 1.5M9.5 12.5 13 14" />,
  walk: (
    <>
      <circle cx="13" cy="4" r="2" />
      <path d="M12 7.5 10 14l-3 7M12 7.5l1.5 6 3 2.5M11.5 9 7.5 11v3.5M13.5 13.5 15 21" />
    </>
  ),
  other: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};

export const ICON_NAME: Record<StripIcon, string> = {
  bike: "Outdoor ride",
  indoor: "Indoor ride",
  strength: "Strength",
  run: "Run",
  swim: "Swim",
  row: "Row",
  walk: "Walk",
  other: "Activity",
};

export function ActivityIcon({ icon, size = 24 }: { icon: StripIcon; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[icon]}
    </svg>
  );
}
