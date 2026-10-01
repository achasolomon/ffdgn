import { db, dbReady, documents, failFrom, ok, pageOf, paging, toPublicDoc } from "../_lib";

/**
 * GET /api/v1/documents — only Published + PUBLIC records are exposed
 * publicly. Restricted records require auth + documents.view (portal/admin).
 */
export async function GET(req: Request) {
  try {
    const { page, perPage, q } = paging(req);
    if (await dbReady()) {
      const where = {
        status: "Published" as const, visibility: "PUBLIC" as const,
        ...(q ? { OR: [{ title: { contains: q } }, { topic: { contains: q } }] } : {}),
      };
      const [total, rows] = await Promise.all([
        db.knowledgeDoc.count({ where }),
        db.knowledgeDoc.findMany({ where, orderBy: [{ year: "desc" }, { title: "asc" }], skip: (page - 1) * perPage, take: perPage }),
      ]);
      return ok(rows.map(toPublicDoc), { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), source: "mysql" });
    }
    const filtered = documents.filter(
      (d) => d.status === "Published" && d.visibility === "PUBLIC" && (!q || `${d.title} ${d.topic}`.toLowerCase().includes(q.toLowerCase()))
    );
    return pageOf(filtered, page, perPage);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
