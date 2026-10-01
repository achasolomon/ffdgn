// RBAC — capability-based permissions (§26). Single source of truth; never
// scatter role checks through components. Server actions / API routes must
// call `requirePermission(session, "...")`.

export const PERMISSIONS = [
  "members.view", "members.create", "members.update", "members.delete",
  "documents.view", "documents.create", "documents.edit", "documents.publish", "documents.archive", "documents.approve",
  "events.view", "events.create", "events.edit", "events.publish",
  "committees.manage", "users.manage", "audit.view",
  "news.publish", "partnerships.manage", "settings.manage", "media.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type Role =
  | "super_admin" | "secretariat_admin" | "membership_admin" | "content_editor"
  | "events_manager" | "knowledge_manager" | "committee_manager" | "communications_officer"
  | "auditor" | "member" | "associate" | "public";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [...PERMISSIONS],
  secretariat_admin: ["members.view","members.create","members.update","documents.view","documents.create","documents.edit","documents.publish","events.view","events.create","events.edit","events.publish","committees.manage","news.publish","partnerships.manage","settings.manage","media.manage"],
  membership_admin: ["members.view","members.create","members.update"],
  content_editor: ["documents.view","documents.create","documents.edit","news.publish","media.manage"],
  events_manager: ["events.view","events.create","events.edit","events.publish","media.manage"],
  knowledge_manager: ["documents.view","documents.create","documents.edit","documents.publish","documents.archive"],
  committee_manager: ["committees.manage","documents.view"],
  communications_officer: ["news.publish","events.view","media.manage"],
  auditor: ["audit.view","members.view","documents.view","events.view"],
  member: ["members.view","documents.view","events.view"],
  associate: ["members.view","documents.view","events.view"],
  public: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
export function can(role: Role, permission: Permission): boolean { return hasPermission(role, permission); }

export const STAFF_ROLES: Role[] = [
  "super_admin", "secretariat_admin", "membership_admin", "content_editor",
  "events_manager", "knowledge_manager", "committee_manager", "communications_officer", "auditor",
];

export const PORTAL_ROLES: Role[] = [...STAFF_ROLES, "member", "associate"];

/* Audit trail (§30) — production writes go to the append-only `audit_log`
 * table via lib/server-auth.ts `audit()`. The in-memory log below is the
 * preview fallback when no database is configured. */
export interface AuditEntry {
  id: string; actor: string; action: string; resource: string;
  timestamp: string; ip: string; previousValue?: string; newValue?: string;
}
export const auditLog: AuditEntry[] = [
  { id: "a1", actor: "Secretariat Admin", action: "members.status.change", resource: "Member: ngozi-eze", timestamp: "2026-09-28T09:42:00Z", ip: "197.210.x.x", previousValue: "Pending", newValue: "Associate" },
  { id: "a2", actor: "Knowledge Manager", action: "documents.publish", resource: "Policy Brief No. 18", timestamp: "2026-06-02T10:00:00Z", ip: "197.210.x.x", newValue: "Published" },
  { id: "a3", actor: "Events Manager", action: "events.update", resource: "Annual Conference 2026", timestamp: "2026-09-20T14:10:00Z", ip: "197.210.x.x", newValue: "Registration open" },
];
export function recordAudit(entry: Omit<AuditEntry, "id" | "timestamp">) {
  auditLog.unshift({ ...entry, id: `a${Date.now()}`, timestamp: new Date().toISOString() });
}
