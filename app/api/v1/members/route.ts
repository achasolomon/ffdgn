import { dbReady, db, ok, failFrom, paging, pageOf, toPublicMember, members } from "../_lib";

/** GET /api/v1/members — public records only (visibility = PUBLIC). */
export async function GET(req: Request) {
  try {
    const { page, perPage, q } = paging(req);
    if (await dbReady()) {
      const where = {
        visibility: "PUBLIC" as const,
        ...(q ? { OR: [{ fullName: { contains: q } }, { title: { contains: q } }] } : {}),
      };
      const [total, rows] = await Promise.all([
        db.member.count({ where }),
        db.member.findMany({ where, include: { service: true }, orderBy: { fullName: "asc" }, skip: (page - 1) * perPage, take: perPage }),
      ]);
      return ok(rows.map(toPublicMember), { page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)), source: "mysql" });
    }
    // Preview fallback (no DATABASE_URL): seeded CMS records.
    const filtered = members.filter(
      (m) => m.visibility === "PUBLIC" && (!q || `${m.name} ${m.title}`.toLowerCase().includes(q.toLowerCase()))
    );
    return pageOf(filtered, page, perPage);
  } catch (e) {
    return failFrom(e);
  }
}

export const dynamic = "force-dynamic";
