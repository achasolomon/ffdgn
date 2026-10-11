import { db, dbReady } from "./db";
import { TEMPLATE_CONTENT, parseTemplateDocument, templateKey } from "./template-content";
import { isGalleryPhotograph } from "./repo";
export async function cmsStatus() {
  if (!(await dbReady())) return null;
  const [copyRows, publicMembers, publicDocs, assets, events, speakers] = await Promise.all([
    db.siteSetting.findMany({ where: { key: { startsWith: "website.copy.published." } } }),
    db.member.findMany({ where: { visibility: "PUBLIC" }, select: { slug: true, fullName: true, bio: true, photoUrl: true } }),
    db.knowledgeDoc.findMany({ where: { visibility: "PUBLIC", status: "Published" }, select: { slug: true, title: true, fileUrl: true, summary: true } }),
    db.mediaAsset.findMany({ where: { visibility: "PUBLIC" }, select: { id: true, title: true, kind: true, category: true, url: true, altText: true, description: true, inGallery: true, eventId: true } }),
    db.forumEvent.findMany({ select: { slug: true, title: true, status: true, coverUrl: true, highlights: true } }),
    db.speaker.findMany({ where: { visibility: "PUBLIC" }, select: { slug: true, name: true, bio: true, photoUrl: true } }),
  ]);
  const photographs = assets.filter(isGalleryPhotograph);
  return {
    designs: TEMPLATE_CONTENT.length,
    fields: TEMPLATE_CONTENT.reduce((count, definition) => count + definition.fields.length, 0),
    populatedDesigns: TEMPLATE_CONTENT.filter(definition => parseTemplateDocument(definition.id, copyRows.find(row => row.key === templateKey(definition.id, "published"))?.value)).length,
    assets: assets.length,
    issues: [
      { label: "Public member biographies", href: "/admin/membership", items: publicMembers.filter(item => !item.bio?.trim()).map(item => item.fullName) },
      { label: "Public member portraits", href: "/admin/membership", items: publicMembers.filter(item => !item.photoUrl).map(item => item.fullName) },
      { label: "Published publications without files", href: "/admin/knowledge", items: publicDocs.filter(item => !item.fileUrl).map(item => item.title) },
      { label: "Published publication summaries", href: "/admin/knowledge", items: publicDocs.filter(item => !item.summary.trim()).map(item => item.title) },
      { label: "Gallery photographs needing event albums", href: "/admin/media", items: photographs.filter(item => !item.eventId).map(item => item.title) },
      { label: "Event photographs needing captions", href: "/admin/media", items: photographs.filter(item => item.eventId && !item.description?.trim()).map(item => item.title) },
      { label: "Public image descriptions", href: "/admin/media", items: assets.filter(item => item.kind === "IMAGE" && !item.altText?.trim()).map(item => item.title) },
      { label: "Event cover images", href: "/admin/events", items: events.filter(item => !item.coverUrl).map(item => item.title) },
      { label: "Past event outcomes", href: "/admin/events", items: events.filter(item => item.status === "Past" && !item.highlights?.trim()).map(item => item.title) },
      { label: "Speaker biographies", href: "/admin/events/speakers", items: speakers.filter(item => !item.bio?.trim()).map(item => item.name) },
      { label: "Speaker portraits", href: "/admin/events/speakers", items: speakers.filter(item => !item.photoUrl).map(item => item.name) },
    ],
  };
}
