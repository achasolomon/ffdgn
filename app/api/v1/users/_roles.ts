/** Roles this endpoint may assign. `super_admin` is intentionally excluded. */
export const ASSIGNABLE = [
  "member",
  "associate",
  "auditor",
  "content_editor",
  "events_manager",
  "knowledge_manager",
  "committee_manager",
  "communications_officer",
  "membership_admin",
  "secretariat_admin",
] as const;
