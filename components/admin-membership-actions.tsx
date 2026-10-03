"use client";
import { useState } from "react";
import { FilePlus2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useAdminApi, useAdminRefresh, feedbackClass } from "./admin-client";

const STATUSES = ["Active", "Associate", "Honorary", "Pending"] as const;
const VISIBILITIES = [
  ["PUBLIC", "Public directory"],
  ["MEMBERS_ONLY", "Members only"],
  ["COMMITTEE_ONLY", "Committee only"],
  ["SECRETARIAT_ONLY", "Secretariat only"],
  ["PRIVATE", "Private"],
] as const;

export interface EditableMember {
  slug: string;
  fullName: string;
  /** Office held, e.g. "Governor, Central Bank". Not an organisation. */
  title: string;
  status: string;
  visibility: string;
}

/**
 * Member status and directory visibility.
 *
 * These are separate fields on purpose: a member can be an active participant
 * who is deliberately not listed publicly, and conflating "is a member" with
 * "appears in the directory" makes it impossible to record a private
 * participant. Both changes are audit-logged server-side with previous → new.
 */
export function MemberRowActions({ member }: { member: EditableMember }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ status: member.status, visibility: member.visibility });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api(`/api/v1/members/${encodeURIComponent(member.slug)}`, "PATCH", form);
      const changes = Array.isArray(data.changes) ? (data.changes as string[]) : [];
      setMsg({
        ok: true,
        text: changes.length > 0 ? changes.join("; ") : "No change — values already matched.",
      });
      setEditing(false);
      refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full border hairline bg-white px-2.5 py-1.5 text-[13px]";

  return (
    <div>
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        aria-expanded={editing}
        className="text-[13px] font-semibold text-primary link-underline"
      >
        {editing ? "Cancel" : "Edit"}
      </button>

      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`mt-2 max-w-sm border px-3 py-1.5 text-[12px] ${feedbackClass(msg.ok)}`}
        >
          {msg.text}
        </p>
      )}

      {editing && (
        <div className="mt-3 grid max-w-lg gap-3 border hairline bg-paper p-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`st-${member.slug}`} className="text-[12px] font-semibold">Membership status</label>
            <select
              id={`st-${member.slug}`}
              className={`${field} bg-white`}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`mv-${member.slug}`} className="text-[12px] font-semibold">Directory visibility</label>
            <select
              id={`mv-${member.slug}`}
              className={`${field} bg-white`}
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
            >
              {VISIBILITIES.map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="bg-primary px-4 py-2 text-[13px] font-bold text-white hover:bg-forest-700 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type ProfileService = { office: string; state: string; startYear: number; endYear: number };
export type EditableMemberProfile = EditableMember & {
  state: string; region: string; category: string; leadershipRole: string;
  photoUrl: string; bio: string; service: ProfileService[];
};

const REGIONS = ["North-Central", "North-East", "North-West", "South-East", "South-South", "South-West"] as const;

export function MemberProfileEditor({ member }: { member: EditableMemberProfile }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(member);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const field = "w-full border border-[#d6ded6] bg-white px-3 py-2 text-[13px] focus:border-[#31774d] focus:outline-none";
  const label = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#617066]";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(null);
    try {
      const { data } = await api(`/api/v1/members/${encodeURIComponent(member.slug)}`, "PATCH", { ...form });
      const changes = data.changes;
      const changed = Array.isArray(changes) ? changes as string[] : [];
      setMessage({ ok: true, text: changed.length ? changed.join("; ") : "No changes." });
      setOpen(false); refresh();
    } catch (error) { setMessage({ ok: false, text: error instanceof Error ? error.message : "Save failed." }); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={() => { setForm(member); setOpen(true); setMessage(null); }} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#23583a] hover:text-[#123e2a]" title={`Edit ${member.fullName} profile`}><Pencil size={13} /> Profile</button>
      {message && <p role={message.ok ? "status" : "alert"} className={`mt-1 text-[11px] ${message.ok ? "text-[#267147]" : "text-red-800"}`}>{message.text}</p>}
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-[#12251b]/55 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <form role="dialog" aria-modal="true" aria-labelledby={`profile-title-${member.slug}`} onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto border border-[#dce2dc] bg-[#f8faf7] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce2dc] bg-white px-5 py-4 sm:px-7">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Member record / {member.slug}</p><h2 id={`profile-title-${member.slug}`} className="mt-1 text-lg font-semibold text-[#1c3526]">{member.fullName}</h2></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close profile editor" title="Close" className="grid h-9 w-9 place-items-center border border-[#dce2dc] text-[#617066] hover:bg-[#f4f6f3]"><X size={16} /></button>
            </div>
            <div className="grid gap-5 p-5 sm:p-7">
              <section className="grid gap-4 sm:grid-cols-2" aria-label="Profile details">
                <div><label className={label} htmlFor={`full-name-${member.slug}`}>Full name</label><input id={`full-name-${member.slug}`} required className={field} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
                <div><label className={label} htmlFor={`member-title-${member.slug}`}>Office / title</label><input id={`member-title-${member.slug}`} required className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><label className={label} htmlFor={`member-state-${member.slug}`}>State</label><input id={`member-state-${member.slug}`} required className={field} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div><label className={label} htmlFor={`member-region-${member.slug}`}>Geopolitical region</label><select id={`member-region-${member.slug}`} className={field} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>{REGIONS.map((region) => <option key={region}>{region}</option>)}</select></div>
                <div><label className={label} htmlFor={`member-category-${member.slug}`}>Category</label><select id={`member-category-${member.slug}`} className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Former</option><option>Serving</option><option>Secretariat</option></select></div>
                <div><label className={label} htmlFor={`member-role-${member.slug}`}>Leadership role</label><input id={`member-role-${member.slug}`} className={field} value={form.leadershipRole} onChange={(e) => setForm({ ...form, leadershipRole: e.target.value })} /></div>
                <div><label className={label} htmlFor={`member-status-${member.slug}`}>Membership status</label><select id={`member-status-${member.slug}`} className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
                <div><label className={label} htmlFor={`member-visibility-${member.slug}`}>Directory visibility</label><select id={`member-visibility-${member.slug}`} className={field} value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>{VISIBILITIES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>
                <div className="sm:col-span-2"><label className={label} htmlFor={`member-photo-${member.slug}`}>Portrait path</label><input id={`member-photo-${member.slug}`} className={`${field} font-mono`} value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="/media/portraits/member.jpg" /></div>
                <div className="sm:col-span-2"><label className={label} htmlFor={`member-bio-${member.slug}`}>Biography</label><textarea id={`member-bio-${member.slug}`} rows={5} className={field} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
              </section>
              <section aria-label="Service history" className="border border-[#dce2dc] bg-white">
                <div className="flex items-center justify-between border-b border-[#e4e9e4] px-4 py-3"><div><h3 className="text-[13px] font-semibold text-[#2a3e30]">Service history</h3><p className="text-[11px] text-[#7d887f]">Public office and service periods</p></div><button type="button" onClick={() => setForm({ ...form, service: [...form.service, { office: "", state: form.state, startYear: new Date().getFullYear(), endYear: new Date().getFullYear() }] })} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#23583a]"><Plus size={14} /> Add service</button></div>
                <div className="divide-y divide-[#edf0ed]">
                  {form.service.map((service, index) => <div key={index} className="grid gap-3 p-4 sm:grid-cols-[1.4fr_1fr_95px_95px_32px] sm:items-end">
                    <div><label className={label} htmlFor={`service-office-${member.slug}-${index}`}>Office</label><input id={`service-office-${member.slug}-${index}`} className={field} value={service.office} onChange={(e) => setForm({ ...form, service: form.service.map((item, i) => i === index ? { ...item, office: e.target.value } : item) })} /></div>
                    <div><label className={label} htmlFor={`service-state-${member.slug}-${index}`}>State / organisation</label><input id={`service-state-${member.slug}-${index}`} className={field} value={service.state} onChange={(e) => setForm({ ...form, service: form.service.map((item, i) => i === index ? { ...item, state: e.target.value } : item) })} /></div>
                    <div><label className={label} htmlFor={`service-start-${member.slug}-${index}`}>From</label><input id={`service-start-${member.slug}-${index}`} type="number" className={field} value={service.startYear} onChange={(e) => setForm({ ...form, service: form.service.map((item, i) => i === index ? { ...item, startYear: Number(e.target.value) } : item) })} /></div>
                    <div><label className={label} htmlFor={`service-end-${member.slug}-${index}`}>To</label><input id={`service-end-${member.slug}-${index}`} type="number" className={field} value={service.endYear} onChange={(e) => setForm({ ...form, service: form.service.map((item, i) => i === index ? { ...item, endYear: Number(e.target.value) } : item) })} /></div>
                    <button type="button" aria-label="Remove service record" title="Remove service record" onClick={() => setForm({ ...form, service: form.service.filter((_, i) => i !== index) })} className="grid h-9 w-9 place-items-center border border-[#e6d1d1] text-[#9b4242] hover:bg-[#fff5f5]"><Trash2 size={14} /></button>
                  </div>)}
                  {!form.service.length && <p className="px-4 py-6 text-center text-[12px] text-[#7d887f]">No service records.</p>}
                </div>
              </section>
            </div>
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#dce2dc] bg-white px-5 py-4 sm:px-7">
              <span className="text-[11px] text-[#778379]">All profile edits are audit logged.</span>
              <div className="flex items-center gap-2"><button type="button" onClick={() => setOpen(false)} className="border border-[#dce2dc] px-3.5 py-2 text-[12px] font-semibold text-[#536258]">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"><Save size={14} />{busy ? "Saving…" : "Save profile"}</button></div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export function NewMemberButton() {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    slug: "", fullName: "", title: "", state: "", region: "North-Central",
    category: "Former", status: "Pending", visibility: "SECRETARIAT_ONLY",
    leadershipRole: "", photoUrl: "", bio: "", serviceText: "",
  });
  const field = "w-full border border-[#d6ded6] bg-white px-3 py-2 text-[13px] focus:border-[#31774d] focus:outline-none";
  const label = "mb-1 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#617066]";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const service = form.serviceText.split("\n").map((line) => {
      const [office = "", state = "", startYear = "", endYear = ""] = line.split("|").map((value) => value.trim());
      return { office, state, startYear: Number(startYear), endYear: Number(endYear) };
    }).filter((item) => item.office && item.state);
    try {
      await api("/api/v1/members", "POST", {
        slug: form.slug,
        fullName: form.fullName,
        title: form.title,
        state: form.state,
        region: form.region,
        category: form.category,
        status: form.status,
        visibility: form.visibility,
        leadershipRole: form.leadershipRole,
        photoUrl: form.photoUrl,
        bio: form.bio,
        service,
      });
      setMessage("Member record created.");
      setOpen(false);
      setForm({ ...form, slug: "", fullName: "", title: "", state: "", leadershipRole: "", photoUrl: "", bio: "", serviceText: "" });
      refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Creation failed."); }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" onClick={() => { setOpen(true); setMessage(""); }} className="inline-flex items-center gap-2 bg-[#174b31] px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-[#23613f]"><FilePlus2 size={15} /> Add member</button>
    {message && !open && <p role="status" className="mt-2 text-[12px] text-[#267147]">{message}</p>}
    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-[#12251b]/55 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <form role="dialog" aria-modal="true" aria-labelledby="new-member-title" onSubmit={submit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto border border-[#dce2dc] bg-[#f8faf7] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#dce2dc] bg-white px-5 py-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Member directory</p><h2 id="new-member-title" className="mt-1 text-lg font-semibold text-[#1c3526]">New member record</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close member form" className="grid h-9 w-9 place-items-center border border-[#dce2dc] text-[#617066]"><X size={16} /></button></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
          <div><label className={label} htmlFor="new-member-slug">URL slug</label><input id="new-member-slug" required className={`${field} font-mono`} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><label className={label} htmlFor="new-member-name">Full name</label><input id="new-member-name" required className={field} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
          <div><label className={label} htmlFor="new-member-title">Office / title</label><input id="new-member-title" required className={field} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className={label} htmlFor="new-member-state">State</label><input id="new-member-state" required className={field} value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          <div><label className={label} htmlFor="new-member-region">Region</label><select id="new-member-region" className={field} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>{REGIONS.map((region) => <option key={region}>{region}</option>)}</select></div>
          <div><label className={label} htmlFor="new-member-category">Category</label><select id="new-member-category" className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option>Former</option><option>Serving</option><option>Secretariat</option></select></div>
          <div><label className={label} htmlFor="new-member-status">Status</label><select id="new-member-status" className={field} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
          <div><label className={label} htmlFor="new-member-visibility">Directory visibility</label><select id="new-member-visibility" className={field} value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>{VISIBILITIES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></div>
          <div><label className={label} htmlFor="new-member-role">Leadership role</label><input id="new-member-role" className={field} value={form.leadershipRole} onChange={(e) => setForm({ ...form, leadershipRole: e.target.value })} /></div>
          <div><label className={label} htmlFor="new-member-photo">Portrait path</label><input id="new-member-photo" className={`${field} font-mono`} value={form.photoUrl} onChange={(e) => setForm({ ...form, photoUrl: e.target.value })} placeholder="/media/portraits/member.jpg" /></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="new-member-bio">Biography</label><textarea id="new-member-bio" rows={4} className={field} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></div>
          <div className="sm:col-span-2"><label className={label} htmlFor="new-member-service">Service history</label><textarea id="new-member-service" rows={3} className={`${field} font-mono text-[12px]`} value={form.serviceText} onChange={(e) => setForm({ ...form, serviceText: e.target.value })} placeholder="Deputy Governor | Kano | 2015 | 2019" /></div>
        </div>
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-[#dce2dc] bg-white px-5 py-4 sm:px-7"><span className="text-[11px] text-[#778379]">New records are saved to the member directory.</span><div className="flex items-center gap-2"><button type="button" onClick={() => setOpen(false)} className="border border-[#dce2dc] px-3.5 py-2 text-[12px] font-semibold text-[#536258]">Cancel</button><button disabled={busy} className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"><Save size={14} />{busy ? "Creating…" : "Create member"}</button></div></div>
      </form>
    </div>}
  </>;
}

export interface EditableAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  assignable: readonly string[];
  /** Cannot deactivate or re-role yourself; the API refuses it. */
  isSelf: boolean;
  /** Cannot demote or deactivate the last active super admin; the API refuses it. */
  isLastSuperAdmin: boolean;
}

/**
 * Account administration.
 *
 * Deactivation is revocation, not suspension: the JWT callback rejects tokens
 * belonging to an inactive account, so this ends every live session for that
 * person immediately. It is therefore labelled as such rather than as "disable
 * login", which reads like a softer action than it is.
 */
export function AccountRowActions({ account }: { account: EditableAccount }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const locked = account.isSelf || (account.isLastSuperAdmin && account.role === "super_admin");

  async function patch(body: Record<string, unknown>, key: string) {
    setBusy(key);
    setMsg(null);
    try {
      const { data } = await api(`/api/v1/users/${account.id}`, "PATCH", body);
      const changes = Array.isArray(data.changes) ? (data.changes as string[]) : [];
      const note = typeof data.note === "string" ? data.note : "";
      setMsg({
        ok: true,
        text: [changes.join("; "), note].filter(Boolean).join(" — ") || "Updated.",
      });
      setConfirmDeactivate(false);
      refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Update failed." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`role-${account.id}`} className="sr-only">
          Role for {account.email}
        </label>
        <select
          id={`role-${account.id}`}
          disabled={busy !== null || locked}
          value={account.role}
          onChange={(e) => patch({ role: e.target.value }, "role")}
          className="border hairline bg-white px-2 py-1 text-[12.5px] disabled:opacity-60"
        >
          {account.assignable.map((r) => (
            <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
          ))}
          {account.role === "super_admin" && (
            <option value="super_admin">super admin</option>
          )}
        </select>

        {account.isActive ? (
          confirmDeactivate ? (
            <span className="flex items-center gap-1.5">
              <span className="text-[12.5px] font-semibold text-red-900">End all sessions?</span>
              <button
                type="button"
                onClick={() => patch({ isActive: false }, "active")}
                disabled={busy !== null}
                className="bg-red-800 px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-60"
              >
                {busy === "active" ? "…" : "Yes, deactivate"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeactivate(false)}
                className="text-[12.5px] font-semibold text-ink/60"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDeactivate(true)}
              disabled={account.isSelf}
              title={account.isSelf ? "You cannot deactivate your own account" : undefined}
              className="text-[12.5px] font-semibold text-red-800 link-underline disabled:cursor-not-allowed disabled:text-ink/35 disabled:no-underline"
            >
              Deactivate
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => patch({ isActive: true }, "active")}
            disabled={busy !== null}
            className="text-[12.5px] font-semibold text-green-800 link-underline disabled:opacity-60"
          >
            Reactivate
          </button>
        )}
      </div>

      {locked && (
        <p className="mt-1 text-[11.5px] text-ink/50">
          {account.isSelf
            ? "You cannot change your own role or status."
            : "Last active super administrator — cannot be demoted or deactivated."}
        </p>
      )}

      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`mt-2 max-w-sm border px-3 py-1.5 text-[12px] ${feedbackClass(msg.ok)}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

export function CreateAccountForm({ assignable }: { assignable: readonly string[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "member" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/v1/users", "POST", form);
      setForm({ name: "", email: "", password: "", role: "member" });
      setMsg({ ok: true, text: "Account created. Share the password out of band — it is never emailed." });
      refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Create failed." });
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full border hairline bg-white px-3 py-2 text-sm";

  return (
    <form onSubmit={submit} className="border hairline bg-paper p-5">
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink/60">Create an account</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ca-name" className="text-[11px] font-bold uppercase tracking-wider text-ink/55">Name</label>
          <input id="ca-name" required className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="ca-email" className="text-[11px] font-bold uppercase tracking-wider text-ink/55">Email</label>
          <input id="ca-email" type="email" required className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="ca-password" className="text-[11px] font-bold uppercase tracking-wider text-ink/55">Password</label>
          <input
            id="ca-password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            className={field}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <p className="mt-1 text-[11.5px] text-ink/50">At least 12 characters. bcrypt cost 12.</p>
        </div>
        <div>
          <label htmlFor="ca-role" className="text-[11px] font-bold uppercase tracking-wider text-ink/55">Role</label>
          <select id="ca-role" className={`${field} bg-white`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {assignable.map((r) => (
              <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 bg-primary px-4 py-2 text-[12.5px] font-bold text-white hover:bg-forest-700 disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create account"}
      </button>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-[12.5px] ${msg.ok ? "text-green-800" : "text-red-800"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
