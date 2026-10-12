"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";

export function ConferenceAccountLinks() {
  const control = "rounded-lg border border-white/30 bg-white/10 px-3 py-2 font-semibold text-white hover:bg-white/20";
  return <div className="mt-3 flex flex-wrap gap-3 text-sm"><Link href="/admin/events/operations?view=account" className={control}>My account</Link><button onClick={() => void signOut({ callbackUrl: "/login" })} className={control}>Sign out</button></div>;
}
