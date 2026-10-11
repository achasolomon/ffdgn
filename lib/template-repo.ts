import { cache } from "react";
import { db, dbReady } from "./db";
import { TEMPLATE_CONTENT, templateDefaults, templateCopy, parseTemplateDocument, templateKey } from "./template-content";
export { parseTemplateDocument, templateKey } from "./template-content";
export const getTemplateValues = cache(async (id: string) => {
  if (!(await dbReady())) return templateDefaults(id);
  const row = await db.siteSetting.findUnique({ where: { key: templateKey(id, "published") } });
  return parseTemplateDocument(id, row?.value)?.values ?? templateDefaults(id);
});
export async function getTemplateCopy(id: string) { return templateCopy(await getTemplateValues(id)); }
export async function getPublicTemplateValues() {
  const shared = TEMPLATE_CONTENT.filter(item => item.id.startsWith("shared-"));
  if (!(await dbReady())) return Object.fromEntries(shared.map(item => [item.id, templateDefaults(item.id)]));
  const rows = await db.siteSetting.findMany({ where: { key: { startsWith: "website.copy.published.shared-" } } });
  return Object.fromEntries(shared.map(item => [item.id, parseTemplateDocument(item.id, rows.find(row => row.key === templateKey(item.id, "published"))?.value)?.values ?? templateDefaults(item.id)]));
}
