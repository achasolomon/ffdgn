import { db, dbReady, fail, failFrom, ok } from "../../_lib";
import { requireAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";

export async function GET() {
  try {
    if (!(await dbReady())) return fail("UNAVAILABLE", "Committee workspaces require MySQL.", 503);
    const auth = await requireAuth();
    const manages = hasPermission(auth.user.role, "committees.manage");
    const committees = await db.committee.findMany({
      where: { published: true, ...(manages ? {} : { seats: { some: { member: { userId: auth.user.id } } } }) },
      include: {
        meetingRecords: { orderBy: { startsAt: "desc" }, take: 20, include: { organizer: { select: { name: true } } } },
        recommendations: {
          where: manages ? {} : { OR: [{ status: { not: "Draft" } }, { authorId: auth.user.id }] },
          orderBy: { updatedAt: "desc" }, take: 50,
          include: { author: { select: { name: true } } },
        },
      },
      orderBy: { name: "asc" },
    });
    return ok(committees.map((committee) => ({
      slug: committee.slug, name: committee.name, mandate: committee.mandate, manages,
      meetings: committee.meetingRecords.map((meeting) => ({
        id: meeting.id, title: meeting.title, startsAt: meeting.startsAt.toISOString(),
        location: meeting.location, agenda: meeting.agenda, minutes: meeting.minutes,
        organizer: meeting.organizer.name,
      })),
      recommendations: committee.recommendations.map((item) => ({
        id: item.id, title: item.title, rationale: item.rationale,
        recommendation: item.recommendation, status: item.status, author: item.author.name,
        own: item.authorId === auth.user.id, updatedAt: item.updatedAt.toISOString(),
      })),
    })));
  } catch (error) { return failFrom(error); }
}

export const dynamic = "force-dynamic";