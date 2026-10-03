"use client";
import { useRef, useState } from "react";
import { useAdminApi, useAdminRefresh, feedbackClass } from "./admin-client";

export interface EditableAsset {
  id: string;
  title: string;
  category: string;
  altText: string | null;
  photographer: string | null;
  description: string | null;
  visibility: string;
  kind: string;
  url: string;
  /**
   * Whether the asset appears in the public photo/video galleries. Everything
   * stays reachable in the admin list and the media picker either way — this
   * only governs what visitors see.
   */
  inGallery: boolean;
  /** Capture year when supplied; null falls back to the event or upload year. */
  year: number | null;
  eventSlug?: string;
  /** True when the asset's file is absent from /public, so it renders blank. */
  fileMissing?: boolean;
}

const VISIBILITIES = [
  ["PUBLIC", "Public — everyone"],
  ["SECRETARIAT_ONLY", "Secretariat only"],
  ["COMMITTEE_ONLY", "Committee only"],
  ["MEMBERS_ONLY", "Members only"],
  ["PRIVATE", "Private"],
] as const;

/**
 * Row actions for the media library.
 *
 * Three verbs, each labelled with what it actually does, because "Edit" alone
 * gave an editor no way to tell a metadata edit from a file replacement:
 *
 *   Replace image — the primary action. Swaps the file behind this asset while
 *                   keeping the record, so every page already using it updates.
 *   Edit details  — title, alt text, credit, collection, visibility.
 *   Delete        — removes the record (and the file, if it was an upload).
 */
export function MediaRowActions({ asset, events = [] }: { asset: EditableAsset; events?: {slug:string;title:string}[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [editing, setEditing] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(asset.url);
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: asset.title,
    category: asset.category,
    altText: asset.altText ?? "",
    photographer: asset.photographer ?? "",
    description: asset.description ?? "",
    eventSlug: asset.eventSlug ?? "",
    visibility: asset.visibility,
    inGallery: asset.inGallery,
    year: asset.year === null ? "" : String(asset.year),
  });

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await api(`/api/v1/media/${asset.id}`, "PATCH", {
        ...form,
        // The form keeps the year as digits so typing stays simple; the API
        // takes a number, or null to hand the year back to the fallback chain.
        year: form.year === "" ? null : Number(form.year),
      });
      setMsg({ ok: true, text: "Saved. Public site refreshed." });
      setEditing(false);
      refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  }

  /**
   * Upload a new file for this asset. The record is preserved, so the alt text,
   * collection and event link survive and every reference follows the new file.
   */
  async function replaceImage(file: File) {
    setBusy(true);
    setMsg(null);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/v1/media/${asset.id}/file`, { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.errors?.[0]?.message ?? `Replace failed (${res.status}).`);
      setCurrentUrl(data.data.url);
      setReplacing(false);
      setMsg({
        ok: true,
        text:
          data.data.previousFile === "kept-shared"
            ? "Image replaced. The previous file is still used by another asset, so it was kept."
            : "Image replaced. Every page using this asset now shows the new file.",
      });
      refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Replace failed." });
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    setMsg(null);
    try {
      const { data } = await api(`/api/v1/media/${asset.id}`, "DELETE");
      setMsg({
        ok: true,
        text: data.fileRemoved
          ? "Asset and file deleted."
          : "Asset record deleted. The underlying file was kept.",
      });
      setConfirming(false);
      refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Delete failed." });
    } finally {
      setBusy(false);
    }
  }

  const field = "mt-1 w-full border hairline px-3 py-2 text-sm";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          onClick={() => {
            setReplacing((v) => !v);
            setEditing(false);
            setMsg(null);
          }}
          aria-expanded={replacing}
          className={`border px-2.5 py-1 text-[12.5px] font-bold ${
            asset.fileMissing || replacing
              ? "border-primary bg-primary text-white"
              : "border-primary text-primary hover:bg-primary/5"
          }`}
        >
          {asset.fileMissing ? "Fix missing image" : "Replace image"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing((v) => !v);
            setReplacing(false);
            setMsg(null);
          }}
          aria-expanded={editing}
          className="text-[13px] font-semibold text-primary link-underline"
        >
          {editing ? "Cancel details" : "Edit details"}
        </button>
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="text-[13px] font-semibold text-red-800 link-underline"
          >
            Delete
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <span className="text-[12.5px] font-semibold text-red-900">Remove this asset?</span>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="bg-red-800 px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-60"
            >
              {busy ? "…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[12.5px] font-semibold text-ink/60"
            >
              Keep
            </button>
          </span>
        )}
      </div>

      {msg && (
        <p
          role={msg.ok ? "status" : "alert"}
          className={`mt-2 max-w-sm border px-3 py-1.5 text-[12px] ${feedbackClass(msg.ok)}`}
        >
          {msg.text}
        </p>
      )}

      {replacing && (
        <div className="mt-3 max-w-lg border hairline bg-paper p-4">
          <p className="text-[12.5px] font-semibold text-forest-950">
            {asset.fileMissing ? "This asset's file is missing" : "Replace the file for this asset"}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink/60">
            {asset.fileMissing
              ? "Nothing is currently rendering for this asset. Upload the correct file and every page using it will show it."
              : "Upload a new file. The title, alt text, collection and event link stay as they are, and the old file is removed unless another asset still uses it."}
          </p>
          <p className="mt-2 truncate font-mono text-[11px] text-ink/50" title={currentUrl}>
            Current: {currentUrl}
          </p>
          <label className="mt-3 block text-[12px] font-semibold" htmlFor={`r-${asset.id}`}>
            New file
          </label>
          <input
            id={`r-${asset.id}`}
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
            disabled={busy}
            className="mt-1 w-full border hairline bg-white px-3 py-2 text-[12.5px] disabled:opacity-60"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void replaceImage(file);
            }}
          />
          <p className="mt-1.5 text-[11px] text-ink/50">
            Images: JPEG/PNG/WebP/GIF ≤ 10 MB. Video: MP4/WebM ≤ 200 MB. SVG is rejected for security.
          </p>
        </div>
      )}

      {editing && (
        <div className="mt-3 grid max-w-lg gap-3 border hairline bg-paper p-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor={`t-${asset.id}`} className="text-[12px] font-semibold">
              Title
            </label>
            <input
              id={`t-${asset.id}`}
              className={field}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor={`c-${asset.id}`} className="text-[12px] font-semibold">
              Collection
            </label>
            <input
              id={`c-${asset.id}`}
              className={field}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor={`v-${asset.id}`} className="text-[12px] font-semibold">
              Visibility
            </label>
            <select
              id={`v-${asset.id}`}
              className={`${field} bg-white`}
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
            >
              {VISIBILITIES.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`a-${asset.id}`} className="text-[12px] font-semibold">
              Alt text
            </label>
            <input
              id={`a-${asset.id}`}
              className={field}
              value={form.altText}
              placeholder="Describe the image for screen readers"
              onChange={(e) => setForm({ ...form, altText: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`p-${asset.id}`} className="text-[12px] font-semibold">
              Credit / photographer
            </label>
            <input
              id={`p-${asset.id}`}
              className={field}
              value={form.photographer}
              onChange={(e) => setForm({ ...form, photographer: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`d-${asset.id}`} className="text-[12px] font-semibold">
              Description
            </label>
            <textarea
              id={`d-${asset.id}`}
              rows={2}
              className={field}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2"><label htmlFor={`event-${asset.id}`} className="text-[12px] font-semibold">Event album</label><select id={`event-${asset.id}`} className={field} value={form.eventSlug} onChange={event=>setForm({...form,eventSlug:event.target.value})}><option value="">No event album</option>{events.map(event=><option key={event.slug} value={event.slug}>{event.title}</option>)}</select><p className="mt-1 text-xs text-ink/60">Gallery photographs need an event album. Other website artwork can remain unassigned.</p></div>
          <div className="sm:col-span-2 flex items-start gap-2">
            <input
              id={`g-${asset.id}`}
              type="checkbox"
              checked={form.inGallery}
              onChange={(e) => setForm({ ...form, inGallery: e.target.checked })}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <label htmlFor={`g-${asset.id}`} className="text-[12px] leading-relaxed">
              <span className="font-semibold">Show in the public galleries</span>
              <span className="block text-ink/60">Untick brand marks, partner logos and site artwork — they stay in this list and in the media picker without padding Photo/Video.</span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`y-${asset.id}`} className="text-[12px] font-semibold">
              Capture year
            </label>
            <input
              id={`y-${asset.id}`}
              inputMode="numeric"
              maxLength={4}
              className={field}
              value={form.year}
              placeholder="Leave blank to use the event year or upload year"
              onChange={(e) => setForm({ ...form, year: e.target.value.replace(/\D/g, "") })}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={save}
              disabled={busy || !form.title.trim()}
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
