"use client";

import { useState } from "react";
import { Check, FilePlus2, Pencil, Save } from "lucide-react";
import { useAdminApi, useAdminRefresh } from "./admin-client";
import { AdminMediaPicker } from "./admin-media-picker";

type Article = {
  slug: string; title: string; category: string; date: string; location: string;
  excerpt: string; body: string; imageUrl: string; relatedEvent: string;
  relatedDocs: string[]; status: "Draft" | "Published" | "Archived"; official: boolean;
};

const CATEGORIES = ["News", "Press Release", "Statement", "Media Coverage", "Speech"];
const EMPTY: Article = {
  slug: "", title: "", category: "News", date: new Date().toISOString().slice(0, 10),
  location: "Abuja, Nigeria", excerpt: "", body: "", imageUrl: "", relatedEvent: "",
  relatedDocs: [], status: "Draft", official: true,
};

const control = "w-full border border-[#d6ded6] bg-white px-3 py-2.5 text-[13px] text-[#23352a] placeholder:text-[#97a199] focus:border-[#31774d] focus:outline-none";
const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.09em] text-[#617066]";

export function AdminNewsManager({ articles, eventSlugs, documentSlugs }: {
  articles: Article[]; eventSlugs: string[]; documentSlugs: string[];
}) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [form, setForm] = useState<Article>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  function edit(article: Article) {
    setForm(article);
    setEditing(true);
    setFeedback(null);
    document.getElementById("news-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const body = {
        ...form,
        relatedDocs: form.relatedDocs.join("\n").split(/[\n,]+/).map((value) => value.trim()).filter(Boolean),
      };
      await api(editing ? `/api/v1/cms/news/${encodeURIComponent(form.slug)}` : "/api/v1/cms/news", editing ? "PATCH" : "POST", body);
      setFeedback({ ok: true, text: editing ? "Story updated." : "Story added." });
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
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="min-w-0 border border-[#dce2dc] bg-white" aria-labelledby="news-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e9e4] px-5 py-4">
          <div>
            <h2 id="news-list-title" className="text-sm font-bold text-[#20372a]">Stories</h2>
            <p className="mt-0.5 text-[12px] text-[#79847b]">{articles.length} records · newest date first</p>
          </div>
          <button type="button" onClick={() => { setForm(EMPTY); setEditing(false); setFeedback(null); }} className="inline-flex items-center gap-2 bg-[#174b31] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#23613f]">
            <FilePlus2 size={15} /> New story
          </button>
        </div>
        {articles.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead className="bg-[#f6f8f5] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#778379]">
                <tr><th className="px-5 py-3">Story</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date</th><th className="px-4 py-3" /></tr>
              </thead>
              <tbody>
                {articles.map((article) => (
                  <tr key={article.slug} className="border-t border-[#edf0ed] align-middle hover:bg-[#fafbf9]">
                    <td className="max-w-[340px] px-5 py-3.5">
                      <span className="block truncate font-semibold text-[#26382d]">{article.title}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-[#8a948c]">/{article.slug}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[#657168]">{article.category}</td>
                    <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${article.status === "Published" ? "text-[#277449]" : article.status === "Draft" ? "text-[#996c18]" : "text-[#79847b]"}`}><span className={`h-1.5 w-1.5 rounded-full ${article.status === "Published" ? "bg-[#3c9b63]" : article.status === "Draft" ? "bg-[#d2a33b]" : "bg-[#98a199]"}`} />{article.status}</span></td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-[12px] text-[#738077]">{article.date}</td>
                    <td className="px-4 py-3.5 text-right"><button type="button" onClick={() => edit(article)} aria-label={`Edit ${article.title}`} title="Edit story" className="inline-grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358] hover:border-[#8ca996] hover:text-[#174b31]"><Pencil size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-14 text-center"><p className="text-sm font-semibold text-[#35463a]">No stories yet</p><p className="mt-1 text-[12px] text-[#79847b]">Start a draft and publish it when it is ready.</p></div>
        )}
      </section>

      <form id="news-editor" onSubmit={submit} className="scroll-mt-5 border border-[#dce2dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7859]">Editorial desk</p><h2 className="mt-0.5 text-sm font-bold text-[#20372a]">{editing ? "Edit story" : "New story"}</h2></div>
          {editing && <button type="button" onClick={() => { setForm(EMPTY); setEditing(false); setFeedback(null); }} className="text-[11px] font-semibold text-[#69766c] hover:text-[#174b31]">Cancel edit</button>}
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="news-slug">URL slug</label><input id="news-slug" required disabled={editing} className={`${control} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="forum-announcement" /></div>
            <div><label className={label} htmlFor="news-status">Publication</label><select id="news-status" className={control} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Article["status"] })}><option>Draft</option><option>Published</option><option>Archived</option></select></div>
          </div>
          <div><label className={label} htmlFor="news-title">Headline</label><input id="news-title" required maxLength={255} className={control} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={label} htmlFor="news-category">Category</label><select id="news-category" className={control} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></div>
            <div><label className={label} htmlFor="news-date">Publication date</label><input id="news-date" type="date" required className={control} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div><label className={label} htmlFor="news-location">Location</label><input id="news-location" required className={control} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          </div>
          <div><label className={label} htmlFor="news-excerpt">Summary</label><textarea id="news-excerpt" required rows={3} className={control} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
          <div><label className={label} htmlFor="news-body">Article body</label><textarea id="news-body" required rows={8} className={control} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Separate paragraphs with a blank line." /></div>
          <div><label className={label} htmlFor="news-image">Image</label><div className="flex flex-wrap gap-2"><input id="news-image" className={`${control} min-w-[220px] flex-1 font-mono`} value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="/media/news/story.jpg" /><AdminMediaPicker onSelect={(url) => setForm({ ...form, imageUrl: url })} /></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="news-event">Related event</label><select id="news-event" className={control} value={form.relatedEvent} onChange={(e) => setForm({ ...form, relatedEvent: e.target.value })}><option value="">No event</option>{eventSlugs.map((slug) => <option key={slug} value={slug}>{slug}</option>)}</select></div>
            <div><label className={label} htmlFor="news-docs">Related document slugs</label><textarea id="news-docs" rows={2} className={control} value={form.relatedDocs.join("\n")} onChange={(e) => setForm({ ...form, relatedDocs: e.target.value.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean) })} placeholder={documentSlugs.slice(0, 2).join("\n")} /></div>
          </div>
          <label className="flex items-center gap-2 text-[12px] font-medium text-[#59675d]"><input type="checkbox" checked={form.official} onChange={(e) => setForm({ ...form, official: e.target.checked })} className="accent-[#1b6840]" /> Official Forum communication</label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9e4] bg-[#f8faf7] px-5 py-3.5">
          {feedback ? <p role={feedback.ok ? "status" : "alert"} className={`text-[12px] ${feedback.ok ? "text-[#267147]" : "text-red-800"}`}>{feedback.ok && <Check size={13} className="mr-1 inline" />}{feedback.text}</p> : <span className="text-[11px] text-[#778379]">Changes are recorded in the audit trail.</span>}
          <button type="submit" disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white hover:bg-[#23613f] disabled:opacity-60"><Save size={14} />{busy ? "Saving…" : editing ? "Save changes" : "Create story"}</button>
        </div>
      </form>
    </div>
  );
}