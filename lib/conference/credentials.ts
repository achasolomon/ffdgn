import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { ConferenceInvitation } from "@prisma/client";

export function activeInvitation(invitation: ConferenceInvitation | null, registrationStatus: string, enabled: boolean): invitation is ConferenceInvitation {
  return !!invitation && !invitation.revokedAt && !!invitation.credentialEnvelope && invitation.expiresAt > new Date() && registrationStatus === "Registered" && enabled;
}

export function credentialKey(): Buffer {
  const raw = process.env.CONFERENCE_CREDENTIAL_KEY ?? "";
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32 || key.toString("base64") !== raw) throw new Error("CONFERENCE_CREDENTIAL_KEY must be 32 random bytes encoded as base64.");
  return key;
}

export function hashCredential(token: string): string { return createHash("sha256").update(token).digest("hex"); }
export function newCredentials() { return { qrToken: `ffdgn1_${randomBytes(32).toString("base64url")}`, rsvpToken: `rsvp1_${randomBytes(32).toString("base64url")}` }; }
export function validRsvpToken(token: unknown): token is string { return typeof token === "string" && /^rsvp1_[A-Za-z0-9_-]{43}$/.test(token); }

export function encryptSecret(value: unknown, context: string): string {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", credentialKey(), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(envelope: string, context: string): unknown {
  const [version, iv, tag, data, extra] = envelope.split(".");
  if (version !== "v1" || !iv || !tag || !data || extra) throw new Error("Invalid credential envelope.");
  const decipher = createDecipheriv("aes-256-gcm", credentialKey(), Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8"));
}

export function invitationCredentials(invitation: { id: string; generation: number; credentialEnvelope: string | null; qrHash: string; rsvpHash: string }) {
  if (!invitation.credentialEnvelope) throw new Error("Credentials unavailable.");
  const credentials = decryptSecret(invitation.credentialEnvelope, `invitation:${invitation.id}:${invitation.generation}`) as { qrToken?: unknown; rsvpToken?: unknown };
  if (typeof credentials.qrToken !== "string" || !/^ffdgn1_[A-Za-z0-9_-]{43}$/.test(credentials.qrToken) || !validRsvpToken(credentials.rsvpToken) || hashCredential(credentials.qrToken) !== invitation.qrHash || hashCredential(credentials.rsvpToken) !== invitation.rsvpHash) throw new Error("Invalid stored credentials.");
  return { qrToken: credentials.qrToken, rsvpToken: credentials.rsvpToken };
}

export function invitationOrigin(): string {
  const url = new URL(process.env.NEXTAUTH_URL ?? "");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password) throw new Error("Invitation origin must use HTTPS (HTTP is allowed only on localhost).");
  return url.origin;
}
