// Shared by the proxy and server authorization. Guest-desk users receive no
// institutional permissions, and only these private surfaces accept them.
export const GUEST_DESK_HOME = "/admin/events/operations";
export function guestDeskPathAllowed(path: string): boolean {
  return [GUEST_DESK_HOME, "/admin/events/gate", "/admin/events/print", "/admin/events/reports", "/api/v1/auth/change-password"].includes(path)
    || /^\/api\/v1\/conference\/events\/[a-f0-9-]{36}(?:\/|$)/i.test(path);
}
