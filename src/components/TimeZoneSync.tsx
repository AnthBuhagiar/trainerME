"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Tells the app this phone's time zone when it differs from the one it has, so "today" and ride times are right. */
export function TimeZoneSync({ current }: { current?: string }) {
  const router = useRouter();
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || zone === current) return;
    void fetch("/api/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ timeZone: zone }) })
      .then((r) => r.ok && router.refresh())
      .catch(() => {});
  }, [current, router]);
  return null;
}
