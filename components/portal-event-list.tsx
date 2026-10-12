"use client";

import { useEffect, useState } from "react";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { useAdminApi } from "./admin-client";

type PortalEvent = {
  slug: string; title: string; kind: string; startDate: string; endDate: string;
  venue: string; city: string; status: string; summary: string;
  registration: "Registered" | "Cancelled" | null; registrations: number;
  registrationAllowed?: boolean;
};

export function PortalEventList() {
  const api = useAdminApi();
  const [events, setEvents] = useState<PortalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/v1/portal/events", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.errors?.[0]?.message ?? "Events unavailable.");
      setEvents(Array.isArray(payload?.data) ? payload.data : []);
    }).catch((failure) => setError(failure instanceof Error ? failure.message : "Events unavailable.")).finally(() => setLoading(false));
  }, []);

  async function toggle(event: PortalEvent) {
    setBusy(event.slug); setError("");
    try {
      if (event.registration === "Registered") {
        await api(`/api/v1/portal/events/${encodeURIComponent(event.slug)}/registration`, "DELETE");
        setEvents((items) => items.map((item) => item.slug === event.slug ? { ...item, registration: "Cancelled", registrations: Math.max(0, item.registrations - 1) } : item));
      } else {
        await api(`/api/v1/portal/events/${encodeURIComponent(event.slug)}/registration`, "POST", {});
        setEvents((items) => items.map((item) => item.slug === event.slug ? { ...item, registration: "Registered", registrations: item.registrations + 1 } : item));
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Registration failed."); }
    finally { setBusy(null); }
  }

  if (loading) return <p className="border border-[#dce2dc] bg-white px-5 py-10 text-center text-sm text-[#718077]">Loading events…</p>;
  if (error && !events.length) return <p role="alert" className="border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">{error}</p>;
  return <div className="space-y-3">
    {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">{error}</p>}
    {!events.length && <p className="border border-[#dce2dc] bg-white px-5 py-10 text-center text-sm text-[#718077]">No published events are available.</p>}
    {events.map((event) => <article key={event.slug} className="grid gap-4 border border-[#dce2dc] bg-white p-5 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-center">
      <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5b8065]">{event.kind} · {event.status}</p><h2 className="mt-1 text-[17px] font-semibold text-[#20372a]">{event.title}</h2><p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#69776d]"><span className="inline-flex items-center gap-1"><CalendarDays size={13} />{event.startDate}{event.endDate !== event.startDate ? ` – ${event.endDate}` : ""}</span><span className="inline-flex items-center gap-1"><MapPin size={13} />{event.venue}, {event.city}</span><span className="inline-flex items-center gap-1"><Users size={13} />{event.registrations} registered</span></p><p className="mt-2 text-[13px] leading-relaxed text-[#59675d]">{event.summary}</p></div>
      <button type="button" disabled={busy === event.slug || event.status === "Past" || (event.registrationAllowed === false && event.registration !== "Registered")} onClick={() => toggle(event)} className={`px-4 py-2.5 text-[12px] font-semibold disabled:opacity-50 ${event.registration === "Registered" ? "border border-[#cbd8cd] bg-white text-[#28543a]" : "bg-[#174b31] text-white hover:bg-[#23613f]"}`}>{busy === event.slug ? "Saving…" : event.registration === "Registered" ? "Cancel registration" : event.status === "Past" ? "Registration closed" : event.registrationAllowed === false ? "Invitation only" : "Register"}</button>
    </article>)}
  </div>;
}
