"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, FileText, Save, Send } from "lucide-react";
import { useAdminApi } from "./admin-client";

type Meeting = { id: string; title: string; startsAt: string; location: string; agenda: string; minutes: string | null; organizer: string };
type Recommendation = { id: string; title: string; rationale: string; recommendation: string; status: string; author: string; own: boolean; updatedAt: string };
type Committee = { slug: string; name: string; mandate: string; manages: boolean; meetings: Meeting[]; recommendations: Recommendation[] };

const field = "w-full border border-[#d6ded6] bg-white px-3 py-2.5 text-[13px] focus:border-[#31774d] focus:outline-none";

export function PortalCommitteeWorkspace() {
  const api = useAdminApi();
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [meetingForm, setMeetingForm] = useState<Record<string, { title: string; startsAt: string; location: string; agenda: string }>>({});
  const [recommendationForm, setRecommendationForm] = useState<Record<string, { title: string; rationale: string; recommendation: string }>>({});
  const [minutes, setMinutes] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch("/api/v1/portal/committees", { cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.errors?.[0]?.message ?? "Committee workspaces unavailable.");
    setCommittees(Array.isArray(payload?.data) ? payload.data : []);
  }

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      try { await load(); }
      catch (failure) { if (active) setError(failure instanceof Error ? failure.message : "Committee workspaces unavailable."); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, []);

  async function createMeeting(event: React.FormEvent<HTMLFormElement>, committee: Committee) {
    event.preventDefault(); setBusy(`meeting:${committee.slug}`); setError("");
    const form = meetingForm[committee.slug];
    try {
      await api(`/api/v1/portal/committees/${encodeURIComponent(committee.slug)}/meetings`, "POST", { ...form, startsAt: new Date(form.startsAt).toISOString() });
      setMeetingForm((current) => ({ ...current, [committee.slug]: { title: "", startsAt: "", location: "", agenda: "" } })); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not schedule meeting."); }
    finally { setBusy(""); }
  }

  async function createRecommendation(committee: Committee, submit: boolean) {
    setBusy(`recommendation:${committee.slug}`); setError("");
    const form = recommendationForm[committee.slug];
    try {
      await api(`/api/v1/portal/committees/${encodeURIComponent(committee.slug)}/recommendations`, "POST", { ...form, submit });
      setRecommendationForm((current) => ({ ...current, [committee.slug]: { title: "", rationale: "", recommendation: "" } })); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save recommendation."); }
    finally { setBusy(""); }
  }

  async function saveMinutes(meetingId: string) {
    setBusy(`minutes:${meetingId}`); setError("");
    try { await api(`/api/v1/portal/meetings/${encodeURIComponent(meetingId)}`, "PATCH", { minutes: minutes[meetingId] ?? "" }); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save minutes."); }
    finally { setBusy(""); }
  }

  async function transition(id: string, to: string) {
    setBusy(`transition:${id}`); setError("");
    try { await api(`/api/v1/portal/recommendations/${encodeURIComponent(id)}`, "PATCH", { to }); await load(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update recommendation."); }
    finally { setBusy(""); }
  }

  if (loading) return <p className="border border-[#dce2dc] bg-white px-5 py-10 text-center text-sm text-[#718077]">Loading committee workspaces…</p>;
  return <div className="space-y-5">
    {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-800">{error}</p>}
    {!committees.length && <p className="border border-[#dce2dc] bg-white px-5 py-12 text-center text-sm text-[#718077]">No committee workspaces are linked to your account.</p>}
    {committees.map((committee) => <section key={committee.slug} className="border border-[#dce2dc] bg-white">
      <header className="border-b border-[#e7ece7] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5b8065]">Committee workspace</p><h2 className="mt-1 text-lg font-semibold text-[#20372a]">{committee.name}</h2><p className="mt-1 text-[13px] text-[#627067]">{committee.mandate}</p></header>
      <div className="grid gap-6 p-5 xl:grid-cols-2">
        <div>
          <div className="flex items-center gap-2"><CalendarPlus size={15} className="text-[#4e7959]" /><h3 className="text-[13px] font-bold text-[#2a3e30]">Meetings</h3></div>
          {!committee.meetings.length ? <p className="mt-3 text-[12px] text-[#7d887f]">No meetings recorded.</p> : <ul className="mt-3 divide-y divide-[#edf0ed] border-y border-[#e7ece7]">{committee.meetings.map((meeting) => <li key={meeting.id} className="py-3"><p className="text-[13px] font-semibold text-[#2a3e30]">{meeting.title}</p><p className="mt-1 text-[11px] text-[#778379]">{new Date(meeting.startsAt).toLocaleString()} · {meeting.location} · {meeting.organizer}</p><p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-[#59675d]">{meeting.agenda}</p>{committee.manages && <div className="mt-3"><label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.09em] text-[#778379]" htmlFor={`minutes-${meeting.id}`}>Minutes</label><textarea id={`minutes-${meeting.id}`} rows={3} className={field} value={minutes[meeting.id] ?? meeting.minutes ?? ""} onChange={(event) => setMinutes((current) => ({ ...current, [meeting.id]: event.target.value }))} /><button type="button" onClick={() => saveMinutes(meeting.id)} disabled={busy === `minutes:${meeting.id}`} className="mt-2 inline-flex items-center gap-1.5 border border-[#cbd8cd] px-3 py-1.5 text-[11px] font-semibold text-[#28543a] disabled:opacity-50"><Save size={12} />Save minutes</button></div>}{meeting.minutes && !committee.manages && <p className="mt-2 whitespace-pre-wrap border-l-2 border-[#d8e5da] pl-3 text-[12px] text-[#657168]">{meeting.minutes}</p>}</li>)}</ul>}
          {committee.manages && <form onSubmit={(event) => createMeeting(event, committee)} className="mt-4 grid gap-3 border border-[#e1e8e1] bg-[#f8faf7] p-4"><h4 className="text-[12px] font-bold text-[#34483a]">Schedule meeting</h4><input required maxLength={255} className={field} aria-label="Meeting title" placeholder="Meeting title" value={meetingForm[committee.slug]?.title ?? ""} onChange={(event) => setMeetingForm((current) => ({ ...current, [committee.slug]: { title: event.target.value, startsAt: current[committee.slug]?.startsAt ?? "", location: current[committee.slug]?.location ?? "", agenda: current[committee.slug]?.agenda ?? "" } }))} /><div className="grid gap-2 sm:grid-cols-2"><input required type="datetime-local" className={field} aria-label="Meeting date and time" value={meetingForm[committee.slug]?.startsAt ?? ""} onChange={(event) => setMeetingForm((current) => ({ ...current, [committee.slug]: { title: current[committee.slug]?.title ?? "", startsAt: event.target.value, location: current[committee.slug]?.location ?? "", agenda: current[committee.slug]?.agenda ?? "" } }))} /><input required maxLength={255} className={field} aria-label="Meeting location" placeholder="Location or meeting link" value={meetingForm[committee.slug]?.location ?? ""} onChange={(event) => setMeetingForm((current) => ({ ...current, [committee.slug]: { title: current[committee.slug]?.title ?? "", startsAt: current[committee.slug]?.startsAt ?? "", location: event.target.value, agenda: current[committee.slug]?.agenda ?? "" } }))} /></div><textarea required maxLength={5000} rows={3} className={field} aria-label="Meeting agenda" placeholder="Agenda" value={meetingForm[committee.slug]?.agenda ?? ""} onChange={(event) => setMeetingForm((current) => ({ ...current, [committee.slug]: { title: current[committee.slug]?.title ?? "", startsAt: current[committee.slug]?.startsAt ?? "", location: current[committee.slug]?.location ?? "", agenda: event.target.value } }))} /><button disabled={busy === `meeting:${committee.slug}`} className="justify-self-start bg-[#174b31] px-3.5 py-2 text-[11px] font-semibold text-white disabled:opacity-50">{busy === `meeting:${committee.slug}` ? "Saving…" : "Schedule meeting"}</button></form>}
        </div>

        <div>
          <div className="flex items-center gap-2"><FileText size={15} className="text-[#4e7959]" /><h3 className="text-[13px] font-bold text-[#2a3e30]">Recommendations</h3></div>
          {!committee.recommendations.length ? <p className="mt-3 text-[12px] text-[#7d887f]">No recommendations recorded.</p> : <ul className="mt-3 divide-y divide-[#edf0ed] border-y border-[#e7ece7]">{committee.recommendations.map((item) => <li key={item.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[13px] font-semibold text-[#2a3e30]">{item.title}</p><span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#718077]">{item.status.replace(/_/g, " ")}</span></div><p className="mt-1 text-[11px] text-[#778379]">{item.author}</p><p className="mt-2 text-[12px] font-semibold text-[#526358]">Rationale</p><p className="whitespace-pre-wrap text-[12px] text-[#59675d]">{item.rationale}</p><p className="mt-2 text-[12px] font-semibold text-[#526358]">Recommendation</p><p className="whitespace-pre-wrap text-[12px] text-[#59675d]">{item.recommendation}</p><div className="mt-2 flex gap-2">{item.own && item.status === "Draft" && <button type="button" onClick={() => transition(item.id, "Submitted")} className="border border-[#cbd8cd] px-2.5 py-1 text-[10px] font-semibold text-[#28543a]">Submit for review</button>}{committee.manages && item.status === "Submitted" && <button type="button" onClick={() => transition(item.id, "Under_Review")} className="border border-[#cbd8cd] px-2.5 py-1 text-[10px] font-semibold text-[#28543a]">Begin review</button>}{committee.manages && item.status === "Under_Review" && <><button type="button" onClick={() => transition(item.id, "Approved")} className="bg-[#174b31] px-2.5 py-1 text-[10px] font-semibold text-white">Approve</button><button type="button" onClick={() => transition(item.id, "Rejected")} className="border border-[#ead6d6] px-2.5 py-1 text-[10px] font-semibold text-[#964646]">Reject</button></>}</div></li>)}</ul>}
          <form onSubmit={(event) => { event.preventDefault(); void createRecommendation(committee, false); }} className="mt-4 grid gap-3 border border-[#e1e8e1] bg-[#f8faf7] p-4"><h4 className="text-[12px] font-bold text-[#34483a]">New recommendation</h4><input required maxLength={255} className={field} aria-label="Recommendation title" placeholder="Title" value={recommendationForm[committee.slug]?.title ?? ""} onChange={(event) => setRecommendationForm((current) => ({ ...current, [committee.slug]: { title: event.target.value, rationale: current[committee.slug]?.rationale ?? "", recommendation: current[committee.slug]?.recommendation ?? "" } }))} /><textarea required maxLength={10000} rows={3} className={field} aria-label="Rationale" placeholder="Rationale" value={recommendationForm[committee.slug]?.rationale ?? ""} onChange={(event) => setRecommendationForm((current) => ({ ...current, [committee.slug]: { title: current[committee.slug]?.title ?? "", rationale: event.target.value, recommendation: current[committee.slug]?.recommendation ?? "" } }))} /><textarea required maxLength={20000} rows={4} className={field} aria-label="Recommendation" placeholder="Recommended action" value={recommendationForm[committee.slug]?.recommendation ?? ""} onChange={(event) => setRecommendationForm((current) => ({ ...current, [committee.slug]: { title: current[committee.slug]?.title ?? "", rationale: current[committee.slug]?.rationale ?? "", recommendation: event.target.value } }))} /><div className="flex flex-wrap gap-2"><button type="submit" disabled={busy === `recommendation:${committee.slug}`} className="inline-flex items-center gap-1.5 border border-[#cbd8cd] px-3 py-2 text-[11px] font-semibold text-[#28543a] disabled:opacity-50"><Save size={13} />Save draft</button><button type="button" disabled={busy === `recommendation:${committee.slug}`} onClick={(event) => { const form = event.currentTarget.form; if (form?.reportValidity()) void createRecommendation(committee, true); }} className="inline-flex items-center gap-1.5 bg-[#174b31] px-3 py-2 text-[11px] font-semibold text-white disabled:opacity-50"><Send size={13} />Submit</button></div></form>
        </div>
      </div>
    </section>)}
  </div>;
}