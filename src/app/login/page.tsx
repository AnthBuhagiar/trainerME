export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  declined: "Strava sign-in wasn’t approved.",
  "missing-scope": "Hour Power needs to read your activities. Sign in again and leave the boxes ticked.",
  full: "Hour Power is full for now. Try again later.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string }> }) {
  const { error, deleted } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-6">
      <h1 className="display text-[32px]">Hour Power</h1>
      <p className="text-[15px] leading-snug text-muted">
        Your hour power, estimated from every ride, and a training plan built around your week. Sign in with Strava: Hour Power reads your rides to
        work it out, and only you can see your data.
      </p>
      {deleted && <p className="text-[14px] font-semibold">Your account and data are deleted.</p>}
      {error && NOTICES[error] && <p className="text-[14px] font-semibold text-signal-ink">{NOTICES[error]}</p>}
      <a href="/api/strava/connect" className="flex h-14 items-center justify-center rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
        Sign in with Strava
      </a>
      <a href="/privacy" className="text-center text-[14px] font-semibold text-muted">
        Privacy
      </a>
    </main>
  );
}
