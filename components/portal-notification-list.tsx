"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { useAdminApi } from "./admin-client";
import { asRoute } from "@/lib/routes";

type NotificationItem = { id: string; title: string; body: string; href: string | null; read: boolean; createdAt: string };

export function PortalNotificationList() {
  const api = useAdminApi();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/v1/portal/notifications", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.errors?.[0]?.message ?? "Notifications unavailable.");
    setItems(Array.isArray(payload?.data) ? payload.data : []);
  }

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      try { await load(); }
      catch (failure) { if (active) setError(failure instanceof Error ? failure.message : "Notifications unavailable."); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  async function toggle(item: NotificationItem) {
    setError("");
    try {
      const { data } = await api(`/api/v1/portal/notifications/${encodeURIComponent(item.id)}`, "PATCH", { read: !item.read });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, read: data.read === true } : entry));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update notification."); }
  }

  if (loading) return <p className="border border-[#dce2dc] bg-white px-5 py-10 text-center text-sm text-[#718077]">Loading notifications…</p>;
  return <section className="border border-[#dce2dc] bg-white" aria-label="Notifications">
    <div className="flex items-center justify-between border-b border-[#e7ece7] px-5 py-4"><div className="flex items-center gap-2"><Bell size={16} className="text-[#4e7959]" /><h2 className="text-sm font-bold text-[#20372a]">Notifications</h2></div><span className="text-[11px] text-[#78847b]">{items.filter((item) => !item.read).length} unread</span></div>
    {error && <p role="alert" className="m-4 border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">{error}</p>}
    {!items.length ? <p className="px-5 py-12 text-center text-sm text-[#718077]">You are all caught up.</p> : <ul className="divide-y divide-[#e7ece7]">{items.map((item) => <li key={item.id} className={`flex items-start gap-4 px-5 py-4 ${item.read ? "bg-white" : "bg-[#f5f9f5]"}`}><span className={`mt-1.5 h-2 w-2 shrink-0 ${item.read ? "bg-[#c4cec5]" : "bg-[#2c8a51]"}`} /><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-[#283b2e]">{item.title}</p><p className="mt-1 text-[12px] leading-relaxed text-[#66746a]">{item.body}</p><p className="mt-1 text-[10px] text-[#8b958d]">{new Date(item.createdAt).toLocaleString()}</p>{item.href && <Link href={asRoute(item.href)} className="mt-2 inline-block text-[11px] font-semibold text-[#28623e]">Open related item →</Link>}</div><button type="button" onClick={() => toggle(item)} aria-label={item.read ? "Mark unread" : "Mark read"} title={item.read ? "Mark unread" : "Mark read"} className="grid h-8 w-8 shrink-0 place-items-center border border-[#dce2dc] text-[#536258] hover:bg-white">{item.read ? <span className="h-1.5 w-1.5 bg-[#95a298]" /> : <Check size={14} />}</button></li>)}</ul>}
  </section>;
}