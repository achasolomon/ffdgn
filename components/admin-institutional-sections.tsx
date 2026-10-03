"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { useAdminApi, useAdminRefresh } from "./admin-client";
import { AdminMediaPicker } from "./admin-media-picker";
import type { InstitutionalSectionContent } from "@/lib/institutional-pages";

const field = "w-full border border-[#d6ded6] bg-white px-3 py-2.5 text-[13px] text-[#23352a] focus:border-[#31774d] focus:outline-none";
const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.09em] text-[#617066]";

type Draft = {
  id?: string;
  title: string;
  body: string;
  imageUrl: string;
  imageAlt: string;
  position: number;
  published: boolean;
};

function toDraft(section: InstitutionalSectionContent): Draft {
  return {
    id: section.id,
    title: section.title,
    body: section.body,
    imageUrl: section.imageUrl ?? "",
    imageAlt: section.imageAlt ?? "",
    position: section.position,
    published: section.published !== false,
  };
}

/**
 * Editor for institutional page sections.
 *
 * Sections save individually against /sections rather than bundling into the
 * page copy request, so one invalid section cannot block the rest of the page
 * and the page form keeps its own save button.
 */
export function AdminInstitutionalSections({ slug, sections }: { slug: string; sections: InstitutionalSectionContent[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [drafts, setDrafts] = useState<Draft[]>(() => sections.map(toDraft));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function change(index: number, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)));
  }

  function addDraft() {
    setDrafts((current) => [...current, { title: "", body: "", imageUrl: "", imageAlt: "", position: current.length, published: true }]);
    setMessage(null);
  }

  async function createSection(index: number) {
    const draft = drafts[index];
    setBusyId(`new-${index}`); setMessage(null);
    try {
      await api(`/api/v1/cms/pages/${slug}/sections`, "POST", draft);
      setMessage({ ok: true, text: "Section added." });
      refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not add section." }); }
    finally { setBusyId(null); }
  }

  async function saveSection(index: number) {
    const draft = drafts[index];
    if (!draft.id) return;
    setBusyId(draft.id); setMessage(null);
    try {
      await api(`/api/v1/cms/pages/${slug}/sections`, "PATCH", { ...draft });
      setMessage({ ok: true, text: "Section saved." });
      refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not save section." }); }
    finally { setBusyId(null); }
  }

  async function removeSection(index: number) {
    const draft = drafts[index];
    if (!draft.id) return;
    setBusyId(draft.id); setMessage(null);
    try {
      await api(`/api/v1/cms/pages/${slug}/sections?id=${encodeURIComponent(draft.id)}`, "DELETE");
      setDrafts((current) => current.filter((_, i) => i !== index));
      setMessage({ ok: true, text: "Section removed." });
      refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Could not remove section." }); }
    finally { setBusyId(null); }
  }

  return (
    <div className="border border-[#dce2dc] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e9e4] px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7859]">Sections</p>
          <h3 className="mt-0.5 text-sm font-bold text-[#20372a]">Illustrated blocks</h3>
        </div>
        <button type="button" onClick={addDraft} className="inline-flex items-center gap-2 border border-[#cbd8cd] px-3 py-2 text-[11px] font-semibold text-[#28543a] hover:bg-[#f5f8f4]">
          <Plus size={14} /> New section
        </button>
      </div>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`border-b px-5 py-3 text-[12px] ${message.ok ? "border-[#e4e9e4] text-[#267147]" : "border-red-200 bg-red-50 text-red-800"}`}>
          {message.text}
        </p>
      )}

      {!drafts.length ? (
        <p className="px-5 py-8 text-center text-[13px] text-[#768279]">No sections on this page yet.</p>
      ) : (
        <div className="grid gap-px bg-[#e2e8e2]">
          {drafts.map((draft, index) => (
            <fieldset key={draft.id ?? `new-${index}`} className="bg-white p-5">
              <legend className="sr-only">Section {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={label} htmlFor={`section-title-${index}`}>Section title</label>
                  <input id={`section-title-${index}`} required maxLength={200} className={field} value={draft.title} onChange={(event) => change(index, { title: event.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor={`section-body-${index}`}>Section text</label>
                  <textarea id={`section-body-${index}`} required rows={5} maxLength={5000} className={`${field} leading-relaxed`} value={draft.body} onChange={(event) => change(index, { body: event.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className={label} htmlFor={`section-image-${index}`}>Section image path</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input id={`section-image-${index}`} className={`${field} flex-1`} value={draft.imageUrl} onChange={(event) => change(index, { imageUrl: event.target.value })} placeholder="/media/site/example.jpg" />
                    <AdminMediaPicker onSelect={(url, item) => change(index, { imageUrl: url, imageAlt: draft.imageAlt || item.altText || "" })} />
                  </div>
                  <p className="mt-1 text-[11px] text-[#7d887f]">Optional. Choose from the library or type an existing /public path.</p>
                </div>
                {draft.imageUrl && (
                  <div className="sm:col-span-2">
                    <label className={label} htmlFor={`section-alt-${index}`}>Alt text (required with an image)</label>
                    <input id={`section-alt-${index}`} required maxLength={300} className={field} value={draft.imageAlt} onChange={(event) => change(index, { imageAlt: event.target.value })} />
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-[12px] text-[#58655c]">
                  <input type="checkbox" checked={draft.published} onChange={(event) => change(index, { published: event.target.checked })} />
                  Published
                </label>
                <span className="flex-1" />
                <button type="button" onClick={() => (draft.id ? saveSection(index) : createSection(index))} disabled={busyId !== null} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60">
                  <Save size={14} />{draft.id ? "Save section" : "Add section"}
                </button>
                {draft.id && (
                  <button type="button" onClick={() => removeSection(index)} disabled={busyId !== null} className="inline-flex items-center gap-2 border border-red-300 px-3 py-2.5 text-[12px] font-semibold text-red-800 disabled:opacity-60">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
            </fieldset>
          ))}
        </div>
      )}
    </div>
  );
}
