"use client";

import { useState } from "react";

interface Props {
  code: string;
  shareUrl: string;
  joined: number;
  active: number;
  longTerm: number;
  needed: number;
  freeUntil: string | null;
  lifetime: boolean;
  referredBy: string | null;
  canEnterCode: boolean;
  /** Subscriptions are open, so subscribed referrals can count. */
  billingOpen: boolean;
}

const riders = (n: number) => `${n} rider${n === 1 ? "" : "s"}`;

/** Open the share sheet, or copy the invite if there isn't one. Returns a note to show, if any. */
export async function shareCode(code: string, url: string): Promise<string | null> {
  const text = `I train with Hour Power. Use my code ${code} when you sign up.`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Hour Power", text, url });
      return null;
    }
    await navigator.clipboard.writeText(`${text} ${url}`);
    return "Link copied.";
  } catch {
    return null; // share sheet closed, or clipboard blocked
  }
}

/** The rider's own code to share, how many have joined with it (a count, never who), and who recommended them. */
export function ReferralCard(p: Props) {
  const [note, setNote] = useState<string | null>(null);
  const [entered, setEntered] = useState(p.referredBy);
  const [busy, setBusy] = useState(false);

  async function share() {
    setNote(await shareCode(p.code, p.shareUrl));
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(p.code);
      setNote("Code copied.");
    } catch {
      setNote(`Your code is ${p.code}.`);
    }
  }

  async function submit(form: HTMLFormElement) {
    const code = new FormData(form).get("code");
    setBusy(true);
    try {
      const res = await fetch("/api/referral", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const body = await res.json();
      if (res.ok) {
        setEntered(String(code).trim().toUpperCase());
        setNote("Thanks. Saved.");
      } else setNote(body.error ?? "That didn’t save. Try again.");
    } catch {
      setNote("That didn’t save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const freeDate = p.freeUntil ? new Date(p.freeUntil).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="display text-[32px] tracking-[0.18em]">{p.code}</span>
        <div className="flex gap-2">
          <button type="button" onClick={copyCode} className="h-10 rounded-full border border-line px-4 text-[14px] font-semibold">
            Copy
          </button>
          <button type="button" onClick={share} className="h-10 rounded-full bg-signal-ink px-4 text-[14px] font-semibold text-white">
            Share
          </button>
        </div>
      </div>
      <p className="text-[14px] leading-snug text-muted">
        Share your code with riding mates. When {p.needed} riders who joined with it are subscribed, your subscription is free, renewed each year
        while they stay. If {p.needed} of them stay subscribed for 2 years, you ride free for life.
      </p>
      <p className="text-[15px]">
        {p.lifetime ? (
          <span className="font-semibold">You ride free for life. Thanks for bringing so many riders to Hour Power.</span>
        ) : freeDate ? (
          <>
            <span className="font-semibold">Free until {freeDate}.</span> {p.active} of {p.needed} subscribed now.
          </>
        ) : p.billingOpen ? (
          <>
            <span className="font-semibold">
              {Math.min(p.active, p.needed)} of {p.needed}
            </span>{" "}
            subscribed{p.joined > p.active ? ` · ${riders(p.joined)} joined with your code` : ""}
          </>
        ) : (
          <>
            <span className="font-semibold">{riders(p.joined)}</span> joined with your code. They’ll count once subscriptions open.
          </>
        )}
      </p>
      {p.billingOpen && !p.lifetime && p.longTerm > 0 && (
        <p className="text-[14px] text-muted">
          Free for life: {Math.min(p.longTerm, p.needed)} of {p.needed} riders have been subscribed for 2 years.
        </p>
      )}
      {entered ? (
        <p className="text-[14px] text-muted">Recommended by code {entered}.</p>
      ) : (
        p.canEnterCode && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit(e.currentTarget);
            }}
          >
            <input
              name="code"
              required
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="Recommender’s code"
              className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-background px-3 text-[15px] uppercase placeholder:normal-case"
            />
            <button disabled={busy} className="h-11 rounded-2xl border border-line px-4 text-[14px] font-semibold disabled:opacity-40">
              Add
            </button>
          </form>
        )
      )}
      {note && <p className="text-[13px] text-muted">{note}</p>}
    </div>
  );
}
