"use client";

import { useState } from "react";
import { Pencil, Save, Trash2, UsersRound } from "lucide-react";
import { useAdminApi, useAdminRefresh } from "./admin-client";

export type PeerReviewMemberRecord = {
  id: string;
  position: number;
  name: string;
  zone: string;
  role: string;
  phone: string | null;
  email: string | null;
  published: boolean;
};

const field =
  "w-full border border-[#d6ded6] bg-white px-3 py-2.5 text-[13px] text-[#23352a] placeholder:text-[#97a199] focus:border-[#31774d] focus:outline-none";
const label = "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.09em] text-[#617066]";

const empty = {
  id: "",
  position: 1,
  name: "",
  zone: "",
  role: "Member",
  phone: "",
  email: "",
  published: true,
};

type Form = typeof empty;

export function AdminPeerReviewMembers({ members }: { members: PeerReviewMemberRecord[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [form, setForm] = useState<Form>(empty);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function select(record: PeerReviewMemberRecord) {
    setForm({
      id: record.id,
      position: record.position,
      name: record.name,
      zone: record.zone,
      role: record.role,
      phone: record.phone ?? "",
      email: record.email ?? "",
      published: record.published,
    });
    setEditing(true);
    setMessage(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const payload = {
      position: form.position,
      name: form.name,
      zone: form.zone,
      role: form.role,
      phone: form.phone,
      email: form.email,
      published: form.published,
    };
    try {
      await api(
        editing
          ? `/api/v1/cms/peer-review-members/${encodeURIComponent(form.id)}`
          : "/api/v1/cms/peer-review-members",
        editing ? "PATCH" : "POST",
        payload,
      );
      setMessage({ ok: true, text: editing ? "Member updated." : "Member added." });
      setForm(empty);
      setEditing(false);
      refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(record: PeerReviewMemberRecord) {
    if (!window.confirm(`Remove ${record.name} from the Group? This cannot be undone.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await api(`/api/v1/cms/peer-review-members/${encodeURIComponent(record.id)}`, "DELETE");
      setMessage({ ok: true, text: "Member removed." });
      if (form.id === record.id) {
        setForm(empty);
        setEditing(false);
      }
      refresh();
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : "Delete failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-w-0 border border-[#dce2dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-[#20372a]">Peer review group</h2>
            <p className="mt-0.5 text-[12px] text-[#79847b]">{members.length} members</p>
          </div>
          <UsersRound size={17} className="text-[#62806b]" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-[#f6f8f5] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#778379]">
              <tr>
                <th className="px-5 py-3">S/N</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Visibility</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((record) => (
                <tr key={record.id} className="border-t border-[#edf0ed] hover:bg-[#fafbf9]">
                  <td className="px-5 py-3.5 font-semibold text-[#8a948c]">{record.position}</td>
                  <td className="px-4 py-3.5 font-semibold text-[#26382d]">{record.name}</td>
                  <td className="px-4 py-3.5 text-[#657168]">{record.zone}</td>
                  <td className="px-4 py-3.5 text-[#657168]">{record.role}</td>
                  <td className="px-4 py-3.5 text-[11px] text-[#657168]">
                    {record.published ? "Published" : "Draft"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex gap-1.5">
                      <button
                        type="button"
                        title={`Edit ${record.name}`}
                        aria-label={`Edit ${record.name}`}
                        onClick={() => select(record)}
                        className="inline-grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358] hover:text-[#174b31]"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        title={`Remove ${record.name}`}
                        aria-label={`Remove ${record.name}`}
                        disabled={busy}
                        onClick={() => remove(record)}
                        className="inline-grid h-8 w-8 place-items-center border border-[#dce2dc] text-[#526358] hover:border-red-200 hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!members.length && (
          <p className="px-5 py-10 text-center text-sm text-[#79847b]">No members published yet.</p>
        )}
      </section>

      <form onSubmit={submit} className="border border-[#dce2dc] bg-white">
        <div className="flex items-center justify-between border-b border-[#e4e9e4] px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4a7859]">
              RHPRG
            </p>
            <h2 className="mt-0.5 text-sm font-bold text-[#20372a]">
              {editing ? "Edit member" : "Add member"}
            </h2>
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setForm(empty);
                setEditing(false);
                setMessage(null);
              }}
              className="text-[11px] font-semibold text-[#69766c]"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="grid gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="rhprg-position">
                S/N
              </label>
              <input
                id="rhprg-position"
                required
                type="number"
                min={1}
                max={9999}
                className={field}
                value={form.position}
                onChange={(e) => setForm({ ...form, position: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={label} htmlFor="rhprg-role">
                Position
              </label>
              <input
                id="rhprg-role"
                required
                list="rhprg-roles"
                maxLength={100}
                className={field}
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
              <datalist id="rhprg-roles">
                <option>Chairman</option>
                <option>Secretary</option>
                <option>Member</option>
              </datalist>
            </div>
          </div>
          <div>
            <label className={label} htmlFor="rhprg-name">
              Name
            </label>
            <input
              id="rhprg-name"
              required
              maxLength={200}
              className={field}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className={label} htmlFor="rhprg-zone">
              Zone
            </label>
            <input
              id="rhprg-zone"
              required
              maxLength={100}
              placeholder="North Central, South West, FFDGN Rep…"
              className={field}
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="rhprg-phone">
                Mobile
              </label>
              <input
                id="rhprg-phone"
                type="tel"
                maxLength={50}
                className={field}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className={label} htmlFor="rhprg-email">
                Email
              </label>
              <input
                id="rhprg-email"
                type="email"
                maxLength={255}
                className={field}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[12px] font-medium text-[#59675d]">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
              className="accent-[#1b6840]"
            />{" "}
            Published on public site
          </label>
          <p className="text-[11px] leading-relaxed text-[#7f8a81]">
            Mobile and email are optional. Both columns stay hidden on the public page until at
            least one member has one.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e9e4] bg-[#f8faf7] px-5 py-3.5">
          {message ? (
            <p
              role={message.ok ? "status" : "alert"}
              className={`text-[12px] ${message.ok ? "text-[#267147]" : "text-red-800"}`}
            >
              {message.text}
            </p>
          ) : (
            <span className="text-[11px] text-[#778379]">Edits are audit logged.</span>
          )}
          <button
            disabled={busy}
            className="inline-flex items-center gap-2 bg-[#174b31] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            <Save size={14} />
            {busy ? "Saving…" : editing ? "Save member" : "Add member"}
          </button>
        </div>
      </form>
    </div>
  );
}
