"use client";
import { useState } from "react";
import { FilePlus2, Save, X } from "lucide-react";
import { useAdminApi, useAdminRefresh, feedbackClass } from "./admin-client";
import type { DocStatusKey } from "@/lib/workflow";

export interface EditableDocument {
  slug: string; title: string; type: string; author: string; topic: string; year: number;
  committee: string; eventSlug: string; pages: number; sizeLabel: string;
  summary: string; visibility: string; fileUrl: string;
}

const DOCUMENT_TYPES = ["Policy Brief", "Communiqué", "Report", "Position Paper", "Research", "Speech", "Presentation", "Briefing Note", "Governance Document"];
const DOCUMENT_VISIBILITIES = ["PUBLIC", "MEMBERS_ONLY", "COMMITTEE_ONLY", "SECRETARIAT_ONLY", "PRIVATE"];
const documentField = "w-full border border-[#d6ded6] bg-white px-3 py-2 text-[13px] focus:border-[#31774d] focus:outline-none";

const BLANK_DOCUMENT: EditableDocument = {
  slug: "", title: "", type: "Report", author: "FFDGN Secretariat", topic: "Governance",
  year: new Date().getFullYear(), committee: "", eventSlug: "", pages: 0,
  sizeLabel: "PDF", summary: "", visibility: "SECRETARIAT_ONLY", fileUrl: "",
};

function DocumentForm({ document: initial, eventSlugs, defaults, onClose }: { document: EditableDocument | null; eventSlugs: string[]; defaults?: Partial<EditableDocument>; onClose: () => void }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  // `defaults` seeds a brand-new record (the event panel pre-fills the event
  // and year); `initial` overrides it entirely when editing an existing one.
  const [form, setForm] = useState<EditableDocument>({ ...BLANK_DOCUMENT, ...defaults, ...(initial ?? {}) });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const editing = initial !== null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const { slug, ...details } = form;
      await api(editing ? `/api/v1/cms/documents/${encodeURIComponent(slug)}` : "/api/v1/cms/documents", editing ? "PATCH" : "POST", editing ? details : form);
      if (pdf) {
        const upload = new FormData();
        upload.set("file", pdf);
        const response = await fetch(`/api/v1/cms/documents/${encodeURIComponent(slug)}/file`, { method: "POST", body: upload });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.errors?.[0]?.message ?? `PDF upload failed (${response.status}).`);
      }
      setMessage({ ok: true, text: editing ? "Document details updated." : "Document added to Draft." });
      refresh();
      onClose();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Save failed." }); }
    finally { setBusy(false); }
  }

  const label = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#617066]";
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#12251b]/55 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="document-form-title" onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto border border-[#dce2dc] bg-[#f8faf7] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce2dc] bg-white px-5 py-4 sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Knowledge record</p><h2 id="document-form-title" className="mt-1 text-lg font-semibold text-[#1c3526]">{editing ? "Edit document" : "New document"}</h2></div><button type="button" onClick={onClose} aria-label="Close editor" title="Close" className="grid h-9 w-9 place-items-center border border-[#dce2dc] text-[#617066]"><X size={16} /></button></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
          <div><label className={label} htmlFor="doc-slug">URL slug</label><input id="doc-slug" required disabled={editing} className={`${documentField} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><label className={label} htmlFor="doc-type">Document type</label><select id="doc-type" className={documentField} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="doc-title">Title</label><input id="doc-title" required className={documentField} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className={label} htmlFor="doc-author">Author / issuing body</label><input id="doc-author" required className={documentField} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
          <div><label className={label} htmlFor="doc-topic">Topic</label><input id="doc-topic" required className={documentField} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
          <div><label className={label} htmlFor="doc-year">Year</label><input id="doc-year" type="number" min="1800" max="2200" required className={documentField} value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></div>
          <div><label className={label} htmlFor="doc-committee">Committee</label><input id="doc-committee" className={documentField} value={form.committee} onChange={(e) => setForm({ ...form, committee: e.target.value })} /></div>
          <div><label className={label} htmlFor="doc-event">Related event</label><select id="doc-event" className={documentField} value={form.eventSlug} onChange={(e) => setForm({ ...form, eventSlug: e.target.value })}><option value="">No event</option>{eventSlugs.map((slug) => <option key={slug}>{slug}</option>)}</select></div>
          <div><label className={label} htmlFor="doc-pages">Pages</label><input id="doc-pages" type="number" min="0" className={documentField} value={form.pages} onChange={(e) => setForm({ ...form, pages: Number(e.target.value) })} /></div>
          <div><label className={label} htmlFor="doc-size">File size label</label><input id="doc-size" required className={documentField} value={form.sizeLabel} onChange={(e) => setForm({ ...form, sizeLabel: e.target.value })} /></div>
          <div><label className={label} htmlFor="doc-visibility">Access</label><select id="doc-visibility" className={documentField} value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>{DOCUMENT_VISIBILITIES.map((value) => <option key={value}>{value}</option>)}</select></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="doc-file">PDF file</label><input id="doc-file" type="file" accept="application/pdf,.pdf" className={documentField} onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /><p className="mt-1 text-[11px] text-[#778379]">Maximum 25 MB. Stored outside the public asset directory.</p>{form.fileUrl && <p className="mt-1 truncate font-mono text-[10px] text-[#607067]">Current file: {form.fileUrl}</p>}{pdf && <p className="mt-1 text-[11px] text-[#28543a]">Selected: {pdf.name}</p>}</div>
          <div className="sm:col-span-2"><label className={label} htmlFor="doc-summary">Abstract / summary</label><textarea id="doc-summary" required rows={5} className={documentField} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#dce2dc] bg-white px-5 py-4 sm:px-7">{message ? <p role={message.ok ? "status" : "alert"} className={`text-[12px] ${message.ok ? "text-[#267147]" : "text-red-800"}`}>{message.text}</p> : <span className="text-[11px] text-[#778379]">New records start in Draft.</span>}<button disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"><Save size={14} />{busy ? "Saving…" : editing ? "Save metadata" : "Create draft"}</button></div>
      </form>
    </div>
  );
}

export function NewDocumentButton({ eventSlugs, defaults }: { eventSlugs: string[]; defaults?: Partial<EditableDocument> }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 bg-[#174b31] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#23613f]"><FilePlus2 size={15} /> New document</button>{open && <DocumentForm document={null} eventSlugs={eventSlugs} defaults={defaults} onClose={() => setOpen(false)} />}</>;
}

export function EditDocumentButton({ document, eventSlugs }: { document: EditableDocument; eventSlugs: string[] }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} title="Edit document details" aria-label={`Edit ${document.title}`} className="border border-[#dce2dc] px-2.5 py-1 text-[12px] font-semibold text-[#28543a] hover:bg-[#f5f8f4]">Edit details</button>{open && <DocumentForm document={document} eventSlugs={eventSlugs} onClose={() => setOpen(false)} />}</>;
}

export interface QueuedDoc {
  slug: string;
  title: string;
  status: string;
  type: string;
  year: number | null;
  visibility: string;
  version: number;
  /** Legal next states, already filtered by the operator's capabilities server-side. */
  transitions: { to: DocStatusKey; label: string }[];
}

/**
 * Approval queue.
 *
 * `transitions` arrives pre-filtered from the page, which reads the operator's
 * role. The client renders only those. Hiding a button the API would reject
 * matters more than it looks: an officer who clicks "Publish" and gets a 403
 * has no way to tell a permissions bug from a workflow bug.
 */
export function DocRowActions({ doc }: { doc: QueuedDoc }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<DocStatusKey | null>(null);

  async function move(to: DocStatusKey) {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api(`/api/v1/documents/${encodeURIComponent(doc.slug)}`, "PATCH", {
        to,
      });
      const changes = Array.isArray(data.changes) ? (data.changes as string[]).join("; ") : "";
      setMsg({ ok: true, text: changes || "Moved." });
      setTarget(null);
      refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Transition failed." });
    } finally {
      setBusy(false);
    }
  }

  if (doc.transitions.length === 0) {
    return (
      <p className="text-[12.5px] text-ink/50">
        No action available for your role at this stage.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {doc.transitions.map((t) =>
          target === t.to ? (
            <span key={t.to} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => move(t.to)}
                disabled={busy}
                className="bg-primary px-2.5 py-1 text-[12px] font-bold text-white hover:bg-forest-700 disabled:opacity-60"
              >
                {busy ? "…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => setTarget(null)}
                className="text-[12px] font-semibold text-ink/60"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              key={t.to}
              type="button"
              onClick={() => setTarget(t.to)}
              aria-label={`${t.label} for ${doc.title}`}
              className="border hairline px-2.5 py-1 text-[12px] font-semibold text-primary hover:bg-paper"
            >
              {t.label}
            </button>
          ),
        )}
      </div>
      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`mt-2 max-w-sm border px-3 py-1.5 text-[12px] ${feedbackClass(msg.ok)}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
