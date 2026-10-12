"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PrintRequest = { id: string; state: string; createdAt: string; reprintReason: string | null };
export function ConferenceBadgePrintTools({ eventId, registrationId, disabled }: { eventId: string; registrationId: string; disabled: boolean }) {
  const [reason, setReason] = useState(""), [requests, setRequests] = useState<PrintRequest[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const retry = useRef<{ reason: string; key: string } | null>(null), lock = useRef(false);
  const base = `/api/v1/conference/events/${eventId}/prints`;
  useEffect(() => { const controller = new AbortController(); fetch(`${base}?registrationId=${registrationId}`, { cache: "no-store", signal: controller.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.errors?.[0]?.message ?? "We could not load this guest’s tags. Try again."); setRequests(data.data); setLoaded(true); }).catch(error => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "We could not load this guest’s tags. Try again."); }); return () => controller.abort(); }, [base, registrationId]);
  async function prepare() {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage("");
    const trimmed = reason.trim(); if (!retry.current || retry.current.reason !== trimmed) retry.current = { key: crypto.randomUUID(), reason: trimmed };
    try {
      const response = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": retry.current.key }, body: JSON.stringify({ action: "prepare", registrationId, reason: trimmed }) }); const data = await response.json();
      if (!response.ok) throw new Error(data.errors?.[0]?.message ?? "Could not prepare badge.");
      retry.current = null; setReason(""); const history = await fetch(`${base}?registrationId=${registrationId}`, { cache: "no-store" }); if (history.ok) setRequests((await history.json()).data);
      setMessage("Your tag is ready. Select Open tag to print below. After printing, give the tag to the guest for scanning at the gate.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Request failed. Retry when connected."); } finally { lock.current = false; setBusy(false); }
  }
  return <section className="space-y-4 rounded-lg bg-paper p-4"><h4 className="font-semibold">Guest tag</h4>{!loaded && !message && <p role="status" className="text-sm">Loading guest tags…</p>}{requests.map((request, index) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3 text-sm"><span>Tag {requests.length - index} · {({ Prepared: "Ready to print", Confirmed: "Printing confirmed", Cancelled: "Cancelled" })[request.state] ?? request.state}</span>{request.state !== "Cancelled" && <Link className="rounded-lg bg-forest-900 px-4 py-3 font-semibold text-white" href={{ pathname: "/admin/events/print", query: { event: eventId, id: request.id } }} target="_blank" rel="noopener noreferrer">Open tag to print<span className="sr-only"> (opens in a new tab)</span></Link>}</div>)}{loaded && (requests.length ? <details className="space-y-3"><summary className="cursor-pointer text-sm font-semibold">Need another copy?</summary><label className="mt-3 block text-sm">Why is another tag needed?<input value={reason} onChange={event => setReason(event.target.value)} placeholder="For example: the first tag was damaged" maxLength={500} disabled={disabled || busy} className="mt-2 w-full rounded-lg border p-3" /></label><p className="text-sm text-gray-600">Describe the reason in at least 10 characters.</p><button disabled={disabled || busy || reason.trim().length < 10} onClick={() => void prepare()} className="rounded-lg border border-forest-900 px-4 py-3 text-sm font-semibold disabled:opacity-50">Create replacement tag</button></details> : <><p className="text-sm text-gray-600">Create the guest’s tag, then open it to print. Their phone QR will still work.</p><button disabled={disabled || busy} onClick={() => void prepare()} className="rounded-lg bg-forest-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Creating tag…" : "Create guest tag"}</button></>)}{message && <p role="status" className="rounded-lg border bg-white p-3 text-sm">{message}</p>}</section>;
}
