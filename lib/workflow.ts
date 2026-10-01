import type { Permission } from "./auth";

/**
 * Document approval workflow (§25) — the only legal status transitions.
 * Each edge names the capability required; every traversal is audit-logged
 * with previous → new value. Re-open edges return records to Draft.
 */
export type DocStatusKey =
  | "Draft" | "Editorial_Review" | "Institutional_Review"
  | "Approved" | "Published" | "Archived";

export const DOC_TRANSITIONS: Record<DocStatusKey, { to: DocStatusKey; permission: Permission; label: string }[]> = {
  Draft: [
    { to: "Editorial_Review", permission: "documents.edit", label: "Submit for editorial review" },
  ],
  Editorial_Review: [
    { to: "Institutional_Review", permission: "documents.edit", label: "Advance to institutional review" },
    { to: "Draft", permission: "documents.edit", label: "Return to draft" },
  ],
  Institutional_Review: [
    { to: "Approved", permission: "documents.approve", label: "Approve" },
    { to: "Draft", permission: "documents.edit", label: "Return to draft" },
  ],
  Approved: [
    { to: "Published", permission: "documents.publish", label: "Publish" },
    { to: "Draft", permission: "documents.edit", label: "Return to draft" },
  ],
  Published: [
    { to: "Archived", permission: "documents.archive", label: "Archive" },
  ],
  Archived: [
    { to: "Draft", permission: "documents.publish", label: "Re-open as draft" },
  ],
};

export function allowedTransition(from: DocStatusKey, to: DocStatusKey) {
  return DOC_TRANSITIONS[from]?.find((t) => t.to === to) ?? null;
}

export const prettyStatus = (s: string) => s.replace(/_/g, " ");
