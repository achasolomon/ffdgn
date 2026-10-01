/** Route-level skeleton shown while a page's data is fetched from MySQL. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-shell px-5 py-14" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading content…</span>
      <div className="animate-pulse" aria-hidden>
        <div className="h-3 w-28 bg-ink/10" />
        <div className="mt-4 h-9 w-3/4 bg-ink/10" />
        <div className="mt-3 h-4 w-full bg-ink/5" />
        <div className="mt-2 h-4 w-2/3 bg-ink/5" />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border hairline bg-white p-5">
              <div className="h-32 bg-ink/5" />
              <div className="mt-4 h-4 w-3/4 bg-ink/10" />
              <div className="mt-2 h-3 w-full bg-ink/5" />
              <div className="mt-2 h-3 w-5/6 bg-ink/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}