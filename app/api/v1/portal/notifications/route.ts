import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requireAuth } from "@/lib/server-auth";

export async function GET() {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Notifications require MySQL.", 503);
    const auth = await requireAuth();
    const notifications = await db.notification.findMany({ where: { userId: auth.user.id }, orderBy: { createdAt: "desc" }, take: 100 });
    return ok(notifications.map((item) => ({
      id: item.id, title: item.title, body: item.body, href: item.href,
      read: !!item.readAt, createdAt: item.createdAt.toISOString(),
    })));
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";