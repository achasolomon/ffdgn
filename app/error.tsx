"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-segment error boundary. Public pages must never leak a stack trace or
 * database error string to the public, so the detail is logged server-side only.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // digest correlates with the server log entry for this render
    console.error("Route segment error", error.digest ?? "(no digest)", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="font-display mt-3 text-4xl leading-tight text-forest-950 md:text-5xl">
        This section could not be loaded
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/65">
        A temporary error interrupted the request. The Forum&rsquo;s records are unaffected.
      </p>
      {error.digest && (
        <p className="mt-2 text-[12px] text-ink/45">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700"
        >
          Try again
        </button>
        <Link href="/" className="border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white">
          Return to the homepage
        </Link>
        <Link href="/contact" className="border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink/70 hover:border-primary hover:text-primary">
          Contact the Secretariat
        </Link>
      </div>
    </div>
  );
}