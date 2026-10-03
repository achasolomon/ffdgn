"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { useAdminApi, useAdminRefresh } from "./admin-client";

type ChildLink = { label: string; href: string; desc: string };
type NavigationItem = { label: string; href: string; children: ChildLink[] };
type FooterLink = { label: string; href: string };
type FooterColumn = { heading: string; links: FooterLink[] };

const inputClass = "w-full border border-[#d6ded6] bg-white px-3 py-2 text-[12px] text-[#23352a] placeholder:text-[#97a199] focus:border-[#31774d] focus:outline-none";
const miniLabel = "mb-1 block text-[9px] font-semibold uppercase tracking-[0.09em] text-[#778379]";

function move<T>(values: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= values.length) return values;
  const next = [...values];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function AdminNavigationManager({ initialNavigation, initialFooter, knownPages = [] }: { initialNavigation: NavigationItem[]; initialFooter: FooterColumn[]; knownPages?: {path:string;title:string}[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [navigation, setNavigation] = useState(initialNavigation);
  const [footer, setFooter] = useState(initialFooter);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      await api("/api/v1/cms/navigation", "PATCH", { navigation, footer });
      setMessage({ ok: true, text: "Navigation saved." });
      refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Save failed." }); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <datalist id="cms-page-destinations">{knownPages.map(page=><option key={page.path} value={page.path}>{page.title}</option>)}</datalist>
      <p className="text-sm text-[#69776d]">Choose a published page from the destination suggestions, or enter a link to a section of the website.</p>
      <section className="border border-[#dce2dc] bg-white" aria-labelledby="primary-nav-heading">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4"><div><h2 id="primary-nav-heading" className="text-sm font-bold text-[#20372a]">Primary navigation</h2><p className="mt-0.5 text-[12px] text-[#79847b]">Menu groups and their child links, in display order.</p></div><button type="button" onClick={() => setNavigation([...navigation, { label: "", href: "/about", children: [] }])} className="inline-flex items-center gap-1.5 border border-[#cbd8cd] px-3 py-2 text-[11px] font-semibold text-[#28543a]"><Plus size={13} /> Add group</button></div>
        <div className="divide-y divide-[#e7ece7]">
          {navigation.map((item, itemIndex) => <div key={itemIndex} className="p-4 sm:p-5">
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
              <div><label className={miniLabel} htmlFor={`nav-label-${itemIndex}`}>Group label</label><input id={`nav-label-${itemIndex}`} required maxLength={80} className={inputClass} value={item.label} onChange={(e) => setNavigation(navigation.map((row, i) => i === itemIndex ? { ...row, label: e.target.value } : row))} /></div>
              <div><label className={miniLabel} htmlFor={`nav-href-${itemIndex}`}>Group destination</label><input id={`nav-href-${itemIndex}`} list="cms-page-destinations" required maxLength={255} className={`${inputClass} font-mono`} value={item.href} onChange={(e) => setNavigation(navigation.map((row, i) => i === itemIndex ? { ...row, href: e.target.value } : row))} /></div>
              <div className="flex items-center gap-1"><button type="button" title="Move group up" aria-label="Move group up" disabled={itemIndex === 0} onClick={() => setNavigation(move(navigation, itemIndex, -1))} className="grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358] disabled:opacity-35"><ArrowUp size={14} /></button><button type="button" title="Move group down" aria-label="Move group down" disabled={itemIndex === navigation.length - 1} onClick={() => setNavigation(move(navigation, itemIndex, 1))} className="grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358] disabled:opacity-35"><ArrowDown size={14} /></button><button type="button" title="Remove group" aria-label="Remove group" onClick={() => setNavigation(navigation.filter((_, i) => i !== itemIndex))} className="grid h-8 w-8 place-items-center border border-[#ead6d6] text-[#a24a4a]"><Trash2 size={14} /></button></div>
            </div>
            <div className="ml-3 mt-4 space-y-3 border-l-2 border-[#dce9de] pl-4 sm:ml-5 sm:pl-5">
              {item.children.map((child, childIndex) => <div key={childIndex} className="grid gap-3 rounded-sm bg-[#f6f8f5] p-3 sm:grid-cols-[1fr_1.3fr_1.2fr_34px]">
                <div><label className={miniLabel} htmlFor={`child-label-${itemIndex}-${childIndex}`}>Link label</label><input id={`child-label-${itemIndex}-${childIndex}`} required maxLength={80} className={inputClass} value={child.label} onChange={(e) => setNavigation(navigation.map((row, i) => i === itemIndex ? { ...row, children: row.children.map((entry, n) => n === childIndex ? { ...entry, label: e.target.value } : entry) } : row))} /></div>
                <div><label className={miniLabel} htmlFor={`child-href-${itemIndex}-${childIndex}`}>Destination</label><input id={`child-href-${itemIndex}-${childIndex}`} list="cms-page-destinations" required maxLength={255} className={`${inputClass} font-mono`} value={child.href} onChange={(e) => setNavigation(navigation.map((row, i) => i === itemIndex ? { ...row, children: row.children.map((entry, n) => n === childIndex ? { ...entry, href: e.target.value } : entry) } : row))} /></div>
                <div><label className={miniLabel} htmlFor={`child-desc-${itemIndex}-${childIndex}`}>Description</label><input id={`child-desc-${itemIndex}-${childIndex}`} required maxLength={255} className={inputClass} value={child.desc} onChange={(e) => setNavigation(navigation.map((row, i) => i === itemIndex ? { ...row, children: row.children.map((entry, n) => n === childIndex ? { ...entry, desc: e.target.value } : entry) } : row))} /></div>
                <button type="button" title="Remove link" aria-label="Remove link" onClick={() => setNavigation(navigation.map((row, i) => i === itemIndex ? { ...row, children: row.children.filter((_, n) => n !== childIndex) } : row))} className="grid h-8 w-8 place-items-center self-end border border-[#ead6d6] text-[#a24a4a]"><Trash2 size={13} /></button>
              </div>)}
              <button type="button" onClick={() => setNavigation(navigation.map((row, i) => i === itemIndex ? { ...row, children: [...row.children, { label: "", href: "/about", desc: "" }] } : row))} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#28543a]"><Plus size={13} /> Add child link</button>
            </div>
          </div>)}
        </div>
      </section>

      <section className="border border-[#dce2dc] bg-white" aria-labelledby="footer-heading">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4"><div><h2 id="footer-heading" className="text-sm font-bold text-[#20372a]">Footer columns</h2><p className="mt-0.5 text-[12px] text-[#79847b]">Grouped links, in display order.</p></div><button type="button" onClick={() => setFooter([...footer, { heading: "", links: [] }])} className="inline-flex items-center gap-1.5 border border-[#cbd8cd] px-3 py-2 text-[11px] font-semibold text-[#28543a]"><Plus size={13} /> Add column</button></div>
        <div className="grid gap-px bg-[#e7ece7] md:grid-cols-2">
          {footer.map((column, columnIndex) => <div key={columnIndex} className="bg-white p-4 sm:p-5">
            <div className="flex items-end gap-2"><div className="min-w-0 flex-1"><label className={miniLabel} htmlFor={`footer-heading-${columnIndex}`}>Column heading</label><input id={`footer-heading-${columnIndex}`} required maxLength={80} className={inputClass} value={column.heading} onChange={(e) => setFooter(footer.map((row, i) => i === columnIndex ? { ...row, heading: e.target.value } : row))} /></div><button type="button" title="Remove column" aria-label="Remove column" onClick={() => setFooter(footer.filter((_, i) => i !== columnIndex))} className="grid h-8 w-8 place-items-center border border-[#ead6d6] text-[#a24a4a]"><Trash2 size={14} /></button></div>
            <div className="mt-3 space-y-2">{column.links.map((link, linkIndex) => <div key={linkIndex} className="grid gap-2 sm:grid-cols-[1fr_1.3fr_34px]"><div><label className={miniLabel} htmlFor={`footer-link-label-${columnIndex}-${linkIndex}`}>Link label</label><input id={`footer-link-label-${columnIndex}-${linkIndex}`} required maxLength={80} className={inputClass} value={link.label} onChange={(e) => setFooter(footer.map((row, i) => i === columnIndex ? { ...row, links: row.links.map((entry, n) => n === linkIndex ? { ...entry, label: e.target.value } : entry) } : row))} /></div><div><label className={miniLabel} htmlFor={`footer-link-href-${columnIndex}-${linkIndex}`}>Destination</label><input id={`footer-link-href-${columnIndex}-${linkIndex}`} list="cms-page-destinations" required maxLength={255} className={`${inputClass} font-mono`} value={link.href} onChange={(e) => setFooter(footer.map((row, i) => i === columnIndex ? { ...row, links: row.links.map((entry, n) => n === linkIndex ? { ...entry, href: e.target.value } : entry) } : row))} /></div><button type="button" title="Remove link" aria-label="Remove link" onClick={() => setFooter(footer.map((row, i) => i === columnIndex ? { ...row, links: row.links.filter((_, n) => n !== linkIndex) } : row))} className="grid h-8 w-8 place-items-center self-end border border-[#ead6d6] text-[#a24a4a]"><Trash2 size={13} /></button></div>)}</div>
            <button type="button" onClick={() => setFooter(footer.map((row, i) => i === columnIndex ? { ...row, links: [...row.links, { label: "", href: "/about" }] } : row))} className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#28543a]"><Plus size={13} /> Add footer link</button>
          </div>)}
        </div>
      </section>

      <div className="sticky bottom-3 flex flex-wrap items-center justify-between gap-3 border border-[#dce2dc] bg-white px-4 py-3 shadow-lg">{message ? <p role={message.ok ? "status" : "alert"} className={`text-[12px] ${message.ok ? "text-[#267147]" : "text-red-800"}`}>{message.text}</p> : <span className="text-[11px] text-[#778379]">Every save is attributed in the audit trail.</span>}<button disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"><Save size={14} />{busy ? "Saving…" : "Save navigation"}</button></div>
    </form>
  );
}