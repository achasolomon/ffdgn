import { randomBytes, randomUUID } from "node:crypto";
import { encryptSecret, hashCredential } from "./credentials";

export function validStaffToken(value: unknown): value is string { return typeof value === "string" && /^staff1_[A-Za-z0-9_-]{43}$/.test(value); }
export function newStaffInvitation() {
  const id = randomUUID(), token = `staff1_${randomBytes(32).toString("base64url")}`;
  return { id, tokenHash: hashCredential(token), credentialEnvelope: encryptSecret({ token }, `staff:${id}`), expiresAt: new Date(Date.now() + 72 * 60 * 60_000) };
}
