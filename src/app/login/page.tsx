export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  "not-owner": "This Hour Power belongs to another Strava account.",
  declined: "Strava sign-in wasn’t approved.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-6">
      <h1 className="display text-[32px]">Hour Power</h1>
      <p className="text-[15px] text-muted">Sign in with the Strava account this app belongs to.</p>
      {error && NOTICES[error] && <p className="text-[14px] font-semibold text-signal-ink">{NOTICES[error]}</p>}
      <a href="/api/strava/connect" className="flex h-14 items-center justify-center rounded-2xl bg-signal-ink text-[17px] font-semibold text-white">
        Sign in with Strava
      </a>
    </main>
  );
}
