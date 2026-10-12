"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GUEST_CATEGORIES } from "@/lib/conference/input";

export function ConferenceWalkinRegistration({ eventId }: { eventId: string }) {
  const router = useRouter(), lock = useRef(false), retry = useRef<{ signature: string; key: string } | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [printId, setPrintId] = useState("");
  async function register(form: HTMLFormElement) {
    if (lock.current) return;
    const body = Object.fromEntries(new FormData(form).entries()), signature = JSON.stringify(body);
    if (!retry.current || retry.current.signature !== signature) retry.current = { signature, key: crypto.randomUUID() };
    lock.current = true; setBusy(true); setMessage(""); setPrintId("");
    try {
      const response = await fetch(`/api/v1/conference/events/${eventId}/walkins`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": retry.current.key }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.errors?.[0]?.message ?? "Registration failed. Retry to recover the original request.");
      setPrintId(data.data.printId); setMessage(`Registered. Open the QR tag and print it.${data.data.emailQueued ? " A copy of the tag and conference details is queued for the guest’s email." : " No email address was provided."}${data.data.emailQueued && !data.data.emailConfigured ? " Email setup needs attention from your administrator." : ""} The gate officer must scan the QR to record entry.`);
      retry.current = null; form.reset(); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Registration failed. Retry when connected."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <section aria-label="Walk-in registration" className="space-y-5 rounded-xl border bg-white p-5 sm:p-6">
    <div><h3 className="text-xl font-semibold">Register a new guest</h3><p className="mt-2 text-sm leading-6 text-gray-600">Fill in the guest’s details, then create their tag. Only the full name is required. If the guest is already on the invited list, use Find a guest instead.</p></div>
    <form onSubmit={event => { event.preventDefault(); void register(event.currentTarget); }} className="grid gap-5 sm:grid-cols-2">
      {[["fullName", "Full name (required)", "text", 192], ["email", "Email (optional)", "email", 255], ["phone", "Phone (optional)", "tel", 32], ["organization", "Organization (optional)", "text", 192], ["jobTitle", "Job title (optional)", "text", 192]].map(([name, label, type, max]) => <label key={name} className="block text-sm font-semibold">{label}<input name={String(name)} type={String(type)} maxLength={Number(max)} required={name === "fullName"} disabled={busy} className="mt-2 w-full rounded-lg border p-3 text-base font-normal" /></label>)}
      <label className="block text-sm font-semibold">Guest category<select name="category" defaultValue="General" disabled={busy} className="mt-2 w-full rounded-lg border p-3 text-base font-normal">{GUEST_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
      <div className="sm:col-span-2"><button disabled={busy} className="rounded-lg bg-forest-900 px-5 py-3 text-base font-semibold text-white disabled:opacity-50">{busy ? "Saving guest…" : "Save guest & create tag"}</button><p className="mt-3 text-sm text-gray-600">Print the tag on the next screen. Add an email address to also send their tag and conference information.</p></div>
    </form>
    {message && <div role="status" className={`space-y-3 rounded-lg border p-4 ${printId ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}><p className="text-sm">{message}</p>{printId && <Link href={{ pathname: "/admin/events/print", query: { event: eventId, id: printId } }} target="_blank" rel="noopener noreferrer" className="inline-block rounded-lg bg-forest-900 px-5 py-3 font-semibold text-white">Print guest tag<span className="sr-only"> (opens in a new tab)</span></Link>}</div>}
  </section>;
}
