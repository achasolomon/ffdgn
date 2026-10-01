// FFDGN domain model — mirrors §31 / §55 of the blueprint.
// Designed to map 1:1 onto a future Prisma/MySQL schema (see prisma/schema.prisma).

export type Visibility = "PUBLIC" | "MEMBERS_ONLY" | "COMMITTEE_ONLY" | "SECRETARIAT_ONLY" | "PRIVATE";
export type MemberStatus = "Active" | "Associate" | "Honorary" | "Pending";
export type DocType =
  | "Policy Brief" | "Communiqué" | "Report" | "Position Paper"
  | "Research" | "Speech" | "Presentation" | "Briefing Note" | "Governance Document";
export type DocStatus = "Draft" | "Editorial Review" | "Institutional Review" | "Approved" | "Published" | "Archived";

export interface ServiceRecord { office: string; state: string; startYear: number; endYear: number; }
export interface Member {
  slug: string; name: string; title: string; state: string; region: "North-Central"|"North-East"|"North-West"|"South-East"|"South-South"|"South-West";
  category: "Former" | "Serving" | "Secretariat"; status: MemberStatus;
  service: ServiceRecord[]; committees: string[]; leadershipRole?: string;
  photo?: string; bio: string; visibility: Visibility;
  publications: string[]; events: string[];
}
export interface LeadershipSeat { role: string; tier: number; memberSlug: string; remit: string; }
export interface ForumEvent {
  slug: string; title: string; theme: string; kind: "Annual Conference" | "Dialogue" | "Roundtable" | "Workshop" | "Summit";
  startDate: string; endDate: string; venue: string; city: string; status: "Upcoming" | "Ongoing" | "Past";
  summary: string; programme: { time: string; session: string; speaker?: string }[];
  speakers: string[]; documents: string[]; gallery: string[]; communique?: string;
  coverUrl?: string; guests?: string[];
}
export interface KnowledgeDoc {
  slug: string; title: string; type: DocType; status: DocStatus;
  published: string; author: string; topic: string; year: number;
  committee?: string; event?: string; pages: number; size: string;
  summary: string; visibility: Visibility; downloads: number;
  /** Direct link to the publication file, when one has been uploaded. */
  fileUrl?: string;
}
export interface NewsItem {
  slug: string; title: string; category: "News" | "Press Release" | "Statement" | "Media Coverage" | "Speech";
  date: string; location: string; excerpt: string; body: string[];
  image?: string; relatedEvent?: string; relatedDocs?: string[]; official: boolean;
}
export interface Committee {
  slug: string; name: string; mandate: string; chair: string;
  members: string[]; meetings: number; documents: string[]; status: "Active" | "Standing" | "Ad-hoc";
}
export interface Partnership {
  slug: string; name: string; type: string; since: number;
  purpose: string; cooperation: string[]; events: string[]; logo?: string;
}
export interface TimelineEntry { year: number; title: string; summary: string; links: { label: string; href: string }[]; }
