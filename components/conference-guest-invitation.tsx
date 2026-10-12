"use client";
import { useEffect, useState } from "react";

type GuestInvitation = { fullName: string; category: string; rsvp: "Pending" | "Accepted" | "Declined"; event: { title: string; startDate: string; endDate: string; venue: string; city: string }; expiresAt: string };
const guestBase = "/api/v1/conference/guest";
async function guestApi(path: string, body?: unknown) {
  const response = await fetch(`${guestBase}/${path}`, { method: body === undefined ? "GET" : "POST", cache: "no-store", ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.errors?.[0]?.message ?? "Invitation unavailable. Please try again.");
  return payload.data;
}

export function ConferenceGuestInvitation() {
  const [invitation, setInvitation] = useState<GuestInvitation | null>(null), [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const token = window.location.hash.slice(1);
    // Fragment never reaches HTTP access logs; remove it before making any API calls.
    if (token) window.history.replaceState(null, "", "/invite");
    void (async () => {
      if (token) await guestApi("token-exchange", { token });
      return guestApi("invitation");
    })().then(data => { if (active) setInvitation(data); }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Invitation unavailable."); });
    return () => { active = false; };
  }, []);
  async function respond(response: "Accepted" | "Declined") {
    setBusy(true); setError(""); setNotice("");
    try { const result = await guestApi("rsvp", { response }); setInvitation(previous => previous ? { ...previous, rsvp: result.rsvp } : previous); setNotice(response === "Accepted" ? "Thank you. Your attendance is confirmed." : "Thank you. Your response has been recorded."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save your response."); }
    finally { setBusy(false); }
  }
  const format = (value: string) => new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return <div className="min-h-screen bg-paper px-4 py-10 sm:py-16">
    <article className="mx-auto max-w-2xl overflow-hidden border border-forest-900/15 bg-white shadow-card">
      <header className="bg-forest-950 px-6 py-8 text-white sm:px-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-gold">FFDGN</p><h1 className="mt-3 font-display text-4xl font-semibold">Your conference invitation</h1><p className="mt-3 text-sm text-white/80">No account or registration form is required.</p></header>
      <div className="space-y-6 px-6 py-8 sm:px-10">
        {error && <p role="alert" className="border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
        {!invitation && !error && <p role="status" className="text-sm text-gray-600">Opening your invitation…</p>}
        {invitation && <>
          <div><p className="text-sm text-gray-600">Dear {invitation.fullName},</p><h2 className="mt-3 text-2xl font-semibold text-forest-950">{invitation.event.title}</h2><p className="mt-3 text-sm">{format(invitation.event.startDate)}{invitation.event.endDate !== invitation.event.startDate ? ` – ${format(invitation.event.endDate)}` : ""}</p><p className="mt-1 text-sm text-gray-600">{invitation.event.venue}, {invitation.event.city}</p></div>
          <section className="border-y py-6 text-center"><h3 className="font-semibold text-forest-950">Your entry QR</h3><img src={`${guestBase}/qr`} width="240" height="240" alt="Your private entry QR code" className="mx-auto my-4" /><p className="text-sm text-gray-600">Present this code on your phone or bring a printed copy.</p><div className="mt-4 flex flex-wrap justify-center gap-4 text-sm font-semibold text-forest-900"><a href={`${guestBase}/qr?download=1`}>Download QR image</a><a href={`${guestBase}/pdf`}>Download invitation PDF</a></div></section>
          <section><h3 className="font-semibold">Will you attend?</h3><p className="mt-2 text-sm text-gray-600">Your QR is already available. Responding helps the Secretariat plan your arrival.</p><p className="mt-3 text-sm">Response: <strong>{invitation.rsvp === "Pending" ? "Not yet received" : invitation.rsvp}</strong></p><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void respond("Accepted")} className="bg-forest-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">I will attend</button><button type="button" disabled={busy} onClick={() => void respond("Declined")} className="border border-forest-900/30 px-5 py-3 text-sm font-semibold text-forest-900 disabled:opacity-50">I cannot attend</button></div>{notice && <p role="status" className="mt-4 text-sm text-forest-700">{notice}</p>}</section>
          <p className="text-xs text-gray-500">Please keep your invitation and QR code private. Contact the Secretariat if your details need correcting.</p>
        </>}
      </div>
    </article>
  </div>;
}
