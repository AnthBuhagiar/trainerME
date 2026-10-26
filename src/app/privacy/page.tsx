import Link from "next/link";

export const metadata = { title: "Privacy · Hour Power" };

export default function PrivacyPage() {
  const contact = process.env.CONTACT_EMAIL;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6 text-[15px] leading-relaxed">
      <h1 className="display text-[24px]">Privacy</h1>
      <p>Hour Power estimates your hour power from your rides and plans your training. Here is what it keeps and why.</p>
      <h2 className="label">What it reads</h2>
      <p>
        With your permission, your Strava profile (name and weight) and your activities, including power, heart rate and cadence from rides. If you
        allow it, Hour Power also uploads rides you record in it to your Strava account.
      </p>
      <h2 className="label">What it keeps</h2>
      <p>
        A summary of each ride (power curve, averages), the goals, days, away dates and check-ins you enter, and your Strava sign-in tokens. They are
        kept in your own folder on the Hour Power server and used only to show you your estimate and plan.
      </p>
      <h2 className="label">Who sees it</h2>
      <p>
        Only you. Your data is never shown to other riders, sold or shared, and isn’t used for advertising or to train AI. The plan is worked out by fixed
        rules, not an AI service.
      </p>
      <h2 className="label">Deleting it</h2>
      <p>
        <strong>Settings and data → Delete my account</strong> removes everything Hour Power holds for you and revokes its Strava access straight away.
        You can also revoke access at any time in Strava under Settings → My Apps.
      </p>
      {contact && (
        <p>
          Questions: <a className="font-semibold text-signal-ink" href={`mailto:${contact}`}>{contact}</a>
        </p>
      )}
      <Link href="/" className="font-semibold text-signal-ink">
        Back to Hour Power
      </Link>
    </main>
  );
}
