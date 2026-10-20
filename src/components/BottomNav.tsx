"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Today" },
  { href: "/week", label: "Week" },
  { href: "/plan", label: "Plan" },
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
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-1 text-[13px] font-semibold ${active ? "text-foreground" : "text-muted"}`}
              >
                <span className={`h-1 w-6 rounded-full ${active ? "bg-signal" : "bg-transparent"}`} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
