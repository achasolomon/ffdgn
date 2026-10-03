"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarPlus, Check, Pencil, Save } from "lucide-react";
import { useAdminApi, useAdminRefresh } from "./admin-client";
import { AdminMediaPicker } from "./admin-media-picker";
import { NewDocumentButton } from "./admin-doc-actions";

type ProgrammeSlot = { time: string; session: string; speaker: string };
type EventRecord = {
  slug: string; title: string; theme: string; kind: string; startDate: string; endDate: string;
  venue: string; city: string; status: "Upcoming" | "Ongoing" | "Past"; summary: string;
  coverUrl: string; published: boolean; guests: string; programme: ProgrammeSlot[];
  /** Long-form write-up rendered as its own section on past events only. */
  highlights: string;
  speakers: string[]; documents: string[];
};

const today = new Date().toISOString().slice(0, 10);
const EMPTY: EventRecord = {
  slug: "", title: "", theme: "", kind: "Annual Conference", startDate: today, endDate: today,
  venue: "", city: "Abuja", status: "Upcoming", summary: "", coverUrl: "", published: false,
  guests: "", programme: [], speakers: [], documents: [], highlights: "",
};
const KINDS = ["Annual Conference", "Dialogue", "Roundtable", "Workshop", "Summit"];
const control = "w-full border border-[#d6ded6] bg-white px-3 py-2.5 text-[13px] text-[#23352a] placeholder:text-[#97a199] focus:border-[#31774d] focus:outline-none";
const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.09em] text-[#617066]";

function lines(values: string[]) { return values.join("\n"); }
function parseProgramme(value: string): ProgrammeSlot[] {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
    const [time = "", session = "", speaker = ""] = line.split("|").map((part) => part.trim());
    return { time, session, speaker };
  });
}

export function AdminEventManager({ events, docTitles, canCreate, canEdit }: { events: EventRecord[]; docTitles: Record<string, string>; canCreate: boolean; canEdit: boolean }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [form, setForm] = useState<EventRecord>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  function edit(event: EventRecord) {
    setForm(event);
    setEditing(true);
    setFeedback(null);
    document.getElementById("event-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const payload = {
        ...form,
        programme: form.programme,
        speakers: Array.isArray(form.speakers) ? form.speakers : [],
        documents: Array.isArray(form.documents) ? form.documents : [],
      };
      await api(editing ? `/api/v1/cms/events/${encodeURIComponent(form.slug)}` : "/api/v1/cms/events", editing ? "PATCH" : "POST", payload);
      setFeedback({ ok: true, text: editing ? "Event updated." : "Event created." });
      setForm(EMPTY);
      setEditing(false);
      refresh();
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
      <section className="min-w-0 border border-[#dce2dc] bg-white" aria-labelledby="event-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e9e4] px-5 py-4">
          <div><h2 id="event-list-title" className="text-sm font-bold text-[#20372a]">Events</h2><p className="mt-0.5 text-[12px] text-[#79847b]">{events.length} records · start date descending</p></div>
          {canCreate && <button type="button" onClick={() => { setForm(EMPTY); setEditing(false); setFeedback(null); }} className="inline-flex items-center gap-2 bg-[#174b31] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#23613f]"><CalendarPlus size={15} /> New event</button>}
        </div>
        {events.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead className="bg-[#f6f8f5] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#778379]"><tr><th className="px-5 py-3">Event</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Visibility</th><th className="px-4 py-3" /></tr></thead>
              <tbody>{events.map((event) => (
                <tr key={event.slug} className="border-t border-[#edf0ed] align-middle hover:bg-[#fafbf9]">
                  <td className="max-w-[340px] px-5 py-3.5"><span className="block truncate font-semibold text-[#26382d]">{event.title}</span><span className="mt-0.5 block text-[11px] text-[#8a948c]">{event.startDate} · {event.venue}, {event.city}</span></td>
                  <td className="px-4 py-3.5 text-[#657168]">{event.kind}</td>
                  <td className="px-4 py-3.5 text-[#657168]">{event.status}</td>
                  <td className="px-4 py-3.5"><span className={`text-[11px] font-semibold ${event.published ? "text-[#277449]" : "text-[#996c18]"}`}>{event.published ? "Published" : "Draft"}</span></td>
                  <td className="px-4 py-3.5 text-right">{canEdit && <button type="button" onClick={() => edit(event)} aria-label={`Edit ${event.title}`} title="Edit event" className="inline-grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358] hover:border-[#8ca996] hover:text-[#174b31]"><Pencil size={14} /></button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="px-6 py-14 text-center"><p className="text-sm font-semibold text-[#35463a]">No events yet</p><p className="mt-1 text-[12px] text-[#79847b]">Create an event record or conference archive.</p></div>}
      </section>

      <div className="flex min-w-0 flex-col gap-6">
      {(canCreate || canEdit) && <form id="event-editor" onSubmit={submit} className="scroll-mt-5 border border-[#dce2dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7859]">Event operations</p><h2 className="mt-0.5 text-sm font-bold text-[#20372a]">{editing ? "Edit event" : "New event"}</h2></div>
          {editing && <button type="button" onClick={() => { setForm(EMPTY); setEditing(false); setFeedback(null); }} className="text-[11px] font-semibold text-[#69766c] hover:text-[#174b31]">Cancel edit</button>}
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="event-slug">URL slug</label><input id="event-slug" required disabled={editing} className={`${control} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="annual-dialogue-2026" /></div>
            <div><label className={label} htmlFor="event-kind">Event type</label><select id="event-kind" className={control} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></div>
          </div>
          <div><label className={label} htmlFor="event-title">Event title</label><input id="event-title" required maxLength={255} className={control} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className={label} htmlFor="event-theme">Theme</label><input id="event-theme" className={control} value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="event-start">Start date</label><input id="event-start" type="date" required className={control} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div><label className={label} htmlFor="event-end">End date</label><input id="event-end" type="date" required className={control} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2"><label className={label} htmlFor="event-venue">Venue</label><input id="event-venue" required className={control} value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div><label className={label} htmlFor="event-city">City</label><input id="event-city" required className={control} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="event-status">Calendar status</label><select id="event-status" className={control} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EventRecord["status"] })}><option>Upcoming</option><option>Ongoing</option><option>Past</option></select></div>
            <div><label className={label} htmlFor="event-cover">Cover image</label><div className="flex flex-wrap gap-2"><input id="event-cover" className={`${control} min-w-[180px] flex-1 font-mono`} value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="/assets/events/conference.jpg" /><AdminMediaPicker onSelect={(url) => setForm({ ...form, coverUrl: url })} /></div></div>
          </div>
          <div><label className={label} htmlFor="event-summary">Summary</label><textarea id="event-summary" required rows={3} className={control} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /><p className="mt-1 text-[11px] text-[#778379]">Short standfirst. Shown under the title on every event type.</p></div>
          <div><label className={label} htmlFor="event-highlights">Highlights</label><textarea id="event-highlights" rows={6} className={control} value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} placeholder="Delegates, resolutions, outcomes…" /><p className="mt-1 text-[11px] text-[#778379]">Long-form record of what happened — attendance, resolutions, outcomes. Published as its own section on past events only; leave blank on upcoming ones.</p></div>
          <div><label className={label} htmlFor="event-programme">Programme slots</label><textarea id="event-programme" rows={4} className={`${control} font-mono text-[12px]`} value={form.programme.map((slot) => [slot.time, slot.session, slot.speaker].filter(Boolean).join(" | ")).join("\n")} onChange={(e) => setForm({ ...form, programme: parseProgramme(e.target.value) })} placeholder="09:00 | Opening remarks | Speaker name" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="event-speakers">Speaker member slugs</label><textarea id="event-speakers" rows={3} className={`${control} font-mono text-[12px]`} value={lines(form.speakers)} onChange={(e) => setForm({ ...form, speakers: e.target.value.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean) })} /></div>
            <div><label className={label} htmlFor="event-documents">Related document slugs</label><textarea id="event-documents" rows={3} className={`${control} font-mono text-[12px]`} value={lines(form.documents)} onChange={(e) => setForm({ ...form, documents: e.target.value.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean) })} /></div>
          </div>
          <div><label className={label} htmlFor="event-guests">Guests and dignitaries</label><textarea id="event-guests" rows={3} className={control} value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-[12px] font-medium text-[#59675d]"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-[#1b6840]" /> Publicly visible</label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9e4] bg-[#f8faf7] px-5 py-3.5">
          {feedback ? <p role={feedback.ok ? "status" : "alert"} className={`text-[12px] ${feedback.ok ? "text-[#267147]" : "text-red-800"}`}>{feedback.ok && <Check size={13} className="mr-1 inline" />}{feedback.text}</p> : <span className="text-[11px] text-[#778379]">Programme and people links save together.</span>}
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-[#23613f] disabled:opacity-60"><Save size={14} />{busy ? "Saving…" : editing ? "Save changes" : "Create event"}</button>
        </div>
      </form>}

      {editing && canEdit && (
        <section className="border border-[#dce2dc] bg-white" aria-labelledby="event-docs-title">
          <div className="border-b border-[#e4e9e4] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7859]">Downloads</p>
            <h3 id="event-docs-title" className="mt-0.5 text-sm font-bold text-[#20372a]">Documents &amp; communiqués</h3>
            <p className="mt-1 text-[12px] text-[#79847b]">Attached records appear at the top of this event&apos;s public page with a download button.</p>
          </div>
          <ul className="divide-y divide-[#edf0ed]">
            {form.documents.length ? (
              form.documents.map((slug) => (
                <li key={slug} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-[#26382d]">{docTitles[slug] ?? slug}</span>
                    <span className="block truncate font-mono text-[11px] text-[#8a948c]">{slug}</span>
                  </span>
                  <Link href="/admin/knowledge" className="shrink-0 text-[12px] font-semibold text-[#174b31] hover:underline">Manage</Link>
                </li>
              ))
            ) : (
              <li className="px-5 py-4 text-[12.5px] text-[#79847b]">No documents attached to this event yet.</li>
            )}
          </ul>
          <div className="border-t border-[#e4e9e4] bg-[#f8faf7] px-5 py-3.5">
            <NewDocumentButton
              eventSlugs={events.map((event) => event.slug)}
              defaults={{ eventSlug: form.slug, year: Number(form.startDate.slice(0, 4)) || new Date().getFullYear() }}
            />
            <p className="mt-2 text-[11px] text-[#778379]">Pre-filled with this event. Choose &quot;Communiqué&quot; as the type, upload the PDF, and set Access to PUBLIC so visitors can download it.</p>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}