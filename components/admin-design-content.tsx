"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdminApi } from "./admin-client";
import { AdminMediaPicker } from "./admin-media-picker";
import { templateDefaults, validateTemplateValues, type TemplateDefinition, type TemplateDocument } from "@/lib/template-content";
type DesignRecord = { definition: TemplateDefinition; draft: TemplateDocument | null; published: TemplateDocument | null };
export function AdminDesignContent({ records: initial, databaseReady }: { records: DesignRecord[]; databaseReady: boolean }) {
  const api = useAdminApi();
  const [records, setRecords] = useState(initial);
  const [id, setId] = useState(initial[0]?.definition.id ?? "");
  const current = records.find(record => record.definition.id === id)!;
  const [values, setValues] = useState(current?.draft?.values ?? templateDefaults(id));
  const [version, setVersion] = useState(current?.draft?.version ?? 0);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(""), [fieldQuery, setFieldQuery] = useState("");
  const [message, setMessage] = useState(""), [revisions, setRevisions] = useState<TemplateDocument[]>([]);
  const [comparison, setComparison] = useState(false);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  function choose(record: DesignRecord) {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setId(record.definition.id); setValues(record.draft?.values ?? templateDefaults(record.definition.id)); setVersion(record.draft?.version ?? 0); setDirty(false); setFieldQuery(""); setMessage(""); setRevisions([]); setComparison(false);
  }
  async function save(action: "save" | "publish") {
    const invalid = validateTemplateValues(id, values); if (invalid) { setMessage(invalid); return; }
    setBusy(true);
    try {
      const result = await api("/api/v1/cms/designs", "POST", { id, values, version, action });
      const document = result.data as unknown as TemplateDocument;
      setVersion(document.version); setDirty(false);
      setRecords(records => records.map(record => record.definition.id === id ? { ...record, draft: document, published: action === "publish" ? document : record.published } : record));
      setMessage(action === "publish" ? "Published. The current design now uses this content." : "Draft saved. Public content is unchanged.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Saving failed."); } finally { setBusy(false); }
  }
  function edit(key: string, value: string) { setValues(values => ({ ...values, [key]: value })); setDirty(true); setMessage(""); }
  async function history() { try { const response = await fetch(`/api/v1/cms/designs?id=${encodeURIComponent(id)}`, { cache: "no-store" }); const result = await response.json(); if (!response.ok) throw new Error(result?.errors?.[0]?.message ?? "History unavailable."); setRevisions(result.data); } catch (error) { setMessage(error instanceof Error ? error.message : "History unavailable."); } }
  return <div className="website-builder"><header className="builder-workspace-heading"><div><p>Website / Current designs</p><h1>Edit the current designs</h1><span>Change copy, destinations and images while keeping the existing layouts and live records.</span></div><Link href="/admin/website">Page builder →</Link></header><div className="builder-related"><Link href="/admin/content">Branding & contact details</Link><Link href="/admin/content/navigation">Menus & footer</Link><Link href="/admin/media">Media & event albums</Link><Link href="/admin/content/pages">Institutional & programme copy</Link></div><div className="builder-grid"><aside className="builder-library"><label>Find a design<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Page or shared component" /></label>{records.filter(record => `${record.definition.title} ${record.definition.path}`.toLowerCase().includes(query.toLowerCase())).map(record => <button key={record.definition.id} aria-current={record.definition.id === id ? "page" : undefined} onClick={() => choose(record)}><strong>{record.definition.title}</strong><span>{record.definition.path || "Shared across pages"}</span><small>{record.draft?.version === record.published?.version ? "Published" : "Unpublished changes"}</small></button>)}</aside><div className="builder-editor"><div className="builder-status"><span>{current.definition.title} · {current.definition.fields.length} editable fields</span><strong>{dirty ? "Unsaved changes" : `Revision ${version}`}</strong></div><div className="builder-actions"><button disabled={busy || !databaseReady} onClick={() => save("save")}>Save draft</button><button disabled={busy || !databaseReady} className="builder-publish" onClick={() => save("publish")}>Publish content</button><button onClick={() => setComparison(value => !value)}>Compare with published</button><button onClick={history}>Revision history</button>{current.definition.path && !current.definition.path.includes("{slug}") && <a href={current.definition.path} target="_blank" rel="noreferrer">View page ↗</a>}</div>{message && <p role="status" className="builder-notice">{message}</p>}{!databaseReady && <p role="alert">Saving requires the content database.</p>}{revisions.length > 0 && <div className="builder-revisions"><h2>Restore content</h2>{revisions.map(document => <button key={document.version} onClick={() => { setValues(document.values); setDirty(true); setRevisions([]); }}>Revision {document.version} · {new Date(document.savedAt).toLocaleString()}</button>)}</div>}<div className="builder-fields"><label className="builder-field"><span>Find text on this design</span><input value={fieldQuery} onChange={event => setFieldQuery(event.target.value)} placeholder="Search a heading, button or caption" /></label><p className="builder-help">Record names, event information and institutional bodies remain in their record editors. Shared designs affect every page that uses them. Keep any {"{value1}"} placeholders: the site inserts record-specific information there.</p>{current.definition.fields.filter(field => `${field.label} ${values[field.key]}`.toLowerCase().includes(fieldQuery.toLowerCase())).map(field => <div key={field.key}><label className="builder-field"><span>{field.kind === "image" ? "Image" : field.kind === "link" ? "Destination" : "Text"}: {field.label}</span>{field.value.length > 150 ? <textarea rows={4} value={values[field.key]} onChange={event => edit(field.key, event.target.value)} /> : <input value={values[field.key]} onChange={event => edit(field.key, event.target.value)} />}</label>{field.kind === "image" && <AdminMediaPicker publicOnly onSelect={url => edit(field.key, url)} />}{comparison && <p className="builder-help">Published: {current.published?.values[field.key] ?? field.value}</p>}</div>)}</div></div></div></div>;
}
