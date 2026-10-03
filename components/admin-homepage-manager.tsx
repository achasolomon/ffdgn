"use client";

import { useState } from "react";
import { FilePlus2, Pencil, Save } from "lucide-react";
import { useAdminApi, useAdminRefresh } from "./admin-client";
import { AdminMediaPicker } from "./admin-media-picker";

type Focus = { id: string; slug: string; title: string; text: string; href: string; imageUrl: string; position: number; published: boolean };
type Timeline = { id: string; year: number; title: string; summary: string; imageUrl: string; position: number; published: boolean; links: { label: string; href: string }[] };
type Leadership = { id: string; role: string; tier: number; remit: string; memberSlug: string; position: number; published: boolean };
type MemberOption = { slug: string; name: string; photo?: string };
type Form =
  | ({ kind: "focus" } & Omit<Focus, "id"> & { id?: string })
  | ({ kind: "timeline" } & Omit<Timeline, "id"> & { id?: string })
  | ({ kind: "leadership"; imageUrl: string } & Omit<Leadership, "id"> & { id?: string });

const field = "w-full border border-[#d6ded6] bg-white px-3 py-2.5 text-[13px] text-[#23352a] placeholder:text-[#97a199] focus:border-[#31774d] focus:outline-none";
const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.09em] text-[#617066]";
const emptyFocus = (): Form => ({ kind: "focus", slug: "", title: "", text: "", href: "/about", imageUrl: "", position: 0, published: false });
const emptyTimeline = (): Form => ({ kind: "timeline", year: new Date().getFullYear(), title: "", summary: "", imageUrl: "", position: 0, published: false, links: [] });
const emptyLeadership = (): Form => ({ kind: "leadership", role: "", tier: 2, remit: "", memberSlug: "", imageUrl: "", position: 0, published: false });

/**
 * Image attachment for focus areas and timeline entries.
 *
 * The typed path is kept because seeded records already point at files under
 * /public rather than library rows; the picker is the route of choice for
 * anything new. The API re-checks whichever value arrives against the media
 * library and the filesystem, so a typo cannot be saved.
 */
function ImageField({ id, value, onChange }: { id: string; value: string; onChange: (url: string) => void }) {
  return (
    <div>
      <label className={label} htmlFor={id}>Image</label>
      <div className="flex flex-wrap items-center gap-2">
        <input id={id} className={`${field} flex-1 font-mono`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="/assets/events/…" />
        <AdminMediaPicker onSelect={(url) => onChange(url)} />
        {value && (
          <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden border border-[#dce2dc] bg-[#f2f5f1]">
            <img src={value} alt="" className="h-full w-full object-cover" />
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#7f8a81]">
        Choose from the media library, or type a path to a file under <span className="font-mono">/public</span>. The path is verified on save.
      </p>
    </div>
  );
}

export function AdminHomepageManager({ focusAreas, timeline, leadership, members }: {
  focusAreas: Focus[]; timeline: Timeline[]; leadership: Leadership[]; members: MemberOption[];
}) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [kind, setKind] = useState<Form["kind"]>("focus");
  const [form, setForm] = useState<Form>(emptyFocus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const records = kind === "focus" ? focusAreas : kind === "timeline" ? timeline : leadership;
  const reset = (nextKind: Form["kind"] = kind) => {
    setKind(nextKind);
    setForm(nextKind === "focus" ? emptyFocus() : nextKind === "timeline" ? emptyTimeline() : emptyLeadership());
    setMessage(null);
  };
  function edit(record: Focus | Timeline | Leadership) {
    if ("slug" in record) {
      setKind("focus");
      setForm({ kind: "focus", ...record });
    } else if ("year" in record) {
      setKind("timeline");
      setForm({ kind: "timeline", ...record });
    } else {
      setKind("leadership");
      // A seat carries no portrait of its own; prefill from the member it points
      // at so the field shows what /leadership renders today.
      setForm({ kind: "leadership", ...record, imageUrl: members.find((m) => m.slug === record.memberSlug)?.photo ?? "" });
    }
    setMessage(null);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      await api("/api/v1/cms/homepage", form.id ? "PATCH" : "POST", form as unknown as Record<string, unknown>);
      setMessage({ ok: true, text: form.id ? "Record updated." : "Record created." });
      reset(kind); refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Save failed." }); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex border border-[#dce2dc] bg-white p-1" role="tablist" aria-label="Homepage content type">
          {(["focus", "timeline", "leadership"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={kind === value} onClick={() => reset(value)} className={`px-3 py-2 text-[12px] font-semibold capitalize ${kind === value ? "bg-[#174b31] text-white" : "text-[#617066] hover:bg-[#f2f5f1]"}`}>{value === "focus" ? "Focus areas" : value === "timeline" ? "Timeline" : "Leadership"}</button>)}
        </div>
        <button type="button" onClick={() => reset()} className="inline-flex items-center gap-2 border border-[#cbd8cd] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#28543a] hover:bg-[#f5f8f4]"><FilePlus2 size={14} /> New record</button>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0 border border-[#dce2dc] bg-white">
          <div className="border-b border-[#e4e9e4] px-5 py-4"><h2 className="text-sm font-bold text-[#20372a]">{kind === "focus" ? "Focus areas" : kind === "timeline" ? "Institutional timeline" : "Leadership seats"}</h2><p className="mt-0.5 text-[12px] text-[#79847b]">{records.length} records · order controlled by position</p></div>
          {kind === "focus" && <table className="w-full text-left text-[13px]"><thead className="bg-[#f6f8f5] text-[10px] uppercase tracking-[0.1em] text-[#778379]"><tr><th className="px-5 py-3">Focus area</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Visibility</th><th /></tr></thead><tbody>{focusAreas.map((row) => <tr key={row.id} className="border-t border-[#edf0ed]"><td className="px-5 py-3.5 font-semibold text-[#26382d]">{row.title}</td><td className="px-4 py-3.5 text-[#657168]">{row.position}</td><td className="px-4 py-3.5 text-[11px] text-[#657168]">{row.published ? "Published" : "Draft"}</td><td className="px-4 py-3.5 text-right"><button type="button" onClick={() => edit(row)} title="Edit focus area" aria-label={`Edit ${row.title}`} className="inline-grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358]"><Pencil size={14} /></button></td></tr>)}</tbody></table>}
          {kind === "timeline" && <table className="w-full text-left text-[13px]"><thead className="bg-[#f6f8f5] text-[10px] uppercase tracking-[0.1em] text-[#778379]"><tr><th className="px-5 py-3">Year / entry</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Visibility</th><th /></tr></thead><tbody>{timeline.map((row) => <tr key={row.id} className="border-t border-[#edf0ed]"><td className="px-5 py-3.5"><span className="font-semibold text-[#26382d]">{row.year} · {row.title}</span></td><td className="px-4 py-3.5 text-[#657168]">{row.position}</td><td className="px-4 py-3.5 text-[11px] text-[#657168]">{row.published ? "Published" : "Draft"}</td><td className="px-4 py-3.5 text-right"><button type="button" onClick={() => edit(row)} title="Edit timeline entry" aria-label={`Edit ${row.title}`} className="inline-grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358]"><Pencil size={14} /></button></td></tr>)}</tbody></table>}
          {kind === "leadership" && <table className="w-full text-left text-[13px]"><thead className="bg-[#f6f8f5] text-[10px] uppercase tracking-[0.1em] text-[#778379]"><tr><th className="px-5 py-3">Role</th><th className="px-4 py-3">Tier / order</th><th className="px-4 py-3">Visibility</th><th /></tr></thead><tbody>{leadership.map((row) => <tr key={row.id} className="border-t border-[#edf0ed]"><td className="px-5 py-3.5 font-semibold text-[#26382d]">{row.role}</td><td className="px-4 py-3.5 text-[#657168]">{row.tier} / {row.position}</td><td className="px-4 py-3.5 text-[11px] text-[#657168]">{row.published ? "Published" : "Draft"}</td><td className="px-4 py-3.5 text-right"><button type="button" onClick={() => edit(row)} title="Edit leadership seat" aria-label={`Edit ${row.role}`} className="inline-grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358]"><Pencil size={14} /></button></td></tr>)}</tbody></table>}
          {!records.length && <p className="px-5 py-10 text-center text-sm text-[#79847b]">No records yet.</p>}
        </section>

        <form onSubmit={submit} className="border border-[#dce2dc] bg-white">
          <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7859]">Homepage content</p><h2 className="mt-0.5 text-sm font-bold text-[#20372a]">{form.id ? "Edit record" : "New record"}</h2></div>{form.id && <button type="button" onClick={() => reset()} className="text-[11px] font-semibold text-[#69766c]">Cancel</button>}</div>
          <div className="grid gap-4 p-5">
            {form.kind === "focus" && <>
              <div><label className={label} htmlFor="focus-slug">URL slug</label><input id="focus-slug" required disabled={!!form.id} className={`${field} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
              <div><label className={label} htmlFor="focus-title">Title</label><input id="focus-title" required className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className={label} htmlFor="focus-text">Description</label><textarea id="focus-text" required rows={4} className={field} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></div>
              <div><label className={label} htmlFor="focus-href">Destination path</label><input id="focus-href" required className={`${field} font-mono`} value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} /></div>
              <ImageField id="focus-image" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
              <div><label className={label} htmlFor="focus-position">Position</label><input id="focus-position" type="number" min="0" className={field} value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></div>
            </>}
            {form.kind === "timeline" && <>
              <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="timeline-year">Year</label><input id="timeline-year" type="number" min="1800" max="2200" className={field} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div><div><label className={label} htmlFor="timeline-position">Position</label><input id="timeline-position" type="number" min="0" className={field} value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></div></div>
              <div><label className={label} htmlFor="timeline-title">Title</label><input id="timeline-title" required className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className={label} htmlFor="timeline-summary">Summary</label><textarea id="timeline-summary" required rows={4} className={field} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
              <ImageField id="timeline-image" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
              <div><label className={label} htmlFor="timeline-links">Related links</label><textarea id="timeline-links" rows={3} className={`${field} font-mono text-[12px]`} value={form.links.map((link) => `${link.label} | ${link.href}`).join("\n")} onChange={(e) => setForm({ ...form, links: e.target.value.split("\n").map((line) => { const [linkLabel = "", href = ""] = line.split("|").map((part) => part.trim()); return { label: linkLabel, href }; }).filter((link) => link.label || link.href) })} placeholder="Archive | /about/history" /></div>
            </>}
            {form.kind === "leadership" && <>
              <div><label className={label} htmlFor="leadership-role">Role</label><input id="leadership-role" required className={field} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
              <div><label className={label} htmlFor="leadership-member">Member</label><select id="leadership-member" required className={field} value={form.memberSlug} onChange={(e) => { const slug = e.target.value; setForm({ ...form, memberSlug: slug, imageUrl: members.find((m) => m.slug === slug)?.photo ?? "" }); }}><option value="">Select member</option>{members.map((member) => <option key={member.slug} value={member.slug}>{member.name}</option>)}</select></div>
              <ImageField id="leadership-image" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} />
              <p className="-mt-2 text-[11px] leading-relaxed text-[#7f8a81]">Saved to the member&apos;s portrait, which the leadership page and the member profile both use.</p>
              <div><label className={label} htmlFor="leadership-remit">Remit</label><textarea id="leadership-remit" required rows={4} className={field} value={form.remit} onChange={(e) => setForm({ ...form, remit: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-2"><div><label className={label} htmlFor="leadership-tier">Tier</label><input id="leadership-tier" type="number" min="0" max="10" className={field} value={form.tier} onChange={(e) => setForm({ ...form, tier: Number(e.target.value) })} /></div><div><label className={label} htmlFor="leadership-position">Position</label><input id="leadership-position" type="number" min="0" className={field} value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} /></div></div>
            </>}
            <label className="flex items-center gap-2 text-[12px] font-medium text-[#59675d]"><input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-[#1b6840]" /> Published on public site</label>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9e4] bg-[#f8faf7] px-5 py-3.5">{message ? <p role={message.ok ? "status" : "alert"} className={`text-[12px] ${message.ok ? "text-[#267147]" : "text-red-800"}`}>{message.text}</p> : <span className="text-[11px] text-[#778379]">Changes are audit logged.</span>}<button disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"><Save size={14} />{busy ? "Saving…" : "Save"}</button></div>
        </form>
      </div>
    </div>
  );
}