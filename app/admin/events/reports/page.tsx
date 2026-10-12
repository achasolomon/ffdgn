import Link from "next/link";
import { conferenceAuth, conferenceError } from "@/lib/conference/server";
import { attendanceFilter, attendanceReport } from "@/lib/conference/reporting";
import { AuthError } from "@/lib/server-auth";
import { ConferenceAttendanceReport } from "@/components/conference-attendance-report";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const query = await searchParams;
  if (!query.event) return <div className="p-8"><h1 className="text-2xl font-semibold">Attendance reporting</h1><Link className="underline" href="/admin/events/operations">Select a conference</Link></div>;
  let result: { title: string; report: Awaited<ReturnType<typeof attendanceReport>>; filter: ReturnType<typeof attendanceFilter> } | undefined, message = "";
  try { const { event } = await conferenceAuth(query.event, "view"); const filter = attendanceFilter(query); result = { title: event.title, report: await attendanceReport(query.event, filter), filter }; }
  catch (error) { const mapped = conferenceError(error); if (mapped instanceof AuthError) message = mapped.message; else throw mapped; }
  if (!result) return <div role="alert" className="p-8">{message}</div>;
  return <div className="mx-auto max-w-6xl space-y-4 px-4 py-5 sm:px-8"><header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Attendance reporting</h1><p className="mt-1 text-sm text-gray-600">{result.title}</p></div><Link className="rounded-lg border bg-white px-3 py-2.5 text-sm font-semibold" href={{ pathname: "/admin/events/operations", query: { event: query.event } }}>Guest desk</Link></header><ConferenceAttendanceReport key={`${query.event}:${JSON.stringify(result.filter)}`} eventId={query.event} initial={result.report} filter={result.filter} /></div>;
}
export const dynamic = "force-dynamic";
