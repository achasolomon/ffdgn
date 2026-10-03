import Link from "next/link";
import { ContactMessageAction } from "@/components/admin-contact-message-action";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { asRoute } from "@/lib/routes";

export default async function AdminCommunicationsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const auth = await getAuth();
  if (!auth || !hasPermission(auth.user.role, "contact.manage")) return <div className="mx-auto max-w-5xl px-6 py-10"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Communications</p><h1 className="mt-2 text-2xl font-semibold text-[#1c3526]">Access unavailable</h1><p className="mt-2 text-sm text-[#69776d]">The Secretariat inbox requires the communications capability.</p><Link href="/admin" className="mt-5 inline-flex text-sm font-semibold text-[#23613f]">Back to overview</Link></div>;
  const params = await searchParams;
  const status = params.status === "handled" || params.status === "all" ? params.status : "open";
  const q = params.q?.trim() ?? "";
  const live = await dbReady();
  const where = {
    ...(status === "open" ? { handled: false } : status === "handled" ? { handled: true } : {}),
    ...(q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }, { subject: { contains: q } }] } : {}),
  };
  const [messages, openCount] = live ? await Promise.all([
    db.contactMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 }),
    db.contactMessage.count({ where: { handled: false } }),
  ]) : [[], 0];
  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Communications / Inbox</p><h1 className="mt-1.5 text-[26px] font-semibold text-[#1c3526]">Secretariat inbox</h1><p className="mt-1 text-[13px] text-[#738077]">Website enquiries and newsletter requests.</p></div><p className="border border-[#dce2dc] bg-white px-3 py-2 text-[11px] font-medium text-[#68756b]">{openCount} open</p></div>
      {!live && <p role="alert" className="mb-5 border border-[#e4d3a8] bg-[#fffaf0] px-4 py-3 text-[13px] text-[#755b23]">MySQL is unavailable. Connect the database to open enquiries.</p>}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[#dce2dc] bg-white p-3">
        <nav aria-label="Inbox status" className="flex gap-1">{([ ["open", "Open"], ["handled", "Handled"], ["all", "All"] ] as const).map(([value, title]) => <Link key={value} href={asRoute(`/admin/communications?status=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`)} aria-current={status === value ? "page" : undefined} className={`px-3 py-2 text-[12px] font-semibold ${status === value ? "bg-[#174b31] text-white" : "text-[#617066] hover:bg-[#f2f5f1]"}`}>{title}</Link>)}</nav>
        <form role="search" className="flex gap-2"><label htmlFor="inbox-query" className="sr-only">Search messages</label><input id="inbox-query" name="q" defaultValue={q} placeholder="Search sender or subject" className="border border-[#d6ded6] px-3 py-2 text-[12px]" /><input type="hidden" name="status" value={status} /><button className="bg-[#174b31] px-3 py-2 text-[12px] font-semibold text-white">Search</button></form>
      </div>
      <section className="border border-[#dce2dc] bg-white" aria-label="Messages">
        {!messages.length ? <p className="px-6 py-14 text-center text-sm text-[#79847b]">No messages in this view.</p> : <div className="divide-y divide-[#e7ece7]">{messages.map((message) => <article key={message.id} className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1fr)_150px] md:px-6">
          <div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="text-[14px] font-semibold text-[#24382b]">{message.subject}</h2><span className="text-[11px] text-[#89938b]">{message.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span></div><p className="mt-1 text-[12px] text-[#69776d]">{message.name} · <a href={`mailto:${message.email}`} className="text-[#28623e] hover:underline">{message.email}</a></p><p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#445249]">{message.message}</p><p className="mt-2 font-mono text-[10px] text-[#9aa39c]">{message.subject === "Newsletter subscription" ? "NEWSLETTER" : "ENQUIRY"}</p></div>
          <div className="flex items-start justify-between gap-3 md:flex-col md:items-end"><span className={`text-[10px] font-semibold uppercase tracking-[0.1em] ${message.handled ? "text-[#89938b]" : "text-[#a16c12]"}`}>{message.handled ? "Handled" : "Open"}</span><ContactMessageAction id={message.id} handled={message.handled} /></div>
        </article>)}</div>}
      </section>
    </div>
  );
}