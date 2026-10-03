import { formText } from "./cms-validation";

const TYPES = ["Policy Brief", "Communiqué", "Report", "Position Paper", "Research", "Speech", "Presentation", "Briefing Note", "Governance Document"] as const;
const VISIBILITIES = ["PUBLIC", "MEMBERS_ONLY", "COMMITTEE_ONLY", "SECRETARIAT_ONLY", "PRIVATE"] as const;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface DocumentInput {
  slug?: string; title?: string; type?: string; author?: string; topic?: string; year?: number;
  committee?: string; eventSlug?: string; pages?: number; sizeLabel?: string;
  summary?: string; visibility?: string; fileUrl?: string;
}

export function parseDocumentInput(raw: unknown, slugRequired: boolean) {
  const input = (raw ?? {}) as DocumentInput;
  const slug = formText(input.slug);
  const title = formText(input.title);
  const type = formText(input.type);
  const author = formText(input.author);
  const topic = formText(input.topic);
  const year = input.year ?? 0;
  const committee = formText(input.committee);
  const eventSlug = formText(input.eventSlug);
  const pages = input.pages ?? 0;
  const sizeLabel = formText(input.sizeLabel);
  const summary = formText(input.summary);
  const visibility = formText(input.visibility) || "SECRETARIAT_ONLY";
  const fileUrl = formText(input.fileUrl);

  if (slugRequired && (!SLUG.test(slug) || slug.length > 128)) return { error: "Slug must use lowercase letters, numbers, and hyphens." };
  if (!title || title.length > 255) return { error: "Title is required (max 255 characters)." };
  if (!(TYPES as readonly string[]).includes(type)) return { error: "Choose a valid document type." };
  if (!author || author.length > 192 || !topic || topic.length > 128) return { error: "Author and topic are required." };
  if (!Number.isInteger(year) || year < 1800 || year > 2200) return { error: "Enter a valid publication year." };
  if (committee.length > 128 || (eventSlug && !SLUG.test(eventSlug))) return { error: "Committee or event link is invalid." };
  if (!Number.isInteger(pages) || pages < 0 || pages > 10000) return { error: "Pages must be a non-negative whole number." };
  if (!sizeLabel || sizeLabel.length > 32 || !summary || summary.length > 10000) return { error: "File size label and summary are required." };
  if (!(VISIBILITIES as readonly string[]).includes(visibility)) return { error: "Choose a valid access level." };
  if (fileUrl && !/^\/(?!\/)[^\r\n]*$/.test(fileUrl)) return { error: "Document file must be a same-site media path." };

  return { value: { slug, title, type, author, topic, year, committee: committee || null, eventSlug, pages, sizeLabel, summary, visibility, fileUrl: fileUrl || null } };
}