"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { clearRide, type RideState } from "@/lib/player/session";
import type { RiderPhysics } from "@/lib/goals/eventTime";
import { buildFit } from "@/lib/export/fit";
import { virtualSpeed } from "@/lib/player/virtualSpeed";
import { buildTcx } from "@/lib/strava/tcx";

export interface Saved {
  url?: string;
  message: string;
  /** Where "Reconnect Strava" goes: Strava, then back to this ride to finish the upload. */
  reconnect?: string;
  ok?: boolean;
}

/** Sending a finished ride to Strava (by itself if auto-upload is on), or as a file to download. */
export function useRideUpload({
  name,
  storageKey,
  planned,
  ride,
  done,
  autoUpload,
  physics,
}: {
  /** For the ride's flat-road speed and distance in downloaded files. */
  physics?: RiderPhysics;
  name: string;
  storageKey: string;
  /** The planned session being ridden, so it counts as done even when ridden on another day. */
  planned?: { date: string; start: string };
  ride: RefObject<RideState>;
  done: boolean;
  autoUpload: boolean;
}) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [saving, setSaving] = useState(false);
  const sent = useRef(false);

  async function save() {
    const r = ride.current;
    if (!r.startedAt) return;
    sent.current = true;
    setSaving(true);
    try {
      const res = await fetch("/api/rides/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, startMs: r.startedAt, samples: r.samples, planned, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const body = await res.json();
      if (body.activityId) setSaved({ url: `https://www.strava.com/activities/${body.activityId}`, message: "Saved to Strava." });
      else if (res.ok) setSaved({ ok: true, message: "Uploaded. Strava is still processing it; it will appear shortly." });
      else {
        const back = `/api/strava/connect?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        setSaved({ message: `${body.kept ? "Saved in Hour Power. " : ""}${body.error ?? "Strava upload failed."}`, reconnect: body.reconnect ? back : undefined });
      }
      if (res.ok) clearRide(storageKey);
    } catch {
      setSaved({ message: "Couldn’t reach the app. Download the file instead and upload it on strava.com." });
    } finally {
      setSaving(false);
    }
  }

  /** The ride as a file: .fit for Garmin Connect, or .tcx. */
  function download(kind: "fit" | "tcx" = "tcx") {
    const r = ride.current;
    if (!r.startedAt) return;
    const moving = physics ? virtualSpeed(r.samples, physics) : null;
    const points = r.samples.map((s, i) => ({ ...s, ...(moving ? { speed: moving[i].speed, distance: moving[i].distance } : {}) }));
    const blob =
      kind === "fit"
        ? new Blob([buildFit(r.startedAt, points, "indoor-cycling", -new Date(r.startedAt).getTimezoneOffset() * 60) as BlobPart], { type: "application/vnd.ant.fit" })
        : new Blob([buildTcx(r.startedAt, r.samples, "Ridden with Hour Power", moving?.map((m) => m.distance))], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hour-power-${new Date(r.startedAt).toISOString().slice(0, 10)}.${kind}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Auto-upload once, when the ride ends with something recorded (unless it was already sent).
  useEffect(() => {
    if (!done || !autoUpload || sent.current || !ride.current.samples.length) return;
    void save();
    // save() reads refs only; running it once on finish is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, autoUpload]);

  return { saved, saving, save, download };
}
