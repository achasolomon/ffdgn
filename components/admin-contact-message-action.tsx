"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useAdminApi, useAdminRefresh } from "./admin-client";

export function ContactMessageAction({ id, handled }: { id: string; handled: boolean }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    setBusy(true); setError("");
    try { await api(`/api/v1/contact/messages/${id}`, "PATCH", { handled: !handled }); refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Update failed."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-col items-end gap-1"><button type="button" onClick={toggle} disabled={busy} className="inline-flex items-center gap-1.5 border border-[#d3ded4] px-2.5 py-1.5 text-[11px] font-semibold text-[#28543a] hover:bg-[#f5f8f4] disabled:opacity-60">{handled ? <RotateCcw size={13} /> : <Check size={13} />}{busy ? "Saving…" : handled ? "Reopen" : "Mark handled"}</button>{error && <span role="alert" className="text-[10px] text-red-800">{error}</span>}</div>;
}