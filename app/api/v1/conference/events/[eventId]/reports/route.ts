import { ok, failFrom } from "@/app/api/v1/_lib";
import { conferenceAuth, conferenceError, mutationGuard, readBody } from "@/lib/conference/server";
import { attendanceFilter, attendanceReport, exportAttendance } from "@/lib/conference/reporting";

type Context = { params: Promise<{ eventId: string }> };
function privateResponse(response: Response) { response.headers.set("Cache-Control", "private, no-store"); response.headers.set("X-Robots-Tag", "noindex, nofollow"); return response; }
export async function GET(req: Request, { params }: Context) {
  try { const { eventId } = await params; await conferenceAuth(eventId, "view"); return privateResponse(ok(await attendanceReport(eventId, attendanceFilter(Object.fromEntries(new URL(req.url).searchParams))))); }
  catch (error) { return privateResponse(failFrom(conferenceError(error))); }
}
export async function POST(req: Request, { params }: Context) {
  try {
    const { eventId } = await params; const { auth } = await conferenceAuth(eventId, "view"); await mutationGuard(req, auth);
    const csv = await exportAttendance(eventId, auth, attendanceFilter(await readBody(req)));
    return privateResponse(new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="conference-attendance.csv"', "X-Content-Type-Options": "nosniff" } }));
  } catch (error) { return privateResponse(failFrom(conferenceError(error))); }
}
export const dynamic = "force-dynamic";
