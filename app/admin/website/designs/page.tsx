import { requirePermission } from "@/lib/server-auth";
import { db, dbReady } from "@/lib/db";
import { TEMPLATE_CONTENT } from "@/lib/template-content";
import { parseTemplateDocument, templateKey } from "@/lib/template-repo";
import { AdminDesignContent } from "@/components/admin-design-content";
export default async function DesignContentPage() {
  await requirePermission("settings.manage");
  const ready = await dbReady();
  const rows = ready ? await db.siteSetting.findMany({ where: { OR: [{ key: { startsWith: "website.copy.draft." } }, { key: { startsWith: "website.copy.published." } }] } }) : [];
  const records = TEMPLATE_CONTENT.map(definition => ({ definition, draft: parseTemplateDocument(definition.id, rows.find(row => row.key === templateKey(definition.id, "draft"))?.value), published: parseTemplateDocument(definition.id, rows.find(row => row.key === templateKey(definition.id, "published"))?.value) }));
  return <AdminDesignContent records={records} databaseReady={ready} />;
}
export const dynamic = "force-dynamic";
