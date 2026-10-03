"use client";

import { useEffect, useState } from "react";
import { MessagesSquare, Send } from "lucide-react";
import { useAdminApi } from "./admin-client";

type Reply = { id: string; body: string; author: string; createdAt: string };
type Thread = { id: string; title: string; body: string; status: string; author: string; committee: { slug: string; name: string } | null; createdAt: string; replies: Reply[] };
type CommitteeOption = { slug: string; name: string };

const field = "w-full border border-[#d6ded6] bg-white px-3 py-2.5 text-[13px] focus:border-[#31774d] focus:outline-none";

export function PortalDiscussions() {
  const api = useAdminApi();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [committees, setCommittees] = useState<CommitteeOption[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [committeeSlug, setCommitteeSlug] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [discussionResponse, committeeResponse] = await Promise.all([
      fetch("/api/v1/portal/discussions", { cache: "no-store" }),
      fetch("/api/v1/portal/committees", { cache: "no-store" }),
    ]);
    const [discussionPayload, committeePayload] = await Promise.all([discussionResponse.json(), committeeResponse.json()]);
    if (!discussionResponse.ok) throw new Error(discussionPayload?.errors?.[0]?.message ?? "Discussions unavailable.");
    if (!committeeResponse.ok) throw new Error(committeePayload?.errors?.[0]?.message ?? "Committee list unavailable.");
    setThreads(Array.isArray(discussionPayload?.data) ? discussionPayload.data : []);
    setCommittees(Array.isArray(committeePayload?.data) ? committeePayload.data.map((item: CommitteeOption) => ({ slug: item.slug, name: item.name })) : []);
  }

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      try { await load(); }
      catch (failure) { if (active) setError(failure instanceof Error ? failure.message : "Discussions unavailable."); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  async function createThread(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("create"); setError("");
    try {
      await api("/api/v1/portal/discussions", "POST", { title, body, committeeSlug });
      setTitle(""); setBody(""); setCommitteeSlug(""); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not create discussion."); }
    finally { setBusy(""); }
  }

  async function sendReply(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault(); setBusy(id); setError("");
    try {
      await api(`/api/v1/portal/discussions/${encodeURIComponent(id)}/replies`, "POST", { body: reply[id] ?? "" });
      setReply((current) => ({ ...current, [id]: "" })); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not send reply."); }
    finally { setBusy(""); }
  }

  if (loading) return <p className="border border-[#dce2dc] bg-white px-5 py-10 text-center text-sm text-[#718077]">Loading discussions…</p>;
  return <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <section className="space-y-3" aria-label="Discussion threads">
      {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">{error}</p>}
      {!threads.length && <p className="border border-[#dce2dc] bg-white px-5 py-10 text-center text-sm text-[#718077]">No discussions have been started.</p>}
      {threads.map((thread) => <article key={thread.id} className="border border-[#dce2dc] bg-white">
        <div className="border-b border-[#e7ece7] px-5 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-[15px] font-semibold text-[#20372a]">{thread.title}</h2><span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#68806d]">{thread.committee?.name ?? "Forum discussion"}</span></div><p className="mt-1 text-[11px] text-[#859087]">{thread.author} · {new Date(thread.createdAt).toLocaleDateString()}</p><p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#4d5c52]">{thread.body}</p></div>
        {thread.replies.length > 0 && <ol className="divide-y divide-[#edf0ed]">{thread.replies.map((item) => <li key={item.id} className="px-5 py-3"><p className="text-[11px] font-semibold text-[#526358]">{item.author} <span className="font-normal text-[#909991]">· {new Date(item.createdAt).toLocaleDateString()}</span></p><p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-[#59675d]">{item.body}</p></li>)}</ol>}
        {thread.status === "Open" && <form onSubmit={(event) => sendReply(event, thread.id)} className="flex gap-2 border-t border-[#e7ece7] bg-[#fafbf9] p-3"><label className="sr-only" htmlFor={`reply-${thread.id}`}>Reply to {thread.title}</label><input id={`reply-${thread.id}`} required minLength={2} maxLength={5000} className={`${field} py-2`} value={reply[thread.id] ?? ""} onChange={(event) => setReply((current) => ({ ...current, [thread.id]: event.target.value }))} placeholder="Write a reply" /><button disabled={busy === thread.id} aria-label="Send reply" title="Send reply" className="grid h-10 w-10 shrink-0 place-items-center bg-[#174b31] text-white disabled:opacity-60"><Send size={15} /></button></form>}
      </article>)}
    </section>
    <form onSubmit={createThread} className="border border-[#dce2dc] bg-white">
      <div className="border-b border-[#e7ece7] px-5 py-4"><MessagesSquare size={17} className="text-[#4e7959]" /><h2 className="mt-2 text-sm font-bold text-[#20372a]">Start a discussion</h2></div>
      <div className="grid gap-3 p-5"><div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#617066]" htmlFor="thread-title">Title</label><input id="thread-title" required maxLength={255} className={field} value={title} onChange={(event) => setTitle(event.target.value)} /></div><div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#617066]" htmlFor="thread-committee">Committee</label><select id="thread-committee" className={field} value={committeeSlug} onChange={(event) => setCommitteeSlug(event.target.value)}><option value="">Forum-wide</option>{committees.map((committee) => <option key={committee.slug} value={committee.slug}>{committee.name}</option>)}</select></div><div><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#617066]" htmlFor="thread-body">Opening post</label><textarea id="thread-body" required minLength={5} maxLength={5000} rows={6} className={field} value={body} onChange={(event) => setBody(event.target.value)} /></div><button disabled={busy === "create"} className="bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60">{busy === "create" ? "Posting…" : "Post discussion"}</button></div>
    </form>
  </div>;
}