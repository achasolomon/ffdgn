"use client";

import { useState } from "react";
import { Handshake, Landmark, Pencil, Save } from "lucide-react";
import { useAdminApi, useAdminRefresh } from "./admin-client";
import { AdminMediaPicker } from "./admin-media-picker";

export type CommitteeRecord = {
  slug: string; name: string; mandate: string; chair: string; meetings: number;
  status: "Active" | "Standing" | "Ad-hoc"; published: boolean; members: string[];
  imageUrl: string; imageAlt: string;
};
export type PartnershipRecord = {
  slug: string; name: string; type: string; since: number; purpose: string;
  logoUrl: string; published: boolean; cooperation: string[]; events: string[];
};

const field = "w-full border border-[#d6ded6] bg-white px-3 py-2.5 text-[13px] text-[#23352a] placeholder:text-[#97a199] focus:border-[#31774d] focus:outline-none";
const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.09em] text-[#617066]";

function splitLines(value: string) { return value.split(/[\n,]+/).map((line) => line.trim()).filter(Boolean); }

export function AdminCommitteeManager({ committees, memberOptions }: { committees: CommitteeRecord[]; memberOptions: { slug: string; fullName: string }[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const empty: CommitteeRecord = { slug: "", name: "", mandate: "", chair: "", meetings: 0, status: "Active", published: false, members: [], imageUrl: "", imageAlt: "" };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  function select(record: CommitteeRecord) { setForm(record); setEditing(true); setMessage(null); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      await api(editing ? `/api/v1/cms/committees/${encodeURIComponent(form.slug)}` : "/api/v1/cms/committees", editing ? "PATCH" : "POST", { ...form, members: splitLines(form.members.join("\n")) });
      setMessage({ ok: true, text: editing ? "Committee updated." : "Committee created." }); setForm(empty); setEditing(false); refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Save failed." }); }
    finally { setBusy(false); }
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0 border border-[#dce2dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4"><div><h2 className="text-sm font-bold text-[#20372a]">Committees</h2><p className="mt-0.5 text-[12px] text-[#79847b]">{committees.length} records</p></div><Landmark size={17} className="text-[#62806b]" /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[13px]"><thead className="bg-[#f6f8f5] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#778379]"><tr><th className="px-5 py-3">Committee</th><th className="px-4 py-3">Chair</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Visibility</th><th /></tr></thead><tbody>{committees.map((record) => <tr key={record.slug} className="border-t border-[#edf0ed] hover:bg-[#fafbf9]"><td className="px-5 py-3.5"><span className="block font-semibold text-[#26382d]">{record.name}</span><span className="font-mono text-[10px] text-[#8a948c]">/{record.slug}</span></td><td className="px-4 py-3.5 text-[#657168]">{record.chair}</td><td className="px-4 py-3.5 text-[#657168]">{record.status}</td><td className="px-4 py-3.5 text-[11px] text-[#657168]">{record.published ? "Published" : "Draft"}</td><td className="px-4 py-3.5 text-right"><button type="button" title="Edit committee" aria-label={`Edit ${record.name}`} onClick={() => select(record)} className="inline-grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358] hover:text-[#174b31]"><Pencil size={14} /></button></td></tr>)}</tbody></table></div>
        {!committees.length && <p className="px-5 py-10 text-center text-sm text-[#79847b]">No committee records yet.</p>}
      </section>
      <form onSubmit={submit} className="border border-[#dce2dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7859]">Governance</p><h2 className="mt-0.5 text-sm font-bold text-[#20372a]">{editing ? "Edit committee" : "New committee"}</h2></div>{editing && <button type="button" onClick={() => { setForm(empty); setEditing(false); setMessage(null); }} className="text-[11px] font-semibold text-[#69766c]">Cancel</button>}</div>
        <div className="grid gap-4 p-5">
          <div><label className={label} htmlFor="committee-slug">URL slug</label><input id="committee-slug" required disabled={editing} className={`${field} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><label className={label} htmlFor="committee-name">Name</label><input id="committee-name" required className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className={label} htmlFor="committee-mandate">Mandate</label><textarea id="committee-mandate" required rows={4} className={field} value={form.mandate} onChange={(e) => setForm({ ...form, mandate: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="committee-chair">Chair member</label><select id="committee-chair" required className={field} value={form.chair} onChange={(e) => setForm({ ...form, chair: e.target.value })}><option value="">Select member</option>{memberOptions.map(member => <option key={member.slug} value={member.slug}>{member.fullName}</option>)}</select></div><div><label className={label} htmlFor="committee-meetings">Meetings</label><input id="committee-meetings" type="number" min="0" className={field} value={form.meetings} onChange={(e) => setForm({ ...form, meetings: Number(e.target.value) })} /></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="committee-status">Standing</label><select id="committee-status" className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CommitteeRecord["status"] })}><option>Active</option><option>Standing</option><option>Ad-hoc</option></select></div><fieldset><legend className={label}>Committee members</legend><div className="max-h-48 overflow-y-auto border p-3">{memberOptions.map(member => <label key={member.slug} className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.members.includes(member.slug)} onChange={e => setForm({ ...form, members: e.target.checked ? [...form.members, member.slug] : form.members.filter(slug => slug !== member.slug) })} />{member.fullName}</label>)}</div></fieldset></div>
          <div>
            <label className={label} htmlFor="committee-image">Card image</label>
            <div className="flex flex-wrap items-center gap-2">
              <input id="committee-image" className={`${field} flex-1 font-mono`} value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="/assets/events/…" />
              <AdminMediaPicker onSelect={(url, item) => setForm({ ...form, imageUrl: url, imageAlt: form.imageAlt || item.altText || "" })} />
              {form.imageUrl && <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-[#dce2dc] bg-[#f2f5f1]"><img src={form.imageUrl} alt="" className="h-full w-full object-cover" /></span>}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#7f8a81]">Optional. Leave empty to use the chair&apos;s portrait, or the numbered badge when they have none. The path is verified on save.</p>
          </div>
          {form.imageUrl && <div><label className={label} htmlFor="committee-image-alt">Image alt text</label><input id="committee-image-alt" required maxLength={300} className={field} value={form.imageAlt} onChange={(e) => setForm({ ...form, imageAlt: e.target.value })} /></div>}
          <label className="flex items-center gap-2 text-[12px] font-medium text-[#59675d]"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-[#1b6840]" /> Published on public site</label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9e4] bg-[#f8faf7] px-5 py-3.5">{message ? <p role={message.ok ? "status" : "alert"} className={`text-[12px] ${message.ok ? "text-[#267147]" : "text-red-800"}`}>{message.text}</p> : <span className="text-[11px] text-[#778379]">Edits are audit logged.</span>}<button disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"><Save size={14} />{busy ? "Saving…" : "Save committee"}</button></div>
      </form>
    </div>
  );
}

export function AdminPartnershipManager({ partnerships, eventSlugs }: { partnerships: PartnershipRecord[]; eventSlugs: string[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const empty: PartnershipRecord = { slug: "", name: "", type: "Institutional", since: new Date().getFullYear(), purpose: "", logoUrl: "", published: false, cooperation: [], events: [] };
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  function select(record: PartnershipRecord) { setForm(record); setEditing(true); setMessage(null); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const payload = { ...form, cooperation: splitLines(form.cooperation.join("\n")), events: splitLines(form.events.join("\n")) };
      await api(editing ? `/api/v1/cms/partnerships/${encodeURIComponent(form.slug)}` : "/api/v1/cms/partnerships", editing ? "PATCH" : "POST", payload);
      setMessage({ ok: true, text: editing ? "Partnership updated." : "Partnership created." }); setForm(empty); setEditing(false); refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Save failed." }); }
    finally { setBusy(false); }
  }
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0 border border-[#dce2dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4"><div><h2 className="text-sm font-bold text-[#20372a]">Partnerships</h2><p className="mt-0.5 text-[12px] text-[#79847b]">{partnerships.length} records</p></div><Handshake size={17} className="text-[#62806b]" /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-[13px]"><thead className="bg-[#f6f8f5] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#778379]"><tr><th className="px-5 py-3">Partner</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Since</th><th className="px-4 py-3">Visibility</th><th /></tr></thead><tbody>{partnerships.map((record) => <tr key={record.slug} className="border-t border-[#edf0ed] hover:bg-[#fafbf9]"><td className="px-5 py-3.5"><span className="block font-semibold text-[#26382d]">{record.name}</span><span className="font-mono text-[10px] text-[#8a948c]">/{record.slug}</span></td><td className="px-4 py-3.5 text-[#657168]">{record.type}</td><td className="px-4 py-3.5 text-[#657168]">{record.since}</td><td className="px-4 py-3.5 text-[11px] text-[#657168]">{record.published ? "Published" : "Draft"}</td><td className="px-4 py-3.5 text-right"><button type="button" title="Edit partnership" aria-label={`Edit ${record.name}`} onClick={() => select(record)} className="inline-grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358] hover:text-[#174b31]"><Pencil size={14} /></button></td></tr>)}</tbody></table></div>
        {!partnerships.length && <p className="px-5 py-10 text-center text-sm text-[#79847b]">No partnership records yet.</p>}
      </section>
      <form onSubmit={submit} className="border border-[#dce2dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7859]">Engagement</p><h2 className="mt-0.5 text-sm font-bold text-[#20372a]">{editing ? "Edit partnership" : "New partnership"}</h2></div>{editing && <button type="button" onClick={() => { setForm(empty); setEditing(false); setMessage(null); }} className="text-[11px] font-semibold text-[#69766c]">Cancel</button>}</div>
        <div className="grid gap-4 p-5">
          <div><label className={label} htmlFor="partner-slug">URL slug</label><input id="partner-slug" required disabled={editing} className={`${field} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><label className={label} htmlFor="partner-name">Organisation</label><input id="partner-name" required className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="partner-type">Relationship type</label><input id="partner-type" required className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></div><div><label className={label} htmlFor="partner-since">Since</label><input id="partner-since" required type="number" min="1900" max="2200" className={field} value={form.since} onChange={(e) => setForm({ ...form, since: Number(e.target.value) })} /></div></div>
          <div><label className={label} htmlFor="partner-logo">Logo</label><div className="flex flex-wrap gap-2"><input id="partner-logo" className={`${field} min-w-[200px] flex-1 font-mono`} value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="/media/partners/logo.png" /><AdminMediaPicker onSelect={(url) => setForm({ ...form, logoUrl: url })} /></div></div>
          <div><label className={label} htmlFor="partner-purpose">Purpose</label><textarea id="partner-purpose" required rows={4} className={field} value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
          <div><label className={label} htmlFor="partner-cooperation">Cooperation areas</label><textarea id="partner-cooperation" rows={3} className={field} value={form.cooperation.join("\n")} onChange={(e) => setForm({ ...form, cooperation: splitLines(e.target.value) })} /></div>
          <div><label className={label} htmlFor="partner-events">Related event slugs</label><textarea id="partner-events" rows={2} className={`${field} font-mono text-[12px]`} value={form.events.join("\n")} onChange={(e) => setForm({ ...form, events: splitLines(e.target.value) })} placeholder={eventSlugs.slice(0, 2).join("\n")} /></div>
          <label className="flex items-center gap-2 text-[12px] font-medium text-[#59675d]"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-[#1b6840]" /> Published on public site</label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9e4] bg-[#f8faf7] px-5 py-3.5">{message ? <p role={message.ok ? "status" : "alert"} className={`text-[12px] ${message.ok ? "text-[#267147]" : "text-red-800"}`}>{message.text}</p> : <span className="text-[11px] text-[#778379]">Edits are audit logged.</span>}<button disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"><Save size={14} />{busy ? "Saving…" : "Save partnership"}</button></div>
      </form>
    </div>
  );
}