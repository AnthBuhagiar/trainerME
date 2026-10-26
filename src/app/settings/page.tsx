import { asAthlete } from "@/lib/auth/athlete";
import { AutoUploadToggle } from "@/components/AutoUploadToggle";
import { DaysEditor } from "@/components/DaysEditor";
import { choicesFromBudget } from "@/lib/plan/availability";
import { SensorsPanel } from "@/components/SensorsPanel";
import { RestoreBackup } from "@/components/RestoreBackup";
import { authEnabled } from "@/lib/auth/session";
import { loadState } from "@/lib/plan/current";
import { canUpload } from "@/lib/strava/client";

export const dynamic = "force-dynamic";

function SettingsPageView() {
  const { settings, chosenDays, learnedBudget } = loadState();
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

      <section id="sensors" className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
        <h2 className="label">Trainer and heart rate</h2>
        <SensorsPanel />
      </section>

      <section id="days" className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
        <h2 className="label">Your days</h2>
        <p className="text-[14px] leading-snug text-muted">
          {chosenDays
            ? "Your plan uses the days you chose."
            : "Filled in from your last 12 weeks of rides. Change any day you’re not free, then save."}
        </p>
        <DaysEditor initial={chosenDays ?? choicesFromBudget(learnedBudget)} custom={!!chosenDays} />
      </section>

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
        <>
          <form action="/api/logout" method="post">
            <button className="h-12 w-full rounded-2xl border border-line text-[15px] font-semibold text-muted">Sign out</button>
          </form>
          <details className="group rounded-2xl border border-line">
            <summary className="cursor-pointer list-none px-4 py-3 text-[15px] font-semibold text-muted">Delete my account</summary>
            <form action="/api/account" method="post" className="flex flex-col gap-3 border-t border-line p-4">
              <p className="text-[14px] leading-snug">
                Removes all your rides, goals, plan and settings from Hour Power and revokes its Strava access. Your activities on Strava aren’t touched.
                Download a backup first if you might come back.
              </p>
              <button className="h-12 rounded-2xl bg-signal-ink text-[15px] font-semibold text-white">Delete everything</button>
            </form>
          </details>
          <a href="/privacy" className="text-center text-[14px] font-semibold text-muted">
            Privacy
          </a>
        </>
      )}
    </main>
  );
}

export default async function SettingsPage() {
  return asAthlete(() => SettingsPageView());
}
