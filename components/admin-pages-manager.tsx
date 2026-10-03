"use client";

import { useState } from "react";
import { FileText, Save } from "lucide-react";
import { useAdminApi, useAdminRefresh } from "./admin-client";
import { AdminInstitutionalSections } from "./admin-institutional-sections";
import type { InstitutionalPageContent } from "@/lib/institutional-pages";

const field = "w-full border border-[#d6ded6] bg-white px-3 py-2.5 text-[13px] text-[#23352a] focus:border-[#31774d] focus:outline-none";
const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.09em] text-[#617066]";

export function AdminPagesManager({ pages }: { pages: InstitutionalPageContent[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [selected, setSelected] = useState(pages[0]?.slug ?? "about");
  const [values, setValues] = useState<Record<string, InstitutionalPageContent>>(Object.fromEntries(pages.map((page) => [page.slug, page])));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const page = values[selected];

  function update(next: Partial<InstitutionalPageContent>) {
    setValues((current) => ({ ...current, [selected]: { ...current[selected], ...next } }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      await api(`/api/v1/cms/pages/${selected}`, "PATCH", { title: page.title, eyebrow: page.eyebrow, lede: page.lede, body: page.body });
      setMessage({ ok: true, text: "Page copy saved." });
      refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Save failed." }); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[250px_minmax(0,1fr)]">
      <nav aria-label="Institutional pages" className="border border-[#dce2dc] bg-white">
        <p className="border-b border-[#e4e9e4] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#718077]">Published pages</p>
        {pages.map((item) => <button key={item.slug} type="button" onClick={() => { setSelected(item.slug); setMessage(null); }} aria-current={selected === item.slug ? "page" : undefined} className={`flex w-full items-center gap-2 border-l-2 px-4 py-3 text-left text-[13px] font-medium ${selected === item.slug ? "border-[#177344] bg-[#edf5ef] text-[#145b35]" : "border-transparent text-[#58655c] hover:bg-[#f4f6f3]"}`}><FileText size={15} />{item.slug === "about" ? "About the Forum" : item.slug === "governance" ? "Governance" : item.slug === "privacy" ? "Privacy" : item.slug === "renewed-hope" ? "Renewed Hope" : item.slug === "polish-nigeria" ? "Polish Nigeria" : "Accessibility"}</button>)}
      </nav>
      {page && <div className="grid gap-6">
        <form onSubmit={submit} className="border border-[#dce2dc] bg-white">
        <div className="border-b border-[#e4e9e4] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7859]">Institutional copy</p><h2 className="mt-0.5 text-sm font-bold text-[#20372a]">{page.title}</h2></div>
        <div className="grid gap-4 p-5 sm:p-6">
          <div><label className={label} htmlFor="page-eyebrow">Eyebrow</label><input id="page-eyebrow" required maxLength={128} className={field} value={page.eyebrow} onChange={(e) => update({ eyebrow: e.target.value })} /></div>
          <div><label className={label} htmlFor="page-title">Page title</label><input id="page-title" required maxLength={255} className={field} value={page.title} onChange={(e) => update({ title: e.target.value })} /></div>
          <div><label className={label} htmlFor="page-lede">Lead paragraph</label><textarea id="page-lede" required rows={3} className={field} value={page.lede} onChange={(e) => update({ lede: e.target.value })} /></div>
          <div><label className={label} htmlFor="page-body">Page copy</label><textarea id="page-body" required rows={18} className={`${field} leading-relaxed`} value={page.body} onChange={(e) => update({ body: e.target.value })} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9e4] bg-[#f8faf7] px-5 py-3.5">{message ? <p role={message.ok ? "status" : "alert"} className={`text-[12px] ${message.ok ? "text-[#267147]" : "text-red-800"}`}>{message.text}</p> : <span className="text-[11px] text-[#778379]">These policy pages remain published.</span>}<button disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"><Save size={14} />{busy ? "Saving…" : "Save page copy"}</button></div>
        </form>
        <AdminInstitutionalSections key={selected} slug={selected} sections={page.sections} />
      </div>}
    </div>
  );
}