import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";
import { db } from "./db";
import { hasPermission, type Permission, type Role } from "./auth";

export interface AuthContext {
  user: { id: string; name: string; email: string; role: Role };
}

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Server-side session (JWT, role refreshed from DB hourly). Null when signed out. */
export async function getAuth(): Promise<AuthContext | null> {
  const session = await getServerSession(authOptions);
  const u = session?.user as { id?: string; name?: string; email?: string; role?: string } | undefined;
  if (!u?.id || !u?.role || u.role === "revoked") return null;
  return { user: { id: u.id, name: u.name ?? "Unknown", email: u.email ?? "", role: u.role as Role } };
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) throw new AuthError(401, "UNAUTHENTICATED", "Sign in to continue.");
  return auth;
}

/** Centralized server-side authorization — never trust client-side checks. */
export async function requirePermission(permission: Permission): Promise<AuthContext> {
  const auth = await requireAuth();
  if (!hasPermission(auth.user.role, permission)) {
    throw new AuthError(403, "FORBIDDEN", "Your role does not grant this operation.");
  }
  return auth;
}

/** Append-only audit write. Never throws — audit failure must not break the operation. */
export async function audit(action: string, resource: string, opts?: { previousValue?: string; newValue?: string; ip?: string; actorOverride?: AuthContext }) {
  const actor = opts?.actorOverride ?? (await getAuth());
  if (!actor) return;
  try {
    await db.auditLog.create({
      data: {
        actorId: actor.user.id, actorName: actor.user.name, action, resource,
        ip: opts?.ip ?? "app", previousValue: opts?.previousValue, newValue: opts?.newValue,
      },
    });
  } catch {
    /* audit store unavailable — operation already authorized; do not fail it */
  }
}
