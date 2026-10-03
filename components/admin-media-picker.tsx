"use client";

import { useState } from "react";
import { ImagePlus, Search, X } from "lucide-react";

type MediaItem = { id: string; title: string; url: string; kind: string; category: string; altText: string | null; visibility: string };

export function AdminMediaPicker({ onSelect, kinds = ["IMAGE"], publicOnly = false }: { onSelect: (url: string, item: MediaItem) => void; kinds?: string[]; publicOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");

  async function show(nextOffset = 0, search = query) {
    setOpen(true); setLoading(true); setError("");
    try {
      const payloads = await Promise.all(kinds.map(async (kind) => {
        const response = await fetch(`/api/v1/media?${publicOnly ? "" : "visibility=all&"}kind=${encodeURIComponent(kind)}&q=${encodeURIComponent(search)}&offset=${nextOffset}`, { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.errors?.[0]?.message ?? "Media library unavailable.");
        return Array.isArray(payload?.data) ? payload.data as MediaItem[] : [];
      }));
      const nextItems = payloads.flat().filter(item => !publicOnly || item.visibility === "PUBLIC");
      setItems(previous => nextOffset ? [...new Map([...previous, ...nextItems].map(item => [item.id, item])).values()] : nextItems);
      setHasMore(payloads.some(rows => rows.length === 100));
      setOffset(nextOffset); setActiveQuery(search);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Media library unavailable."); }
    finally { setLoading(false); }
  }

  const visible = items.filter((item) => `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <button type="button" onClick={() => show()} className="inline-flex items-center gap-1.5 border border-[#cbd8cd] px-2.5 py-2 text-[11px] font-semibold text-[#28543a] hover:bg-[#f5f8f4]"><ImagePlus size={14} /> Choose media</button>
    {open && <div className="fixed inset-0 z-[90] grid place-items-center bg-[#12251b]/60 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="media-picker-title" className="flex max-h-[90vh] w-full max-w-4xl flex-col border border-[#dce2dc] bg-[#f8faf7] shadow-2xl">
        <div className="flex gap-3 px-5 pt-3 text-xs"><button type="button" disabled={loading} onClick={() => show(0, query)} className="border px-3 py-2">Search entire library</button>{hasMore && <button type="button" disabled={loading} onClick={() => show(offset + 100, activeQuery)} className="border px-3 py-2">Load more media</button>}</div>
        <div className="flex items-center justify-between border-b border-[#dce2dc] bg-white px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#56755f]">Asset library</p><h2 id="media-picker-title" className="mt-1 text-base font-semibold text-[#1c3526]">Choose media</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close media picker" className="grid h-9 w-9 place-items-center border border-[#dce2dc] text-[#617066]"><X size={16} /></button></div>
        <div className="border-b border-[#e4e9e4] bg-white px-5 py-3"><label className="flex max-w-md items-center gap-2 border border-[#d6ded6] px-3"><Search size={14} className="text-[#7d887f]" /><input aria-label="Search media assets" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or collection" className="w-full py-2 text-[12px] outline-none" /></label></div>
        {loading ? <p className="p-10 text-center text-sm text-[#768279]">Loading media…</p> : error ? <p role="alert" className="m-5 border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{error}</p> : !visible.length ? <p className="p-10 text-center text-sm text-[#768279]">No matching media assets.</p> : <div className="grid gap-px overflow-y-auto bg-[#e2e8e2] p-px sm:grid-cols-2 lg:grid-cols-3">{visible.map((item) => <button key={item.id} type="button" onClick={() => { onSelect(item.url, item); setOpen(false); }} className="group min-w-0 bg-white p-3 text-left hover:bg-[#f5f8f4]"><span className="block aspect-[16/10] overflow-hidden bg-[#edf1ed]">{item.kind === "IMAGE" ? <img src={item.url} alt={item.altText ?? ""} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-[11px] font-semibold uppercase text-[#6c796f]">{item.kind}</span>}</span><span className="mt-2 block truncate text-[12px] font-semibold text-[#26382d]">{item.title}</span><span className="mt-0.5 block text-[10px] text-[#7d887f]">{item.category} · {item.visibility}</span></button>)}</div>}
      </section>
    </div>}
  </>;
}
