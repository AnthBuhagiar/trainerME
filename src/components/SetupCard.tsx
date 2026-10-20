interface Props {
  hasCredentials: boolean;
  callbackDomain: string;
  notice?: string;
}

const NOTICES: Record<string, string> = {
  declined: "Strava access wasn’t approved. Tap Connect Strava to try again.",
  "no-credentials": "Strava keys not found yet. Add the two secrets (step 1), then restart the codespace.",
  "missing-scope": "Please tick every permission on Strava’s screen so Hour Power can read your rides.",
};

/** First-run steps, shown until Strava is connected. */
export function SetupCard({ hasCredentials, callbackDomain, notice }: Props) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5">
      <h2 className="display text-[20px]">Set up Strava</h2>
      {notice && NOTICES[notice] && <p className="text-[14px] font-semibold text-signal-ink">{NOTICES[notice]}</p>}
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px] leading-snug">
        <li className={hasCredentials ? "text-muted line-through" : ""}>
          Add your Strava <strong>Client ID</strong> and <strong>Client Secret</strong> as secrets named{" "}
          <code>STRAVA_CLIENT_ID</code> and <code>STRAVA_CLIENT_SECRET</code>: GitHub → Settings → Codespaces →
          Secrets (give them access to this repo), then restart the codespace. Running locally instead? Put them in{" "}
          <code>.env.local</code>.
        </li>
        <li>
          In{" "}
          <a className="font-semibold underline" href="https://www.strava.com/settings/api" target="_blank" rel="noreferrer">
            Strava’s API settings
          </a>
          , set <strong>Authorization Callback Domain</strong> to:
          <code className="mt-1 block break-all rounded-lg bg-background px-2 py-1.5 text-[14px]">{callbackDomain}</code>
        </li>
        <li>Tap Connect Strava below and approve.</li>
      </ol>
    </section>
  );
}
