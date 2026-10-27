import Link from "next/link";
import { AgreeToTerms } from "@/components/AgreeToTerms";
import { signedInAthlete } from "@/lib/auth/athlete";
import { multiUser, runAsAthlete } from "@/lib/data/store";
import { hasAcceptedTerms } from "@/lib/legal/acceptance";
import { TERMS_MD, TERMS_VERSION } from "@/lib/legal/terms";
import { Markdown } from "@/lib/ui/Markdown";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terms and Conditions · Hour Power" };

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ accept?: string; error?: string }> }) {
  const { error } = await searchParams;
  const id = multiUser() ? await signedInAthlete() : null;
  // Signed in but not yet agreed to this version (new terms, or signed up before there were any).
  const mustAccept = !!id && !runAsAthlete(id, hasAcceptedTerms);
  const contact = process.env.CONTACT_EMAIL || "the contact address on the Privacy page";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6 text-[15px] leading-relaxed">
      {mustAccept && (
        <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
          <h2 className="display text-[20px]">Before you carry on</h2>
          <p className="text-[14px] leading-snug text-muted">Hour Power has Terms and Conditions. Have a read, then tick the box at the bottom to keep using the app.</p>
          {error === "tick" && <p className="text-[14px] font-semibold text-signal-ink">Tick the box to agree first.</p>}
        </section>
      )}
      <Markdown text={TERMS_MD.replaceAll("{{contact}}", contact)} />
      {mustAccept ? (
        <div className="mt-2 rounded-3xl border border-line bg-card p-5">
          <AgreeToTerms version={TERMS_VERSION} action="/api/terms" method="post" label="Agree and continue" />
        </div>
      ) : (
        <Link href="/" className="font-semibold text-signal-ink">
          Back to Hour Power
        </Link>
      )}
      {mustAccept && (
        <form action="/api/logout" method="post">
          <button className="h-12 w-full text-[14px] font-semibold text-muted">Don’t agree? Sign out</button>
        </form>
      )}
    </main>
  );
}
