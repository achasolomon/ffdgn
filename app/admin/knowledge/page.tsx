import Link from "next/link";
import { DocRowActions, EditDocumentButton, NewDocumentButton } from "@/components/admin-doc-actions";
import { db, dbReady } from "@/lib/db";
import { getAuth } from "@/lib/server-auth";
import { hasPermission } from "@/lib/auth";
import { DOC_TRANSITIONS, prettyStatus, type DocStatusKey } from "@/lib/workflow";

/**
 * Ordering by pipeline position, not by date: the queue is a work list, so the
 * record that is blocked on the next action has to be visible above one that is
 * already finished. Within a stage, oldest-first means nothing sits unseen.
 */
const STAGE_ORDER: Record<string, number> = {
  Draft: 0,
  Editorial_Review: 1,
  Institutional_Review: 2,
  Approved: 3,
  Published: 4,
  Archived: 5,
};

/** How many rows to show. The pipeline is short; this is a work list, not a report. */
const LIMIT = 60;

export default async function AdminKnowledgePage() {
  const auth = await getAuth();
  // Require any document capability rather than one specific one: publishing,
  // editing, approving and archiving are separate capabilities, and a
  // knowledge_manager legitimately holds edit/publish/archive but not approve.
  const canSee =
    !!auth &&
    (hasPermission(auth.user.role, "documents.view") ||
      hasPermission(auth.user.role, "documents.edit") ||
      hasPermission(auth.user.role, "documents.publish") ||
      hasPermission(auth.user.role, "documents.approve"));

  if (!canSee) {
    return (
      <div className="mx-auto max-w-shell px-5 py-12">
        <p className="eyebrow">Secretariat console</p>
        <h1 className="font-display mt-2 text-3xl text-forest-950">Permission denied</h1>
        <p className="mt-2 text-sm text-ink/60">
          The approval queue requires a document capability. Contact a Secretariat Administrator.
        </p>
        <Link href="/admin" className="mt-4 inline-block text-sm font-semibold text-primary">
          ← Back to console
        </Link>
      </div>
    );
  }

  const live = await dbReady();
  const role = auth!.user.role;

  const [docs, eventSlugs] = live
    ? await Promise.all([db.knowledgeDoc.findMany({
        take: LIMIT,
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        select: {
          slug: true, title: true, status: true, type: true, year: true,
          visibility: true, version: true, updatedAt: true, publishedOn: true,
          author: true, topic: true, committee: true, pages: true, sizeLabel: true,
          summary: true, fileUrl: true, event: { select: { slug: true } },
        },
      }), db.forumEvent.findMany({ orderBy: { startDate: "desc" }, select: { slug: true } })])
    : [[], []];

  // Sorted in JS because `status` is a string enum in MySQL and cannot carry a
  // pipeline order in the query without a CASE expression Prisma cannot express.
  const ordered = [...docs].sort(
    (a, b) => (STAGE_ORDER[a.status] ?? 9) - (STAGE_ORDER[b.status] ?? 9) ||
      b.updatedAt.getTime() - a.updatedAt.getTime(),
  );

  const counts = ordered.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  const inFlight = ordered.filter((d) => d.status !== "Published" && d.status !== "Archived");

  return (
    <div className="mx-auto max-w-[1420px] px-5 py-8 sm:px-8 sm:py-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#56755f]">Publishing / Knowledge</p>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-normal text-[#1c3526]">Knowledge Centre</h1>
      <p className="mt-1 text-[13px] text-[#738077]">Review and publish institutional documents through the approval queue.</p>

      {!live && (
        <p className="mt-4 border border-gold/60 bg-paper px-4 py-3 text-sm" role="note">
          Database unavailable — the approval queue needs MySQL. No workflow actions can be taken
          without it.
        </p>
      )}

      {live && (
        <ol className="mt-6 flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium">
          {Object.keys(STAGE_ORDER).map((s, i, a) => (
            <li key={s} className="flex items-center gap-1.5">
              <span
                className={`border px-2.5 py-1 ${
                  counts[s] ? "border-primary bg-primary text-white" : "bg-paper text-ink/55"
                }`}
              >
                {prettyStatus(s)}
                <span className="ml-1.5 opacity-70">{counts[s] ?? 0}</span>
              </span>
              {i < a.length - 1 && <span aria-hidden className="text-gold-deep">→</span>}
            </li>
          ))}
        </ol>
      )}

      <section className="mt-8" aria-labelledby="queue-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="queue-h" className="font-display text-2xl text-forest-950">
            In the pipeline ({inFlight.length})
          </h2>
          {hasPermission(role, "documents.create") && <NewDocumentButton eventSlugs={eventSlugs.map((event) => event.slug)} />}
          {ordered.length > LIMIT && (
            <p className="text-[13px] text-ink/55">Showing the {LIMIT} most recently touched.</p>
          )}
        </div>

        {ordered.length === 0 ? (
          <p className="mt-4 border hairline bg-white px-5 py-10 text-center text-sm text-ink/60" role="status">
            {live ? "No documents in the pipeline." : "Queue unavailable without a database."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto border hairline bg-white">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b hairline bg-paper text-[11px] uppercase tracking-[0.16em] text-ink/55">
                  <th className="px-5 py-3">Document</th>
                  <th className="px-5 py-3">Stage</th>
                  <th className="px-5 py-3">Visibility</th>
                  <th className="px-5 py-3">Version</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((d) => {
                  const from = d.status as DocStatusKey;
                  // Filter by capability here so the queue never offers an action
                  // this operator's role cannot take.
                  const transitions = (DOC_TRANSITIONS[from] ?? [])
                    .filter((t) => hasPermission(role, t.permission))
                    .map((t) => ({ to: t.to, label: t.label }));
                  return (
                    <tr key={d.slug} className="border-b hairline align-top last:border-0 hover:bg-paper">
                      <td className="px-5 py-3">
                        <span className="font-semibold text-forest-950">{d.title}</span>
                        <span className="block text-[12px] text-ink/55">
                          {prettyStatus(d.type)}
                          {d.year ? ` · ${d.year}` : ""} · v{d.version}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`border px-2 py-0.5 text-[11px] font-semibold ${
                            d.status === "Published" ? "border-primary bg-primary text-white" : "bg-paper text-ink/70"
                          }`}
                        >
                          {prettyStatus(d.status)}
                        </span>
                        {d.publishedOn && (
                          <span className="mt-1 block text-[11.5px] text-ink/55">
                            published {new Date(d.publishedOn).toISOString().slice(0, 10)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[12.5px] text-ink/60">{d.visibility}</td>
                      <td className="px-5 py-3 text-[12.5px] text-ink/60">{d.version}</td>
                      <td className="px-5 py-3">
                        <div className="grid gap-2">
                        {hasPermission(role, "documents.edit") && <EditDocumentButton eventSlugs={eventSlugs.map((event) => event.slug)} document={{
                          slug: d.slug, title: d.title, type: d.type, author: d.author, topic: d.topic,
                          year: d.year, committee: d.committee ?? "", eventSlug: d.event?.slug ?? "",
                          pages: d.pages, sizeLabel: d.sizeLabel, summary: d.summary,
                          visibility: d.visibility, fileUrl: d.fileUrl ?? "",
                        }} />}
                        <DocRowActions
                          doc={{
                            slug: d.slug,
                            title: d.title,
                            status: d.status,
                            type: d.type,
                            year: d.year,
                            visibility: d.visibility,
                            version: d.version,
                            transitions,
                          }}
                        />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10 border hairline bg-paper p-6" aria-labelledby="chain-h">
        <h2 id="chain-h" className="font-display text-xl text-forest-950">Who may do what</h2>
        <ul className="mt-2 space-y-1.5 text-[13px] text-ink/65">
          {Object.entries(DOC_TRANSITIONS).flatMap(([from, edges]) =>
            edges.map((e) => (
              <li key={`${from}-${e.to}`}>
                <code className="text-[12px]">
                  {prettyStatus(from)} → {prettyStatus(e.to)}
                </code>{" "}
                requires <code className="text-[12px]">{e.permission}</code>
              </li>
            )),
          )}
        </ul>
        <p className="mt-3 text-[13px] text-ink/60">
          Transitions outside this table are rejected by the API regardless of what a client sends.
          There is no &ldquo;force publish&rdquo; path: moving a record to a stage it is not ready for
          would make the approval chain decorative.
        </p>
      </section>
    </div>
  );
}
