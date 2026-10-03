import { formText } from "./cms-validation";

const EVENT_KINDS = ["Annual Conference", "Dialogue", "Roundtable", "Workshop", "Summit"] as const;
const EVENT_STATUSES = ["Upcoming", "Ongoing", "Past"] as const;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface EventInput {
  slug?: string;
  title?: string;
  theme?: string;
  kind?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  city?: string;
  status?: string;
  summary?: string;
  /**
   * Long-form write-up of what happened, for past events. Optional — an
   * upcoming event has nothing to report yet, so `null` is a valid value here
   * rather than an error.
   */
  highlights?: string;
  coverUrl?: string;
  published?: boolean;
  guests?: string;
  programme?: { time?: string; session?: string; speaker?: string }[];
  speakers?: string[];
  documents?: string[];
}

export function parseEventInput(raw: unknown) {
  const input = (raw ?? {}) as EventInput;
  const slug = formText(input.slug);
  const title = formText(input.title);
  const theme = formText(input.theme);
  const kind = formText(input.kind);
  const status = formText(input.status) || "Upcoming";
  const startDate = formText(input.startDate);
  const endDate = formText(input.endDate);
  const venue = formText(input.venue);
  const city = formText(input.city);
  const summary = formText(input.summary);
  const highlights = formText(input.highlights);
  const coverUrl = formText(input.coverUrl);
  const guests = formText(input.guests);
  const programme = input.programme ?? [];
  const speakers = input.speakers ?? [];
  const documents = input.documents ?? [];

  if (!SLUG.test(slug) || slug.length > 128) return { error: "Slug must use lowercase letters, numbers, and hyphens." };
  if (!title || title.length > 255) return { error: "Title is required (max 255 characters)." };
  if (theme.length > 255) return { error: "Theme must be at most 255 characters." };
  if (!(EVENT_KINDS as readonly string[]).includes(kind)) return { error: "Choose a valid event type." };
  if (!(EVENT_STATUSES as readonly string[]).includes(status)) return { error: "Choose Upcoming, Ongoing, or Past." };
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!datePattern.test(startDate) || Number.isNaN(Date.parse(`${startDate}T00:00:00Z`))) return { error: "Enter a valid start date." };
  if (!datePattern.test(endDate) || Number.isNaN(Date.parse(`${endDate}T00:00:00Z`))) return { error: "Enter a valid end date." };
  if (endDate < startDate) return { error: "End date must be on or after the start date." };
  if (!venue || venue.length > 255 || !city || city.length > 128) return { error: "Venue and city are required." };
  if (!summary || summary.length > 10000) return { error: "Event summary is required (max 10,000 characters)." };
  if (highlights.length > 20000) return { error: "Highlights must be at most 20,000 characters." };
  if (coverUrl && !/^\/(?!\/)[^\r\n]*$/.test(coverUrl)) return { error: "Cover image must be a same-site media path." };
  if (typeof input.published !== "boolean") return { error: "Choose whether this event is published." };
  if (!Array.isArray(programme) || programme.length > 100 || programme.some((slot) => !slot || typeof slot.time !== "string" || typeof slot.session !== "string" || !slot.time.trim() || !slot.session.trim())) return { error: "Programme slots need a time and session title (maximum 100)." };
  if (!Array.isArray(speakers) || speakers.some((memberSlug) => typeof memberSlug !== "string" || !SLUG.test(memberSlug))) return { error: "Speakers must be member slugs." };
  if (!Array.isArray(documents) || documents.some((docSlug) => typeof docSlug !== "string" || !SLUG.test(docSlug))) return { error: "Related documents must be document slugs." };
  if (guests.length > 5000) return { error: "Guest list must be at most 5,000 characters." };

  return {
    value: {
      slug, title, theme, kind, startDate: new Date(`${startDate}T00:00:00Z`),
      endDate: new Date(`${endDate}T00:00:00Z`), venue, city, status: status as (typeof EVENT_STATUSES)[number], summary,
      highlights: highlights || null,
      coverUrl: coverUrl || null, published: input.published, guests: guests || null,
      programme: programme.map((slot) => ({ time: formText(slot.time), session: formText(slot.session), speaker: formText(slot.speaker) || null })),
      speakers: [...new Set(speakers)], documents: [...new Set(documents)],
    },
  };
}