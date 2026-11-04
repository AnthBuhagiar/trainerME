import type { Saved } from "@/lib/player/useRideUpload";

/** After the ride: save it to Strava (or try again), or download the file. */
export function RideSaved({ saved, saving, onSave, onDownload }: { saved: Saved | null; saving: boolean; onSave: () => void; onDownload: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      {!saved?.url && !saved?.ok && !saving && (
        <button onClick={onSave} className="h-14 rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
          {saved ? "Try again" : "Save to Strava"}
        </button>
      )}
      {saving && <p className="text-center text-[14px]">Saving to Strava…</p>}
      {saved && (
        <p className="text-center text-[14px]" aria-live="polite">
          {saved.message}{" "}
          {saved.url && (
            <a href={saved.url} target="_blank" rel="noreferrer" className="font-semibold text-signal-ink">
              Open in Strava
            </a>
          )}
          {saved.reconnect && (
            <a href={saved.reconnect} className="font-semibold text-signal-ink">
              Reconnect Strava
            </a>
          )}
        </p>
      )}
      <button onClick={onDownload} className="h-12 text-[15px] font-semibold text-muted">
        Download ride file (.tcx)
      </button>
    </div>
  );
}
