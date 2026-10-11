import registry from "./template-content.json";
import { safeContentLink } from "./website-content";
export type TemplateField = { key: string; label: string; value: string; kind: "text" | "link" | "image" };
export type TemplateDefinition = { id: string; title: string; path: string; source: string; fields: TemplateField[] };
export const TEMPLATE_CONTENT = registry as TemplateDefinition[];
export type TemplateDocument = { values: Record<string, string>; version: number; savedAt: string };
export function parseTemplateDocument(id: string, value?: string | null): TemplateDocument | null {
  try { const document = JSON.parse(value ?? "null") as TemplateDocument; return !document || validateTemplateValues(id, document.values) || !Number.isInteger(document.version) ? null : document; } catch { return null; }
}
export function templateKey(id: string, state: "draft" | "published") { return `website.copy.${state}.${id}`; }
export function templateDefaults(id: string) { return Object.fromEntries(TEMPLATE_CONTENT.find(item => item.id === id)?.fields.map(field => [field.key, field.value]) ?? []); }
export function templateCopy(values: Record<string, string>) {
  return (key: string, substitutions: Record<string, string | number> = {}) => (values[key] ?? "").replace(/\{value\d+\}/g, token => String(substitutions[token.slice(1, -1)] ?? token));
}
export function validateTemplateValues(id: string, values: unknown): string | null {
  const definition = TEMPLATE_CONTENT.find(item => item.id === id);
  if (!definition || !values || typeof values !== "object" || Array.isArray(values)) return "Choose a current design and provide its content.";
  const data = values as Record<string, unknown>;
  if (Object.keys(data).some(key => !definition.fields.some(field => field.key === key))) return "This design contains an unknown content field.";
  for (const field of definition.fields) {
    const value = data[field.key];
    if (typeof value !== "string" || value.length > 16000) return `Check ${field.label}.`;
    if (field.kind === "link" && !safeContentLink(value.replace(/\{value\d+\}/g, "record"))) return `Choose a safe destination for ${field.label}.`;
    if (field.kind === "image" && !/^\/(?!\/)[\w/.-]+$/.test(value)) return `Choose a local image for ${field.label}.`;
    const placeholders: string[] = Array.from(field.value.match(/\{value\d+\}/g) ?? []);
    if (placeholders.some(token => !value.includes(token)) || (value.match(/\{value\d+\}/g) ?? []).some(token => !placeholders.includes(token))) return `Keep the dynamic placeholders in ${field.label}.`;
  }
  return new TextEncoder().encode(JSON.stringify(values)).length > 55000 ? "This content group exceeds its storage limit." : null;
}
