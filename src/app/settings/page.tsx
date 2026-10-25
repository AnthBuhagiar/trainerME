import { AutoUploadToggle } from "@/components/AutoUploadToggle";
import { RestoreBackup } from "@/components/RestoreBackup";
import { authEnabled } from "@/lib/auth/session";
import { loadState } from "@/lib/plan/current";
import { describeSlot } from "@/lib/plan/timeBudget";
import { canUpload } from "@/lib/strava/client";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const { settings, budget } = loadState();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6">
      <h1 className="display text-[24px]">Settings and data</h1>

      <section className="flex flex-col gap-2 rounded-3xl border border-line bg-card p-5 text-[15px]">
        <h2 className="label">You</h2>
        <div className="flex justify-between">
          <span>Weight (from Strava)</span>
          <span className="font-semibold">{settings.weightKg} kg</span>
        </div>
        <div className="flex justify-between">
          <span>Training hour power</span>
          <span className="font-semibold">{settings.trainingHourPower ? `${settings.trainingHourPower} W` : "–"}</span>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
        <h2 className="label">Strava</h2>
        <AutoUploadToggle initial={!!settings.autoUpload} canUpload={canUpload()} />
      </section>

      {budget.slots.length > 0 && (
        <section className="flex flex-col gap-2 rounded-3xl border border-line bg-card p-5">
          <h2 className="label">Your usual week</h2>
          <ul className="flex flex-col gap-1.5 text-[15px]">
            {budget.slots.map((slot) => (
              <li key={`${slot.weekday}-${slot.kind}-${slot.start}-${slot.changedFrom ?? ""}`} className="flex flex-col">
                <span>{describeSlot(slot)}</span>
                {slot.reason && <span className="text-[13px] text-signal-ink">{slot.reason}</span>}
              </li>
            ))}
          </ul>
          <p className="text-[13px] text-muted">Read from your last {budget.weeksAnalysed} weeks of rides; your plan fits inside these slots and follows changes in routine.</p>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
        <h2 className="label">Back up or move your data</h2>
        <p className="text-[14px] leading-snug text-muted">
          One file with your goals, route, away days, check-ins, settings and rides. Use it to move Hour Power to a new home, or keep it as a
          backup. Strava sign-in isn’t included; you connect again in the new place.
        </p>
        <a href="/api/backup" className="flex h-12 items-center justify-center rounded-2xl border border-line text-[15px] font-semibold">
          Download backup
        </a>
        <span className="label mt-1">Restore from a backup</span>
        <RestoreBackup />
      </section>

      {authEnabled() && (
        <form action="/api/logout" method="post">
          <button className="h-12 w-full rounded-2xl border border-line text-[15px] font-semibold text-muted">Sign out</button>
        </form>
      )}
    </main>
  );
}
