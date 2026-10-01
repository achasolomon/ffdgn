"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function post(url: string, body: BodyInit | object, isJson: boolean) {
  const res = await fetch(url, {
    method: "POST",
    body: isJson ? JSON.stringify(body) : (body as BodyInit),
    headers: isJson ? { "Content-Type": "application/json" } : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.errors?.[0]?.message ?? `Upload failed (${res.status}).`);
  return data;
}

export function UploadForm({ events }: { events: { slug: string; title: string }[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Conference");
  const [eventSlug, setEventSlug] = useState("");
  const [altText, setAltText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMsg({ ok: false, text: "Choose a file first." }); return; }
    setBusy(true); setMsg(null);
    try {
      const form = new FormData();
      form.set("file", file); form.set("title", title); form.set("category", category);
      if (eventSlug) form.set("eventSlug", eventSlug);
      if (altText) form.set("altText", altText);
      await post("/api/v1/media", form, false);
      setMsg({ ok: true, text: "Asset uploaded and catalogued." });
      setFile(null); setTitle(""); setAltText("");
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Upload failed." });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="border hairline bg-white p-6" aria-label="Upload media">
      <h2 className="font-display text-xl text-forest-950">Upload photo / video</h2>
      <p className="mt-1 text-[13px] text-ink/60">Images: JPEG/PNG/WebP/GIF/SVG ≤ 10 MB · Video: MP4/WebM ≤ 200 MB.</p>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 text-green-900 border border-green-800/30" : "bg-red-50 text-red-900 border border-red-800/30"}`}>{msg.text}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="mf" className="text-[13px] font-semibold">File</label>
          <input id="mf" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,video/mp4,video/webm" required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1 w-full border hairline px-3 py-2 text-sm" />
          {file && <p className="mt-1 text-[12px] text-ink/55">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
        </div>
        <div>
          <label htmlFor="mt" className="text-[13px] font-semibold">Title</label>
          <input id="mt" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full border hairline px-4 py-2 text-sm" placeholder="Opening plenary, Annual Conference 2026" />
        </div>
        <div>
          <label htmlFor="mc" className="text-[13px] font-semibold">Collection</label>
          <select id="mc" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 w-full border hairline bg-white px-3 py-2 text-sm">
            {["Conference", "Portrait", "Press", "Site", "Hero", "Archive"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="me" className="text-[13px] font-semibold">Related event (optional)</label>
          <select id="me" value={eventSlug} onChange={(e) => setEventSlug(e.target.value)} className="mt-1 w-full border hairline bg-white px-3 py-2 text-sm">
            <option value="">— none —</option>
            {events.map((ev) => <option key={ev.slug} value={ev.slug}>{ev.title}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="ma" className="text-[13px] font-semibold">Alt text (accessibility)</label>
        <input id="ma" value={altText} onChange={(e) => setAltText(e.target.value)} className="mt-1 w-full border hairline px-4 py-2 text-sm" placeholder="Describe the image for screen readers" />
      </div>
      <button disabled={busy} className="mt-5 bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-forest-700 disabled:opacity-60">
        {busy ? "Uploading…" : "Upload & catalogue →"}
      </button>
    </form>
  );
}

export function LinkForm({ events }: { events: { slug: string; title: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [provider, setProvider] = useState("YOUTUBE");
  const [providerId, setProviderId] = useState("");
  const [eventSlug, setEventSlug] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      await post("/api/v1/media/link", { title, provider, providerId, eventSlug: eventSlug || undefined }, true);
      setMsg({ ok: true, text: "Video catalogued in the archive." });
      setTitle(""); setProviderId("");
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Failed." });
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="border hairline bg-white p-6" aria-label="Catalogue video link">
      <h2 className="font-display text-xl text-forest-950">Catalogue YouTube / Vimeo video</h2>
      <p className="mt-1 text-[13px] text-ink/60">Playback uses privacy-hardened embeds; thumbnails resolve from the provider CDN.</p>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`mt-3 px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 text-green-900 border border-green-800/30" : "bg-red-50 text-red-900 border border-red-800/30"}`}>{msg.text}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="vt" className="text-[13px] font-semibold">Title</label>
          <input id="vt" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full border hairline px-4 py-2 text-sm" placeholder="President's opening address — 2026 Conference" />
        </div>
        <div>
          <label htmlFor="vp" className="text-[13px] font-semibold">Provider</label>
          <select id="vp" value={provider} onChange={(e) => setProvider(e.target.value)} className="mt-1 w-full border hairline bg-white px-3 py-2 text-sm">
            <option value="YOUTUBE">YouTube</option>
            <option value="VIMEO">Vimeo</option>
          </select>
        </div>
        <div>
          <label htmlFor="vi" className="text-[13px] font-semibold">Video ID</label>
          <input id="vi" value={providerId} onChange={(e) => setProviderId(e.target.value)} required className="mt-1 w-full border hairline px-4 py-2 text-sm font-mono" placeholder={provider === "YOUTUBE" ? "e.g. aqz-KE-bpKQ" : "e.g. 123456789"} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="ve" className="text-[13px] font-semibold">Related event (optional)</label>
          <select id="ve" value={eventSlug} onChange={(e) => setEventSlug(e.target.value)} className="mt-1 w-full border hairline bg-white px-3 py-2 text-sm">
            <option value="">— none —</option>
            {events.map((ev) => <option key={ev.slug} value={ev.slug}>{ev.title}</option>)}
          </select>
        </div>
      </div>
      <button disabled={busy} className="mt-5 bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-forest-700 disabled:opacity-60">
        {busy ? "Cataloguing…" : "Catalogue video →"}
      </button>
    </form>
  );
}
