"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Magnetic } from "./motion";

export function AuthButton({ compact = false }: { compact?: boolean }) {
  const { data, status } = useSession();
  const role = (data?.user as { role?: string } | undefined)?.role;

  if (status === "loading") {
    return <span className="px-4 py-2 text-[13px] text-ink/40" aria-hidden>…</span>;
  }
  if (!data?.user) {
    return (
      <>
        {!compact && (
          <Link href="/contact" className="whitespace-nowrap border border-forest-900/25 px-3 py-2 text-[12px] font-semibold text-forest-900 hover:border-primary">
            Contact
          </Link>
        )}
        <Magnetic strength={4}>
          <Link href="/login" className="whitespace-nowrap bg-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-forest-700">
            Sign in →
          </Link>
        </Magnetic>
      </>
    );
  }
  const portalHref = role && ["member", "associate"].includes(role) ? "/portal" : "/admin";
  return (
    <>
      <span className="hidden text-[12.5px] text-ink/60 xl:inline" title={role}>
        {data.user.name}
      </span>
      <Link href={portalHref} className="whitespace-nowrap bg-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-forest-700">
        {role && ["member", "associate"].includes(role) ? "Member Portal →" : "Console →"}
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="whitespace-nowrap border border-forest-900/25 px-3 py-2 text-[12px] font-semibold text-ink/70 hover:border-primary hover:text-primary"
      >
        Sign out
      </button>
    </>
  );
}
