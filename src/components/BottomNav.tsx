"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 24px line icons, 2px stroke, drawn to match the Hour Ring's tick style.
const ICONS: Record<string, React.ReactNode> = {
  // Today: a small hour ring with the 12 o'clock tick.
  "/": (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 2.5v3" />
      <path d="M12 12l3-3" />
    </>
  ),
  // Week: seven days in a row.
  "/week": (
    <>
      <rect x="3" y="5" width="18" height="15" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  // Plan: phases stacking towards the event, like a timeline.
  "/plan": <path d="M3 6h9M7 12h10M12 18h9" />,
  // Progress: a rising line.
  "/progress": <path d="M3 19l5-6 4 3 8-10M16 6h4v4" />,
  // Goal: a target.
  "/goal": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>
  ),
};

const ITEMS = [
  { href: "/", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/plan", label: "Plan" },
  { href: "/progress", label: "Progress" },
  { href: "/goal", label: "Goal" },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-label={item.label}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1.5 ${active ? "text-foreground" : "text-muted"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="26"
                  height="26"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {ICONS[item.href]}
                </svg>
                <span className={`h-1 w-5 rounded-full ${active ? "bg-signal" : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
