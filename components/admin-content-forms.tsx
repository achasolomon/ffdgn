"use client";
import { AdminMediaPicker } from "./admin-media-picker";
import { useState } from "react";
import { useAdminApi, useAdminRefresh } from "./admin-client";

export interface EditableSetting {
  key: string;
  label?: string;
  value: string;
  /** Multi-line inputs need a textarea; a 400-character hero lede in one line is unusable. */
  multiline?: boolean;
}

export interface EditableMetric {
  key: string;
  value: string;
  label: string;
  href: string;
}

/**
 * Site copy editing.
 *
 * These values render directly on the public homepage, which is why the write
 * path is server-validated (`ALLOWED_KEYS`, length caps) rather than trusted
 * from here. The form therefore reports the server's validation message rather
 * than re-implementing the rule and drifting from it.
 */
export function SettingsForm({ settings }: { settings: EditableSetting[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string; key: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [group,setGroup] = useState("site");
  const [search,setSearch] = useState("");
  const groups = [{key:"site",label:"Identity & contact"},{key:"hero",label:"Homepage hero"},{key:"home",label:"Homepage introduction"},{key:"footer",label:"Footer identity & contact panel"},{key:"header",label:"Header banner"},{key:"event",label:"Conference announcement"},{key:"contact",label:"Secretariat details"}];

  async function save(key: string) {
    setBusy(key);
    setMsg(null);
    try {
      await api("/api/v1/cms/settings", "PATCH", { key, value: form[key] });
      setMsg({ ok: true, key, text: "Saved. Homepage refreshed." });
      refresh();
    } catch (err) {
      setMsg({ ok: false, key, text: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="divide-y divide-ink/10 border hairline bg-white">
      <div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-sm font-semibold">What would you like to edit?<select className="mt-2 w-full border hairline p-3 text-sm" value={group} onChange={event=>setGroup(event.target.value)}><option value="all">All site settings</option>{groups.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label className="text-sm font-semibold">Find a setting<input className="mt-2 w-full border hairline p-3 text-sm" placeholder="Search by name" value={search} onChange={event=>setSearch(event.target.value)}/></label></div>
      {settings.filter(s=>(group === "all" || s.key.startsWith(`${group}.`)) && `${s.label} ${s.key}`.toLowerCase().includes(search.toLowerCase())).map((s) => {
        const err = msg && msg.key === s.key ? msg : null;
        return (
          <div key={s.key} className="px-5 py-4">
            <label htmlFor={`set-${s.key}`} className="block text-[12px] font-bold uppercase tracking-wider text-ink/60">
              {s.label ?? s.key}
            </label>
            {s.multiline ? (
              <textarea
                id={`set-${s.key}`}
                rows={3}
                className="mt-1.5 w-full border hairline px-3 py-2 text-sm"
                value={form[s.key] ?? ""}
                onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
              />
            ) : (
              <input
                id={`set-${s.key}`}
                className="mt-1.5 w-full border hairline px-3 py-2 text-sm"
                value={form[s.key] ?? ""}
                onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
              />
            )}
            {/^(hero\.image_[123]|header\.ad_image|home\.about_image|site\.logo|footer\.cta_image)$/.test(s.key) && <div className="mt-2 flex items-center gap-3"><AdminMediaPicker onSelect={(url) => setForm({ ...form, [s.key]: url })} />{form[s.key] && <img src={form[s.key]} alt="Selected image preview" className="h-16 w-28 object-contain" />}</div>}
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => save(s.key)}
                disabled={busy === s.key || (!form[s.key]?.trim() && !s.key.startsWith("hero.image_") && !s.key.startsWith("header.ad_"))}
                className="bg-primary px-3.5 py-1.5 text-[12.5px] font-bold text-white hover:bg-forest-700 disabled:opacity-60"
              >
                {busy === s.key ? "Saving…" : "Save"}
              </button>
              {err && (
                <span role={err.ok ? "status" : "alert"} className={`text-[12.5px] ${err.ok ? "text-green-800" : "text-red-800"}`}>
                  {err.text}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Identity-strip figures. Positions are assigned by insertion order server-side;
 * reordering is deliberately not offered because the strip renders four columns
 * on desktop and an off-by-one reorder would silently change what the Forum
 * claims about itself without an audit trail.
 */
export function MetricList({ metrics }: { metrics: EditableMetric[] }) {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [msg, setMsg] = useState<{ ok: boolean; text: string; key: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function save(m: EditableMetric) {
    setBusy(m.key);
    setMsg(null);
    try {
      await api("/api/v1/cms/metrics", "PATCH", { ...m });
      setMsg({ ok: true, key: m.key, text: "Saved. Homepage refreshed." });
      refresh();
    } catch (err) {
      setMsg({ ok: false, key: m.key, text: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setBusy(null);
    }
  }

  async function remove(key: string) {
    setBusy(key);
    setMsg(null);
    try {
      await api(`/api/v1/cms/metrics?key=${encodeURIComponent(key)}`, "DELETE");
      setMsg({ ok: true, key, text: "Metric removed." });
      refresh();
    } catch (err) {
      setMsg({ ok: false, key, text: err instanceof Error ? err.message : "Delete failed." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {metrics.length === 0 ? (
        <p className="border hairline bg-white px-5 py-8 text-center text-sm text-ink/60" role="status">
          No metrics configured. The homepage strip renders nothing until one exists.
        </p>
      ) : (
        metrics.map((m) => (
          <MetricRow
            key={m.key}
            metric={m}
            busy={busy === m.key}
            message={msg && msg.key === m.key ? msg.text : null}
            onSave={() => save(m)}
            onRemove={() => remove(m.key)}
          />
        ))
      )}
    </div>
  );
}

function MetricRow({
  metric,
  busy,
  message,
  onSave,
  onRemove,
}: {
  metric: EditableMetric;
  busy: boolean;
  message: string | null;
  onSave: () => void;
  onRemove: () => void;
}) {
  const [form, setForm] = useState(metric);
  const [confirming, setConfirming] = useState(false);
  const field = "mt-1 w-full border hairline px-2.5 py-1.5 text-[13px]";

  return (
    <div className="border hairline bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-[100px_1fr_1fr]">
        <div>
          <label htmlFor={`mv-${metric.key}`} className="text-[11px] font-bold uppercase tracking-wider text-ink/55">
            Figure
          </label>
          <input
            id={`mv-${metric.key}`}
            className={field}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`ml-${metric.key}`} className="text-[11px] font-bold uppercase tracking-wider text-ink/55">
            Label
          </label>
          <input
            id={`ml-${metric.key}`}
            className={field}
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`mh-${metric.key}`} className="text-[11px] font-bold uppercase tracking-wider text-ink/55">
            Links to
          </label>
          <input
            id={`mh-${metric.key}`}
            className={`${field} font-mono`}
            value={form.href}
            placeholder="/about"
            onChange={(e) => setForm({ ...form, href: e.target.value })}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !form.value.trim()}
          className="bg-primary px-3.5 py-1.5 text-[12.5px] font-bold text-white hover:bg-forest-700 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {confirming ? (
          <span className="flex items-center gap-2">
            <span className="text-[12.5px] font-semibold text-red-900">Remove “{metric.label}”?</span>
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="bg-red-800 px-2.5 py-1 text-[12px] font-bold text-white disabled:opacity-60"
            >
              {busy ? "…" : "Yes, remove"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-[12.5px] font-semibold text-ink/60">
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="text-[12.5px] font-semibold text-red-800 link-underline">
            Remove
          </button>
        )}
        {message && <span role="status" className="text-[12.5px] text-ink/65">{message}</span>}
      </div>
    </div>
  );
}

export function NewMetricForm() {
  const api = useAdminApi();
  const refresh = useAdminRefresh();
  const [form, setForm] = useState({ key: "", value: "", label: "", href: "/about" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api("/api/v1/cms/metrics", "PATCH", form);
      setForm({ key: "", value: "", label: "", href: "/about" });
      setMsg({ ok: true, text: "Metric added." });
      refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Add failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="border hairline bg-paper p-5">
      <h3 className="text-[12px] font-bold uppercase tracking-wider text-ink/60">Add a figure</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="nm-key" className="text-[11px] font-bold uppercase tracking-wider text-ink/55">Key</label>
          <input id="nm-key" required className="mt-1 w-full border hairline bg-white px-2.5 py-1.5 font-mono text-[13px]" value={form.key} placeholder="members" onChange={(e) => setForm({ ...form, key: e.target.value })} />
        </div>
        <div>
          <label htmlFor="nm-value" className="text-[11px] font-bold uppercase tracking-wider text-ink/55">Figure</label>
          <input id="nm-value" required className="mt-1 w-full border hairline bg-white px-2.5 py-1.5 text-[13px]" value={form.value} placeholder="186+" onChange={(e) => setForm({ ...form, value: e.target.value })} />
        </div>
        <div>
          <label htmlFor="nm-label" className="text-[11px] font-bold uppercase tracking-wider text-ink/55">Label</label>
          <input id="nm-label" required className="mt-1 w-full border hairline bg-white px-2.5 py-1.5 text-[13px]" value={form.label} placeholder="Member organisations" onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div>
          <label htmlFor="nm-href" className="text-[11px] font-bold uppercase tracking-wider text-ink/55">Links to</label>
          <input id="nm-href" required className="mt-1 w-full border hairline bg-white px-2.5 py-1.5 font-mono text-[13px]" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })} />
        </div>
      </div>
      <button type="submit" disabled={busy || !form.key.trim()} className="mt-4 bg-primary px-4 py-2 text-[12.5px] font-bold text-white hover:bg-forest-700 disabled:opacity-60">
        {busy ? "Adding…" : "Add metric"}
      </button>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`mt-2 text-[12.5px] ${msg.ok ? "text-green-800" : "text-red-800"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
