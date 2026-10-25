import Link from "next/link";
import { ChangeList } from "@/components/ChangeList";
import { loadState } from "@/lib/plan/current";

export const dynamic = "force-dynamic";

/** The full "why it changed" history, one line per ride that moved the estimate. */
export default function ChangesPage() {
  const { history } = loadState();
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-5 py-6">
      <Link href="/progress" className="label">
        ← Progress
      </Link>
      <h1 className="display text-[24px]">Every change</h1>
      <p className="text-[14px] text-muted">How each ride moved your hour power estimate, newest first.</p>
      {history?.ledger.length ? <ChangeList entries={history.ledger} /> : <p className="text-[15px] text-muted">No changes yet.</p>}
    </main>
  );
}
