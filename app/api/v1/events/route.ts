import { db, dbReady, events, failFrom, ok, pageOf, paging, toPublicEvent } from "../_lib";

/** GET /api/v1/events — persistent institutional objects, newest first. */
export async function GET(req: Request) {
  try {
    const { page, perPage, q } = paging(req);
    if (await dbReady()) {
      const where = {
        published: true,
        ...(q ? { OR: [{ title: { contains: q } }, { theme: { contains: q } }, { city: { contains: q } }] } : {}),
      };
      const [total, rows] = await Promise.all([
        db.forumEvent.count({ where }),
        db.forumEvent.findMany({ where, include: { programme: { orderBy: { position: "asc" } } }, orderBy: { startDate: "desc" }, skip: (page - 1) * perPage, take: perPage }),
      ]);
      return ok(rows.map(toPublicEvent), { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), source: "mysql" });
    }
    const filtered = events.filter((e) => !q || `${e.title} ${e.theme} ${e.city}`.toLowerCase().includes(q.toLowerCase()));
    return pageOf(filtered, page, perPage);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
