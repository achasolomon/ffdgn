"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export function ConferenceStaffSetup() {
  const opened = useRef(false);
  const [token, setToken] = useState(""), [ready, setReady] = useState(false), [done, setDone] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [show, setShow] = useState(false);
  useEffect(() => { if (opened.current) return; opened.current = true; const value = location.hash.slice(1); history.replaceState(null, "", location.pathname); setToken(value); setReady(true); }, []);
  async function submit(form: HTMLFormElement) {
    if (busy) return;
    const data = new FormData(form), password = String(data.get("password"));
    if (password !== data.get("confirm")) { setMessage("The passwords do not match. Enter the same password twice."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/v1/conference/staff/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.errors?.[0]?.message ?? "Could not save your password. Try again.");
      form.reset(); setToken(""); setDone(true);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save your password. Try again."); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto w-full max-w-lg rounded-xl border bg-white p-5 shadow-sm sm:p-8"><p className="text-sm font-semibold text-forest-700">Conference staff</p><h1 className="mt-2 text-2xl font-bold">{done ? "Your password is ready" : "Create your password"}</h1>{done ? <><p className="mt-4 leading-7">Sign in using the email address that received your invitation and your new password. You will go straight to the guest desk.</p><Link href="/login?callbackUrl=%2Fadmin%2Fevents%2Foperations" className="mt-6 block rounded-lg bg-forest-900 p-3 text-center font-semibold text-white">Sign in to the guest desk</Link></> : !ready ? <p className="mt-4">Opening your invitation…</p> : !/^staff1_[A-Za-z0-9_-]{43}$/.test(token) ? <p role="alert" className="mt-4 leading-7">Open the complete link in your staff invitation email. If it has expired, ask your administrator to send a new invitation.</p> : <><p className="mt-4 leading-7 text-gray-600">Choose a password for your guest-desk account. Use at least 6 characters.</p><form aria-label="Create staff password" onSubmit={event => { event.preventDefault(); void submit(event.currentTarget); }} className="mt-6 space-y-5"><label className="block font-semibold">New password<input name="password" type={show ? "text" : "password"} autoComplete="new-password" required minLength={6} maxLength={72} disabled={busy} className="mt-2 min-h-12 w-full rounded-lg border p-3 text-base" /></label><label className="block font-semibold">Confirm password<input name="confirm" type={show ? "text" : "password"} autoComplete="new-password" required minLength={6} maxLength={72} disabled={busy} className="mt-2 min-h-12 w-full rounded-lg border p-3 text-base" /></label><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)} />Show password</label>{message && <p role="alert" className="rounded-lg bg-amber-50 p-3 leading-6">{message}</p>}<button disabled={busy} className="min-h-12 w-full rounded-lg bg-forest-900 p-3 font-semibold text-white disabled:opacity-50">{busy ? "Saving password…" : "Create password"}</button></form></>}</section>;
}
