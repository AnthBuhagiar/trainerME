"use client";

import { useState } from "react";
import { shareCode } from "@/components/ReferralCard";

interface Props {
  code: string;
  shareUrl: string;
  /** Riders still needed to keep the free subscription. */
  needed: number;
  active: number;
  freeUntil: string;
}

/**
 * Pops up on Today, at most once a week, in the last month of a free year when
 * fewer than six referrals are still subscribed. Encouraging, never a nag.
 */
export function ReferralReminder({ code, shareUrl, needed, active, freeUntil }: Props) {
  const [open, setOpen] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const date = new Date(freeUntil).toLocaleDateString("en-AU", { day: "numeric", month: "long" });

  async function close() {
    setOpen(false);
    await fetch("/api/referral", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reminderSeen: true }) }).catch(
      () => undefined,
    );
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="referral-reminder-title">
      <div className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-card p-6 shadow-xl">
        <span className="label">Your free year</span>
        <h2 id="referral-reminder-title" className="display text-[24px] leading-tight">
          You’re {needed} rider{needed === 1 ? "" : "s"} away from another free year
        </h2>
        <p className="text-[15px] leading-snug">
          Thanks for bringing riders to Hour Power. {active} of them {active === 1 ? "is" : "are"} still riding with it. Invite {needed} more mate
          {needed === 1 ? "" : "s"} before {date} and your next year is free too. If not, your subscription picks up again on {date}, and the moment
          you’re back to six, you’re free again.
        </p>
        <p className="text-[14px] text-muted">
          Your code: <span className="font-semibold tracking-[0.18em] text-foreground">{code}</span>
        </p>
        <button onClick={async () => setNote(await shareCode(code, shareUrl))} className="h-12 rounded-2xl bg-signal-ink text-[16px] font-semibold text-white">
          Share my code
        </button>
        <button onClick={close} className="h-12 rounded-2xl border border-line text-[15px] font-semibold text-muted">
          Maybe later
        </button>
        {note && <p className="text-center text-[13px] text-muted">{note}</p>}
      </div>
    </div>
  );
}
