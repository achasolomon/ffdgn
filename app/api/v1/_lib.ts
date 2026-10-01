import { NextResponse } from "next/server";
import type { Committee, ForumEvent, KnowledgeDoc, Member } from "@prisma/client";
import { db, dbReady } from "@/lib/db";
import { AuthError } from "@/lib/server-auth";
import { committees, documents, events, members, news, partnerships } from "@/lib/data";

/* ————— Response envelope (§28): predictable, typed, versionable ————— */
export function ok(data: unknown, meta?: unknown) {
  return NextResponse.json({ status: "success", data, meta: meta ?? null, errors: null });
}
export function fail(code: string, message: string, status: number) {
  return NextResponse.json({ status: "error", data: null, errors: [{ code, message }] }, { status });
}
export function failFrom(e: unknown) {
  if (e instanceof AuthError) return fail(e.code, e.message, e.status);
  console.error("[api]", e);
  return fail("SERVER_ERROR", "An unexpected error occurred.", 500);
}

export function paging(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.min(50, Math.max(1, Number(url.searchParams.get("per_page") ?? 20)));
  return { page, perPage, q: (url.searchParams.get("q") ?? "").trim() };
}

export function pageOf<T>(items: T[], page: number, perPage: number) {
  const total = items.length;
  return ok(items.slice((page - 1) * perPage, page * perPage), {
    page, per_page: perPage, total, total_pages: Math.max(1, Math.ceil(total / perPage)),
  });
}

/* ————— Prisma → public API shape (matches lib/types.ts) ————— */
type MemberRow = Member & { service: { office: string; state: string; startYear: number; endYear: number }[] };

export function toPublicMember(m: MemberRow) {
  return {
    slug: m.slug, name: m.fullName, title: m.title, state: m.state, region: m.region,
    category: m.category, status: m.status,
    service: m.service.map((s) => ({ office: s.office, state: s.state, startYear: s.startYear, endYear: s.endYear })),
    committees: [], leadershipRole: m.leadershipRole ?? undefined,
    bio: m.bio ?? "", visibility: m.visibility, publications: [], events: [],
  };
}

type EventRow = ForumEvent & { programme: { slotTime: string; session: string; speaker: string | null }[] };

export function toPublicEvent(e: EventRow) {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    slug: e.slug, title: e.title, theme: e.theme, kind: e.kind,
    startDate: iso(new Date(e.startDate)), endDate: iso(new Date(e.endDate)),
    venue: e.venue, city: e.city, status: e.status, summary: e.summary,
    programme: e.programme.map((p) => ({ time: p.slotTime, session: p.session, speaker: p.speaker ?? undefined })),
    speakers: [], documents: [], gallery: [],
  };
}

export function toPublicDoc(d: KnowledgeDoc) {
  const iso = (x: Date | null) => (x ? new Date(x).toISOString().slice(0, 10) : "");
  return {
    slug: d.slug, title: d.title, type: d.type.replace(/_/g, " "), status: d.status.replace(/_/g, " "),
    published: iso(d.publishedOn), author: d.author, topic: d.topic, year: d.year,
    committee: d.committee ?? undefined, pages: d.pages, size: d.sizeLabel,
    summary: d.summary, visibility: d.visibility, downloads: d.downloads,
  };
}

export { committees, documents, events, members, news, partnerships, db, dbReady };
export type { Committee };
