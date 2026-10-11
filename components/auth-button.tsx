"use client";
import { useTemplateCopy } from "@/components/template-content-provider";
import { asRoute as templateRoute } from "@/lib/routes";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Magnetic } from "./motion";
import { isMemberRole, landingFor } from "@/lib/routes";

export function AuthButton({ compact = false }: { compact?: boolean }) {
  const copy = useTemplateCopy("shared-auth-button");

  const { data, status } = useSession();
  const role = (data?.user as { role?: string } | undefined)?.role;

  if (status === "loading") {
    return <span className="px-4 py-2 text-[13px] text-ink/40" aria-hidden>{copy("field-001")}</span>;
  }
  if (!data?.user) {
    return (
      <>
        {!compact && (
          <Link href={templateRoute(copy("field-002"))} className="whitespace-nowrap border border-forest-900/25 px-3 py-2 text-[12px] font-semibold text-forest-900 hover:border-primary">
            {copy("field-003")}</Link>
        )}
        <Magnetic strength={4}>
          <Link href={templateRoute(copy("field-004"))} className="whitespace-nowrap bg-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-forest-700">
            {copy("field-005")}</Link>
        </Magnetic>
      </>
    );
  }
  const member = isMemberRole(role);
  return (
    <>
      <span className="hidden text-[12.5px] text-ink/60 xl:inline" title={role}>
        {data.user.name}
      </span>
      <Link href={landingFor(role)} className="whitespace-nowrap bg-primary px-3 py-2 text-[12px] font-semibold text-white hover:bg-forest-700">
        {member ? copy("field-006") : copy("field-007")}
      </Link>
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="whitespace-nowrap border border-forest-900/25 px-3 py-2 text-[12px] font-semibold text-ink/70 hover:border-primary hover:text-primary"
      >
        {copy("field-008")}</button>
    </>
  );
}
