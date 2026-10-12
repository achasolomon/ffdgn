"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ConferenceStaffAccountForm({ eventId }: { eventId: string }) {
  const router = useRouter(), lock = useRef(false), retry = useRef<{ signature: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [created, setCreated] = useState(false);
  async function create(form: HTMLFormElement) {
    if (lock.current) return;
    const body = Object.fromEntries(new FormData(form).entries()), signature = JSON.stringify(body);
    if (!retry.current || retry.current.signature !== signature) retry.current = { signature, key: crypto.randomUUID() };
    lock.current = true; setBusy(true); setMessage(""); setCreated(false);
    try {
      const response = await fetch(`/api/v1/conference/events/${eventId}/staff/accounts`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": retry.current.key }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.errors?.[0]?.message ?? "Could not create the staff account. Try again.");
      setMessage(`Account created for ${data.data.name}. Their password setup email is queued.${data.data.emailConfigured ? " The email worker will send it." : " Email setup is incomplete; ask your administrator to configure SMTP and start the email worker."} The link lasts 72 hours. They choose their own password and sign in to the guest desk.`);
      setCreated(true); retry.current = null; form.reset(); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create the account. Try again."); }
    finally { lock.current = false; setBusy(false); }
  }
  const control = "mt-2 w-full rounded-lg border p-3 text-base";
  return <section aria-label="Create guest desk staff" className="space-y-4 rounded-xl border bg-white p-5 sm:p-6"><h2 className="text-xl font-semibold">Invite a guest-desk staff member</h2><p className="text-sm leading-6 text-gray-600">Enter their details and choose their duty. We will email a link so they can create their own password. They will only have access to this event&apos;s guest desk.</p><form onSubmit={event => { event.preventDefault(); void create(event.currentTarget); }} className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Staff full name<input name="name" required maxLength={192} disabled={busy} className={control} autoComplete="off" /></label><label className="text-sm font-semibold">Email address<input name="email" type="email" required maxLength={255} disabled={busy} className={control} autoComplete="off" /></label><label className="text-sm font-semibold sm:col-span-2">What will this person do?<select name="role" defaultValue="RegistrationOfficer" disabled={busy} className={control}><option value="RegistrationOfficer">Registration, tags and gate check-in</option><option value="GateOfficer">Gate check-in and tags only</option><option value="ReportingOfficer">View attendance only</option><option value="Manager">Manage this event&apos;s guest desk</option></select></label><div className="sm:col-span-2"><button disabled={busy} className="min-h-12 rounded-lg bg-forest-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Preparing invitation..." : "Create account & send setup link"}</button></div></form>{message && <p role="status" className={`break-words rounded-lg border p-4 text-sm ${created ? "bg-green-50" : "bg-amber-50"}`}>{message}</p>}</section>;
}
