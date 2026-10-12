"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ConferenceStaffInvitationStatus({ eventId, userId, state, consumed, expired }: { eventId: string; userId: string; state: string; consumed: boolean; expired: boolean }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""); const retry = useRef<string | null>(null), lock = useRef(false), router = useRouter();
  async function resend() {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage(""); retry.current ??= crypto.randomUUID();
    try {
      const response = await fetch(`/api/v1/conference/events/${eventId}/staff/invitations`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": retry.current }, body: JSON.stringify({ userId }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.errors?.[0]?.message ?? "Could not resend invitation.");
      retry.current = null; setMessage(result.data.emailConfigured ? "New setup email queued. The previous link no longer works." : "New setup email queued. Your administrator must finish SMTP/worker setup before it can be sent."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not resend invitation."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="mt-2 space-y-2 text-sm"><p className="text-gray-600">{consumed ? "Password created — ready to sign in" : expired ? "Setup link expired" : ({ Queued: "Setup email waiting to be sent", Processing: "Sending setup email", Accepted: "Setup email sent — waiting for password", Failed: "Setup email could not be sent", Uncertain: "Email delivery needs checking", Cancelled: "Setup invitation inactive" } as Record<string, string>)[state]}</p>{!consumed && <button disabled={busy || state === "Processing"} onClick={() => void resend()} className="min-h-11 rounded-lg border px-3 py-2 font-semibold disabled:opacity-50">{busy ? "Preparing email…" : "Send a new setup link"}</button>}{message && <p role="status" className="break-words rounded-lg bg-amber-50 p-3">{message}</p>}</div>;
}
