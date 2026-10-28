import Link from "next/link";

/**
 * The tick box riders must check before going on: on the sign-in page it sends
 * them to Strava, on the terms page it records acceptance. `required` stops an
 * unticked submit, and the button lights up from the box itself (CSS :has), so
 * it's right even before the page's JavaScript loads.
 */
export function AgreeToTerms({
  version,
  action,
  method,
  label,
  referral,
}: {
  version: string;
  action: string;
  method: "get" | "post";
  label: string;
  /** On the sign-in page: an optional box for a recommender's code, pre-filled from a shared link. */
  referral?: { initial: string };
}) {
  return (
    <form action={action} method={method} className="group flex flex-col gap-4">
      {referral && (
        <label className="flex flex-col gap-1.5 text-[15px]">
          <span>
            Recommended by a rider? <span className="text-muted">Their code (optional)</span>
          </span>
          <input
            name="ref"
            defaultValue={referral.initial}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            className="h-12 rounded-2xl border border-line bg-background px-4 text-[17px] font-semibold uppercase tracking-[0.18em]"
          />
        </label>
      )}
      <label className="flex items-start gap-3 text-[15px] leading-snug">
        <input type="checkbox" name="agree" value={version} required className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--signal-ink)]" />
        <span>
          I’m 18 or over and I agree to the{" "}
          <Link href="/terms" className="font-semibold text-signal-ink underline">
            Terms and Conditions
          </Link>
          . Hour Power gives training guidance, not medical advice.
        </span>
      </label>
      <button className="flex h-14 items-center justify-center rounded-2xl bg-signal-ink text-[17px] font-semibold text-white opacity-40 transition-opacity group-has-[input:checked]:opacity-100">
        {label}
      </button>
    </form>
  );
}
