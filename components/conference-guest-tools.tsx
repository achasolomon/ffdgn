"use client";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useAdminApi, useAdminRefresh } from "./admin-client";
import { CSV_HEADERS, GUEST_CATEGORIES, MAX_CSV_BYTES, type GuestInput } from "@/lib/conference/input";
import { ConferenceDrawer } from "./conference-drawer";
import { ConferenceStaffAccountForm } from "./conference-staff-account-form";

type Preview = { id: string; valid: boolean; rows: Array<{ row: number; guest: GuestInput; errors: string[] }> };
const control = "mt-2 w-full rounded-lg border border-[#d6ded6] bg-white px-3 py-3 text-base focus:outline-forest";
const button = "rounded-lg bg-forest-900 px-5 py-3 text-base font-semibold text-white disabled:opacity-50";

export function ConferenceGuestTools({ eventId, config, canManage, canGuests, canAssign, mode }: { eventId: string; config: { enabled: boolean; capacity: number | null; requireAcceptedRsvp: boolean } | null; canManage: boolean; canGuests: boolean; canAssign: boolean; mode: "upload" | "settings" }) {
  const api = useAdminApi(), refresh = useAdminRefresh();
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [csv, setCsv] = useState(""), [fileName, setFileName] = useState("");
  const base = `/api/v1/conference/events/${encodeURIComponent(eventId)}`;
  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage(null);
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "Operation failed."); }
    finally { setBusy(false); }
  }
  function template() {
    const blob = new Blob(["\uFEFF" + CSV_HEADERS.join(",") + "\r\n"], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = href; link.download = "invited-guests-template.csv"; link.click(); URL.revokeObjectURL(href);
  }
  async function readFile(file: File | undefined) {
    setPreview(null); setCsv(""); setFileName(""); setMessage(null);
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) { setMessage("CSV must be no larger than 512 KB."); return; }
    try { setCsv(await file.text()); setFileName(file.name); } catch { setMessage("Could not read this file."); }
  }
  return <div className={mode === "settings" ? "grid gap-3 sm:grid-cols-3" : "space-y-4"}>
    {message && <p role="status" className="rounded-lg border border-gold bg-white p-3 text-sm sm:col-span-3">{message}</p>}
    {mode === "settings" && canManage && <ConferenceDrawer label="Registration & entry settings" title="Event settings" busy={busy}><form className="space-y-4" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(async () => { await api(`${base}/config`, "PATCH", { enabled: data.get("enabled") === "on", capacity: data.get("capacity") ? Number(data.get("capacity")) : null, requireAcceptedRsvp: data.get("requireAcceptedRsvp") === "on" }); setMessage("Event settings saved."); refresh(); }); }}>
      
      <label className="flex items-center gap-3 rounded-lg bg-paper p-4 text-base"><input className="h-5 w-5" type="checkbox" name="enabled" defaultChecked={config?.enabled ?? false} disabled={busy} /> Open guest registration and gate check-in</label>
      <label className="flex items-start gap-3 text-sm"><input className="mt-1 h-5 w-5 shrink-0" type="checkbox" name="requireAcceptedRsvp" defaultChecked={config?.requireAcceptedRsvp ?? false} disabled={busy} /><span>Only admit invited guests who confirmed attendance<span className="mt-1 block text-gray-600">Leave this off if guests may enter before replying. Walk-in guests are confirmed when registered at the desk.</span></span></label>
      <label className="block text-sm">Attendee limit (blank for unlimited)<input className={control} name="capacity" type="number" min="1" max="100000" defaultValue={config?.capacity ?? ""} disabled={busy} /></label>
      <p className="text-sm text-gray-600">Your team registers guests here. Invited guests can reply to their email without creating an account.</p>
      <button className={button} disabled={busy}>Save settings</button>
      {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">{message}</p>}</form></ConferenceDrawer>}
    {mode === "upload" && canGuests && config?.enabled && <section className="space-y-4" aria-label="Invited guest upload">
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Import invited guests</h2><p className="mt-1 text-sm text-gray-500">Prepare your list, review it, then add the guests.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={template} className="min-h-11 rounded-lg border bg-white px-3 py-2 text-sm font-semibold">Download sample</button><ConferenceDrawer label="Add one invited guest" title="Add an invited guest" busy={busy}><form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await api(`${base}/guests`, "POST", Object.fromEntries(data.entries())); form.reset(); setMessage("Guest added. Open Find a guest to send their invitation or print their tag."); refresh(); }); }}>
        
        {[ ["fullName", "Full name", "text", 192], ["email", "Email", "email", 255], ["phone", "Phone", "tel", 32], ["organization", "Organization", "text", 192], ["jobTitle", "Job title", "text", 192], ["invitationSource", "Existing invitation reference (optional)", "text", 255] ].map(([name, label, type, max]) => <label key={name} className="block text-sm">{label}<input className={control} name={String(name)} type={String(type)} maxLength={Number(max)} required={name === "fullName" || name === "email"} disabled={busy} /></label>)}
        <label className="block text-sm">Category<select className={control} name="category" defaultValue="General" disabled={busy}>{GUEST_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
        <button className={button} disabled={busy}>Add guest</button>
      {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">{message}</p>}</form></ConferenceDrawer></div></header>
      <ol className="grid grid-cols-3 gap-2 rounded-xl border bg-white p-3" aria-label="Upload progress">{["Prepare CSV", "Review guests", "Add to event"].map((label, index) => <li key={label} className="flex items-center gap-2 text-xs sm:text-sm"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-semibold ${index === 0 || (index === 1 && !!preview) ? "bg-forest-900 text-white" : "bg-gray-100 text-gray-500"}`}>{index + 1}</span><span>{label}</span></li>)}</ol>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]"><section className="rounded-xl border bg-white p-4 sm:p-5"><label className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-forest-200 bg-forest-50/40 px-4 py-5 text-center"><UploadCloud aria-hidden="true" className="mb-3 h-8 w-8 text-forest-700" /><span className="break-all text-base font-semibold">{fileName || "Choose your guest list"}</span><span className="mt-1 text-xs text-gray-500">CSV file · up to 500 guests · maximum 512 KB</span><input aria-label="Guest list CSV" type="file" accept=".csv,text/csv" className="mt-4 block w-full max-w-xs text-xs" disabled={busy} onChange={event => void readFile(event.target.files?.[0])} /></label><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-gray-500">{csv ? "File selected. Check it before importing." : "Use the sample column headings."}</p><button type="button" className={button} disabled={busy || !csv} onClick={() => void run(async () => { setPreview(null); const result = await api(`${base}/imports`, "POST", { csv }); setPreview(result.data as unknown as Preview); })}>{busy ? "Checking…" : "Check guest list"}</button></div></section><aside className="hidden rounded-xl border bg-white p-4 lg:block"><FileSpreadsheet aria-hidden="true" className="mb-3 h-6 w-6 text-forest-700" /><h3 className="text-sm font-semibold">Prepare your file</h3><ul className="mt-3 space-y-2 text-xs leading-5 text-gray-600"><li>One guest per row, with their name and email.</li><li>Use a separate email for each guest.</li><li>Save as CSV from Excel or your spreadsheet.</li></ul><p className="mt-4 border-t pt-3 text-xs leading-5 text-gray-500">Importing adds the list only. Send invitations from Find a guest after import.</p></aside><div className="lg:hidden"><ConferenceDrawer label="File requirements" title="Prepare your guest list"><FileSpreadsheet aria-hidden="true" className="mb-3 h-6 w-6 text-forest-700" /><h3 className="text-sm font-semibold">Prepare your file</h3><ul className="mt-3 space-y-2 text-xs leading-5 text-gray-600"><li>One guest per row, with their name and email.</li><li>Use a separate email for each guest.</li><li>Save as CSV from Excel or your spreadsheet.</li></ul><p className="mt-4 border-t pt-3 text-xs leading-5 text-gray-500">Importing adds the list only. Send invitations from Find a guest after import.</p></ConferenceDrawer></div></div>
      {preview && <section className="overflow-hidden rounded-xl border bg-white" aria-label="Guest list review"><header className={`flex flex-wrap items-center justify-between gap-3 border-b p-4 ${preview.valid ? "bg-green-50" : "bg-amber-50"}`}><div><h3 className="font-semibold">{preview.valid ? "Guest list ready" : "Review needed"}</h3><p className="mt-1 text-xs">{preview.rows.length} guests · {preview.rows.filter(row => row.errors.length > 0).length} rows need attention</p></div><button type="button" className={button} disabled={busy || !preview.valid} onClick={() => void run(async () => { const result = await api(`${base}/imports/${preview.id}/commit`, "POST"); setMessage(`${result.data.imported} guests added. Open Find a guest to send their invitations.`); setPreview(null); setCsv(""); setFileName(""); refresh(); })}>{busy ? "Adding guests…" : "Add these guests"}</button></header><div className="max-h-80 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-gray-50"><tr><th className="p-3">Row</th><th className="p-3">Guest</th><th className="hidden p-3 sm:table-cell">Category</th><th className="p-3">Review</th></tr></thead><tbody>{preview.rows.map(row => <tr key={row.row} className="border-t"><td className="p-3">{row.row}</td><td className="break-words p-3"><strong>{row.guest.fullName}</strong><p className="mt-1 text-gray-500">{row.guest.email}</p></td><td className="hidden p-3 sm:table-cell">{row.guest.category}</td><td className="p-3">{row.errors.length ? row.errors.join(" ") : "Ready"}</td></tr>)}</tbody></table></div>{!preview.valid && <p className="border-t p-3 text-xs text-amber-900">Correct the marked rows in your file, choose it again and recheck.</p>}</section>}
    </section>}
    {mode === "settings" && canAssign && <ConferenceDrawer label="Invite a staff member" title="Invite guest-desk staff"><ConferenceStaffAccountForm eventId={eventId} /></ConferenceDrawer>}
    {mode === "settings" && canAssign && <ConferenceDrawer label="Assign or change staff access" title="Assign existing staff" busy={busy}><form className="mt-5 space-y-3" onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void run(async () => { await api(`${base}/staff`, "POST", { email: data.get("email"), role: data.get("role") || null }); form.reset(); setMessage("Event team updated."); refresh(); }); }}>
      
      <label className="block text-sm">Staff account email<input className={control} name="email" type="email" required disabled={busy} /></label>
      <label className="block text-sm">Event role<select className={control} name="role" disabled={busy}><option value="Manager">Event manager</option><option value="RegistrationOfficer">Registration, tags and gate check-in</option><option value="GateOfficer">Gate check-in and tags only</option><option value="ReportingOfficer">View attendance only</option><option value="">Remove access to this event</option></select></label>
      <p className="text-sm text-gray-600">Existing accounts keep their current access to other console areas. Create a new guest-desk staff account above when access should be limited to the guest desk.</p>
      <button className={button} disabled={busy}>Save team member</button>
    {message && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm">{message}</p>}</form></ConferenceDrawer>}
  </div>;
}
