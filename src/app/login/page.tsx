import Link from "next/link";
import { AgreeToTerms } from "@/components/AgreeToTerms";
import { TERMS_VERSION } from "@/lib/legal/terms";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, string> = {
  declined: "Strava sign-in wasn’t approved.",
  "missing-scope": "Hour Power needs to read your activities. Sign in again and leave the boxes ticked.",
  full: "Hour Power is full for now. Try again later.",
  code: "That recommender code isn’t one we know. Check it, or leave the box empty.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; deleted?: string; ref?: string }> }) {
  const { error, deleted, ref } = await searchParams;
  // From a rider's shared link (or sent back after a typo): letters and numbers only.
  const initial = (ref ?? "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-5 py-6">
      <h1 className="display text-[32px]">Hour Power</h1>
      <p className="text-[15px] leading-snug text-muted">
        Your hour power, estimated from every ride, and a training plan built around your week. Sign in with Strava: Hour Power reads your rides to
        work it out, and only you can see your data.
      </p>
      {deleted && <p className="text-[14px] font-semibold">Your account and data are deleted.</p>}
      {error && NOTICES[error] && <p className="text-[14px] font-semibold text-signal-ink">{NOTICES[error]}</p>}
      <AgreeToTerms version={TERMS_VERSION} action="/api/strava/connect" method="get" label="Sign in with Strava" referral={{ initial }} />
      <div className="flex justify-center gap-6 text-[14px] font-semibold text-muted">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
    </main>
  );
}
