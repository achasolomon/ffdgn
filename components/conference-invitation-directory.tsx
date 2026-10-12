"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { InvitationAction } from "@/lib/conference/invitations";
import { ConferenceDrawer } from "./conference-drawer";
import { ConferenceBadgePrintTools } from "./conference-badge-print-tools";

export type InvitationDirectoryRow = { id: string; fullName: string; email: string; organization: string; category: string; status: string; memberRegistration: boolean; rsvp: string; invitation: { generation: number; revoked: boolean; expiresAt: string; latestState: string | null } | null };
type Job = { id: string; state: string; generation: number; errorCode: string | null; invitation: { registrationId: string } };
type Delivery = { jobs: Job[]; smtpConfigured: boolean; credentialsReady: boolean };
const stateLabel = (state: string | null | undefined) => ({ Queued: "Waiting to send", Processing: "Sending email", Accepted: "Sent to mail server", Failed: "Email failed", Uncertain: "Email needs checking", Cancelled: "Email cancelled" }[state ?? ""] ?? "Email not sent");
const replyLabel = (state: string) => ({ Accepted: "Confirmed attendance", Declined: "Not attending", Pending: "Has not replied" }[state] ?? state);

export function ConferenceInvitationDirectory({ eventId, rows, enabled, canSend }: { eventId: string; rows: InvitationDirectoryRow[]; enabled: boolean; canSend: boolean }) {
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>([]), [delivery, setDelivery] = useState<Delivery | null>(null), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const request = useRef<{ signature: string; key: string } | null>(null);
  const endpoint = `/api/v1/conference/events/${encodeURIComponent(eventId)}/invitations`;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    async function refresh() {
      try { const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal }); const payload = await response.json(); if (!response.ok) throw new Error(payload?.errors?.[0]?.message ?? "Delivery status unavailable."); setDelivery(payload.data); }
      catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "Delivery status unavailable."); }
    }
    void refresh(); const interval = setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [endpoint, enabled]);
  async function dispatch(action: InvitationAction) {
    if (busy) return;
    if (action === "regenerate" && !window.confirm("Replace QR codes for the selected guests? Their previous phone QR codes and printed tags will stop working. New invitations will be sent.")) return;
    if (action === "revoke" && !window.confirm("Cancel QR codes for the selected guests? They will no longer be able to enter using those codes.")) return;
    const signature = `${action}:${[...selected].sort().join(",")}`;
    if (request.current?.signature !== signature) request.current = { signature, key: crypto.randomUUID() };
    setBusy(true); setMessage("");
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": request.current!.key }, body: JSON.stringify({ action, registrationIds: selected }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.errors?.[0]?.message ?? "Invitation operation failed. Retry to check the original request.");
      const result = payload.data;
      setMessage(action === "revoke" ? `${result.revoked} guest QR codes cancelled. ${result.skipped} were already unchanged.` : `${result.queued} invitations are waiting to send. ${result.skipped ? `${result.skipped} guests needed no change. ` : ""}Check the email status beside each guest below.`);
      request.current = null; setSelected([]); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invitation operation failed."); }
    finally { setBusy(false); }
  }
  const chosen = new Set(selected);
  const emailReady = selected.length > 0 && rows.filter(row => chosen.has(row.id)).every(row => row.email && row.status === "Registered");
  const selectable = rows.filter(row => row.status === "Registered");
  const selectGuest = (id: string, checked: boolean) => setSelected(previous => checked ? [...new Set([...previous, id])] : previous.filter(value => value !== id));
  const detail = (label: string, value: string) => <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 break-words text-sm font-semibold">{value}</p></div>;
  return <div className="space-y-3">
    {enabled && delivery && (!delivery.credentialsReady || !delivery.smtpConfigured) && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">{!delivery.credentialsReady ? "QR setup needs attention." : "Email sending is not ready."} Ask your administrator to complete setup.</p>}
    {message && <p role="status" className="rounded-lg border bg-green-50 p-3 text-sm">{message}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-3"><div className="flex items-center gap-3">{canSend && enabled && selectable.length > 0 && <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4" aria-label="Select this page of guests" disabled={busy} checked={selectable.every(row => chosen.has(row.id))} onChange={event => setSelected(event.target.checked ? selectable.map(row => row.id) : [])} />Select page</label>}<span className="text-xs text-gray-500">{selected.length ? `${selected.length} selected` : `${rows.length} on this page`}</span></div><div className="flex flex-wrap gap-2">{canSend && enabled && <><button disabled={busy || !emailReady || !delivery?.credentialsReady || !delivery?.smtpConfigured} onClick={() => void dispatch("issue")} className="min-h-11 rounded-lg bg-forest-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Please wait…" : "Send invitations"}</button><ConferenceDrawer label="More actions" title="Invitation actions" busy={busy}><p className="mb-4 text-sm text-gray-600">{selected.length} guests selected. Changes apply only to this selection.</p><div className="grid gap-3"><button disabled={busy || !emailReady || !delivery?.smtpConfigured} onClick={() => void dispatch("resend")} className="rounded-lg border p-3 text-left text-sm font-semibold disabled:opacity-40">Send invitation again</button><button disabled={busy || !emailReady || !delivery?.smtpConfigured} onClick={() => void dispatch("regenerate")} className="rounded-lg border p-3 text-left text-sm font-semibold disabled:opacity-40">Replace QR and send invitation</button><button disabled={busy || !selected.length} onClick={() => void dispatch("revoke")} className="rounded-lg border border-red-200 p-3 text-left text-sm font-semibold text-red-800 disabled:opacity-40">Cancel selected QR codes</button></div><p className="mt-4 text-xs leading-5 text-gray-500">Replacing or cancelling a QR also affects printed tags. SMTP acceptance does not confirm inbox delivery.</p>{message && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm">{message}</p>}</ConferenceDrawer></>}<button type="button" disabled={busy} onClick={() => router.refresh()} className="min-h-11 rounded-lg border bg-white px-3 py-2 text-sm font-semibold">Refresh</button></div></div>
    <div className="max-h-[65vh] overflow-auto rounded-xl border"><table className="w-full table-fixed text-left text-sm"><thead className="sticky top-0 bg-gray-50"><tr>{canSend && enabled && <th className="w-9 p-2"><span className="sr-only">Select guest</span></th>}<th className="p-3">Guest</th><th className="hidden w-24 p-3 md:table-cell">Category</th><th className="hidden w-36 p-3 lg:table-cell">Invitation</th><th className="w-24 p-2 sm:w-44">Actions</th></tr></thead><tbody>{rows.map(row => {
      const latest = delivery?.jobs.find(job => job.invitation.registrationId === row.id && job.generation === row.invitation?.generation);
      const active = row.status === "Registered", qrStatus = row.invitation ? row.invitation.revoked ? "QR cancelled" : new Date(row.invitation.expiresAt) <= new Date() ? "QR expired" : "QR ready" : "Tag not yet created";
      return <tr key={row.id} className="border-t align-top hover:bg-gray-50">{canSend && enabled && <td className="p-2 pt-4"><input type="checkbox" className="h-4 w-4" aria-label={`Select ${row.fullName}`} checked={chosen.has(row.id)} disabled={busy || !active} onChange={event => selectGuest(row.id, event.target.checked)} /></td>}<td className="p-3"><p className="break-words font-semibold text-forest-900">{row.fullName}</p><p className="mt-1 truncate text-xs text-gray-500">{row.email || row.organization || "No email provided"}</p><span className="mt-1 inline-block rounded bg-forest-50 px-2 py-0.5 text-[11px] font-semibold md:hidden">{row.category}</span>{!active && <p className="mt-1 text-xs text-red-800">Registration cancelled</p>}</td><td className="hidden p-3 md:table-cell"><span className="rounded-full bg-forest-50 px-2 py-1 text-xs font-semibold">{row.category}</span></td><td className="hidden p-3 lg:table-cell"><p className="text-xs">{row.email ? stateLabel(latest?.state ?? row.invitation?.latestState) : "No email"}</p><p className="mt-1 text-xs text-gray-500">{replyLabel(row.rsvp)}</p>{latest?.errorCode && <span className="text-xs text-red-800">Needs attention</span>}</td><td className="p-2"><div className="flex flex-col gap-2 sm:flex-row">{canSend && enabled && active && <ConferenceDrawer label="Print tag" title={`Guest tag — ${row.fullName}`} className="min-h-11 rounded-lg bg-forest-900 px-3 py-2 text-xs font-semibold text-white"><div className="mb-4 grid grid-cols-2 gap-2">{detail("Guest", row.fullName)}{detail("Category", row.category)}</div><ConferenceBadgePrintTools eventId={eventId} registrationId={row.id} disabled={busy} /></ConferenceDrawer>}<ConferenceDrawer label="Details" title={row.fullName} className="min-h-11 rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><div className="grid gap-3 sm:grid-cols-2">{detail("Email", row.email || "Not provided")}{detail("Organization", row.organization || "Not provided")}{detail("Category", row.category)}{detail("Registration", row.status)}{detail("Attendance reply", replyLabel(row.rsvp))}{detail("Entry QR", qrStatus)}{detail("Email status", stateLabel(latest?.state ?? row.invitation?.latestState))}</div></ConferenceDrawer></div></td></tr>;
    })}</tbody></table></div>
  </div>;
}