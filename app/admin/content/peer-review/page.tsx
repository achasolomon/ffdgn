import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/server-auth";
export default async function Page() { await requirePermission("settings.manage"); redirect("/admin/programs?program=renewed-hope"); }
