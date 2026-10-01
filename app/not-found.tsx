import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="font-display mt-3 text-4xl leading-tight text-forest-950 md:text-5xl">
        This page could not be found
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/65">
        The address may be mistyped, or the record may have been moved, renamed or withdrawn. Nothing has been published at this location.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-forest-700">
          Return to the homepage
        </Link>
        <Link href="/search" className="border border-primary/30 px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white">
          Search the Forum records
        </Link>
        <Link href="/contact" className="border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink/70 hover:border-primary hover:text-primary">
          Contact the Secretariat
        </Link>
      </div>
      <p className="mt-10 text-[13px] text-ink/50">
        Looking for a specific record? Try the{" "}
        <Link href="/knowledge" className="font-semibold text-primary link-underline">Knowledge Centre</Link>{" "}
        or the <Link href="/news" className="font-semibold text-primary link-underline">news archive</Link>.
      </p>
    </div>
  );
}