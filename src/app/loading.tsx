/** Shown the moment you tap a tab, while the server puts the page together. */
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-5 px-5 py-6" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-line" />
      <div className="h-44 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-24 animate-pulse rounded-3xl bg-line/60" />
      <div className="h-24 animate-pulse rounded-3xl bg-line/60" />
    </main>
  );
}
