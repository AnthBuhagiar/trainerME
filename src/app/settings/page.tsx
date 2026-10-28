import { asAthlete } from "@/lib/auth/athlete";
import { AutoUploadToggle } from "@/components/AutoUploadToggle";
import { DaysEditor } from "@/components/DaysEditor";
import { choicesFromBudget } from "@/lib/plan/availability";
import { SensorsPanel } from "@/components/SensorsPanel";
import { RestoreBackup } from "@/components/RestoreBackup";
import { ReferralCard } from "@/components/ReferralCard";
import { headers } from "next/headers";
import { currencyForCountry, formatPrice, PLANS, yearlySavingMinor, type Currency } from "@/lib/billing/plans";
import { currentAthlete, multiUser } from "@/lib/data/store";
import { BILLING_OPEN, REFERRALS_FOR_REWARD, referralSummary } from "@/lib/referral/referral";
import { authEnabled } from "@/lib/auth/session";
import { loadState } from "@/lib/plan/current";
import { appUrl, autoUploadOn, canUpload } from "@/lib/strava/client";

export const dynamic = "force-dynamic";

function SettingsPageView({ currency }: { currency: Currency }) {
  const { settings, chosenDays, learnedBudget } = loadState();
  const athlete = multiUser() ? currentAthlete() : null;
  const referral = athlete ? referralSummary(athlete) : null;
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

      {referral && (
        <section id="refer" className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
          <h2 className="label">Your referral code</h2>
          <ReferralCard
            {...referral}
            shareUrl={`${appUrl()}/login?ref=${referral.code}`}
            needed={REFERRALS_FOR_REWARD}
            billingOpen={BILLING_OPEN}
          />
        </section>
      )}

      {referral && (
        <section id="subscription" className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
          <h2 className="label">Subscription</h2>
          <div className="grid grid-cols-2 gap-3">
            {PLANS.map((plan) => (
              <div key={plan.id} className="flex flex-col gap-0.5 rounded-2xl border border-line p-4">
                <span className="text-[14px] text-muted">{plan.label}</span>
                <span className="display text-[24px]">{formatPrice(plan.priceMinor, currency)}</span>
                <span className="text-[13px] text-muted">
                  {plan.months === 1 ? "a month" : `a year · save ${formatPrice(yearlySavingMinor(), currency)}`}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[14px] leading-snug text-muted">
            {referral.lifetime || referral.freeUntil
              ? "Your referrals cover your subscription."
              : BILLING_OPEN
                ? `Prices in ${currency.taxNote}`
                : `Subscriptions aren’t open yet, so there’s nothing to pay. Prices in ${currency.taxNote}`}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
        <h2 className="label">Strava</h2>
        <AutoUploadToggle initial={autoUploadOn(settings)} canUpload={canUpload()} />
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
            : "Taken from your recent rides. Change any day, then save."}
        </p>
        <DaysEditor initial={chosenDays ?? choicesFromBudget(learnedBudget)} custom={!!chosenDays} />
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
        <h2 className="label">Back up or move your data</h2>
        <p className="text-[14px] leading-snug text-muted">
          Your goals, settings and rides in one file.
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
          <div className="flex justify-center gap-6 text-[14px] font-semibold text-muted">
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
          </div>
        </>
      )}
    </main>
  );
}

export default async function SettingsPage() {
  // Prices show in the rider's own currency, from the country Cloudflare reports.
  const currency = currencyForCountry((await headers()).get("cf-ipcountry"));
  return asAthlete(() => SettingsPageView({ currency }));
}
