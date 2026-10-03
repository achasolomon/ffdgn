import { requirePermission } from "@/lib/server-auth";
import { dbReady } from "@/lib/db";
import { PAGE_CATALOG } from "@/lib/website-content";
import { listWebsiteRecords, pageStarter } from "@/lib/website-repo";
import { AdminWebsiteBuilder } from "@/components/admin-website-builder";
export default async function WebsiteWorkspace() {
  await requirePermission("settings.manage");
  const [records,starters,ready]=await Promise.all([listWebsiteRecords(),Promise.all(PAGE_CATALOG.map(([path,title])=>pageStarter(path,title))),dbReady()]);
  return <AdminWebsiteBuilder records={records} starters={starters} databaseReady={ready}/>;
}
export const dynamic="force-dynamic";
