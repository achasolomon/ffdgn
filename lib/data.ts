import type { Committee, ForumEvent, KnowledgeDoc, LeadershipSeat, Member, NewsItem, Partnership, TimelineEntry } from "./types";

/* ————————————————— Institutional metrics (CMS-driven, §7.04) ————————————————— */
export const metrics = [
  { value: "18+", label: "Years of Institutional Experience", href: "/about/history" },
  { value: "36", label: "States Represented", href: "/members" },
  { value: "248+", label: "Former Deputy Governors", href: "/members" },
  { value: "186", label: "Institutional Publications", href: "/knowledge" },
];

/* ————————————————— Leadership hierarchy (§9) ————————————————— */
export const leadership: LeadershipSeat[] = [
  { role: "Grand Patron", tier: 0, memberSlug: "goodluck-jonathan", remit: "Custodian of the Forum's values and continuity." },
  { role: "National Chairman", tier: 1, memberSlug: "chris-akomas", remit: "Presides over the Forum and its national engagements." },
  { role: "Deputy National Chairman (North)", tier: 2, memberSlug: "mukhtar-anka", remit: "Coordinates the Forum across the northern states." },
  { role: "Deputy National Chairman (South)", tier: 2, memberSlug: "hazeem-gbolarumi", remit: "Coordinates the Forum across the southern states." },
  { role: "National Treasurer", tier: 2, memberSlug: "pauline-tallen", remit: "Stewardship of Forum resources." },
  { role: "Chairman, Board of Trustees", tier: 2, memberSlug: "abdulmalik-mahood", remit: "Guardianship of mandate and governance." },
  { role: "National Patron", tier: 0, memberSlug: "abdullahi-ganduje", remit: "Counsel and support to the Forum." },
  { role: "National Patron", tier: 0, memberSlug: "aliyu-wamakko", remit: "Counsel and support to the Forum." },
];

/* ————————————————— Members (institutional database, §15) ————————————————— */
export const members: Member[] = [
  {
    slug: "atim-tyonongu", name: "H.E. Atim Tyonongu", title: "Former Deputy Governor", state: "Benue",
    region: "North-Central", category: "Former", status: "Active",
    service: [{ office: "Deputy Governor", state: "Benue", startYear: 2011, endYear: 2019 }],
    committees: ["policy-governance", "mentorship"], leadershipRole: "Forum President",
    bio: "Served two terms as Deputy Governor of Benue State with a focus on education financing and intergovernmental coordination. Chairs the Forum's policy dialogue series.",
    visibility: "PUBLIC", publications: ["state-federal-cooperation-2025", "end-of-term-governance-2024"],
    events: ["national-conference-2025", "national-conference-2024"],
  },
  {
    slug: "hafsat-balewa", name: "H.E. Hafsat Balewa", title: "Former Deputy Governor", state: "Kaduna",
    region: "North-West", category: "Former", status: "Active",
    service: [{ office: "Deputy Governor", state: "Kaduna", startYear: 2007, endYear: 2015 }],
    committees: ["peer-review", "mentorship"], leadershipRole: "Vice President",
    bio: "Public-health physician; led state primary-healthcare reform and now coordinates the Forum's peer-review mechanism.",
    visibility: "PUBLIC", publications: ["primary-healthcare-peer-review-2024"], events: ["national-conference-2025"],
  },
  {
    slug: "eze-okonkwo", name: "Prof. Eze Okonkwo", title: "Former Deputy Governor", state: "Enugu",
    region: "South-East", category: "Former", status: "Active",
    service: [{ office: "Deputy Governor", state: "Enugu", startYear: 2015, endYear: 2023 }],
    committees: ["policy-governance", "research"], leadershipRole: "Secretary General",
    bio: "Professor of public administration; editor of the Forum's governance research series.",
    visibility: "PUBLIC", publications: ["subnational-finance-2025"], events: ["national-conference-2024"],
  },
  {
    slug: "funke-ajayi", name: "H.E. Funke Ajayi", title: "Former Deputy Governor", state: "Ondo",
    region: "South-West", category: "Former", status: "Active",
    service: [{ office: "Deputy Governor", state: "Ondo", startYear: 2017, endYear: 2024 }],
    committees: ["partnerships"], leadershipRole: "Treasurer",
    bio: "Chartered accountant; oversees Forum partnerships and fiscal transparency work.",
    visibility: "PUBLIC", publications: [], events: ["national-conference-2025"],
  },
  {
    slug: "sule-lamido-jnr", name: "Rt. Hon. Sule Lamido Jnr", title: "Former Deputy Governor", state: "Jigawa",
    region: "North-West", category: "Former", status: "Active",
    service: [{ office: "Deputy Governor", state: "Jigawa", startYear: 2007, endYear: 2015 }],
    committees: ["governance"], leadershipRole: "Chair, Board of Trustees",
    bio: "Former Speaker and Deputy Governor; custodian of the Forum's governance instruments.",
    visibility: "PUBLIC", publications: [], events: ["national-conference-2024"],
  },
  {
    slug: "grand-patron", name: "H.E. Elder Statesman (Grand Patron)", title: "Grand Patron", state: "Federal",
    region: "North-Central", category: "Former", status: "Honorary",
    service: [{ office: "Deputy Governor", state: "Plateau", startYear: 1999, endYear: 2007 }],
    committees: [], bio: "Founding figure of the Forum; Grand Patron and symbol of institutional continuity.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "ngozi-eze", name: "H.E. Ngozi Eze", title: "Serving Deputy Governor (Associate)", state: "Abia",
    region: "South-East", category: "Serving", status: "Associate",
    service: [{ office: "Deputy Governor", state: "Abia", startYear: 2023, endYear: 2027 }],
    committees: ["mentorship"], bio: "Associate member; participates in mentorship and dialogue platforms.",
    visibility: "PUBLIC", publications: [], events: ["national-conference-2025"],
  },
  {
    slug: "ibrahim-dambo", name: "H.E. Ibrahim Dambo", title: "Former Deputy Governor", state: "Borno",
    region: "North-East", category: "Former", status: "Active",
    service: [{ office: "Deputy Governor", state: "Borno", startYear: 2011, endYear: 2019 }],
    committees: ["peer-review"], bio: "Led post-crisis reconstruction coordination; contributes to peer-review on resilience.",
    visibility: "PUBLIC", publications: [], events: ["national-conference-2024"],
  },
  // Verified leadership (fallback mirror of CMS; states marked — are unconfirmed).
  {
    slug: "chris-akomas", name: "H.E. Dr Chris Alozie Akomas", title: "Former Deputy Governor", state: "Abia",
    region: "South-East", category: "Former", status: "Active",
    service: [], committees: [], leadershipRole: "National Chairman",
    photo: "/assets/leadership/chris-akomas.jpeg",
    bio: "Former Deputy Governor of Abia State and National Chairman of the Forum.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "mukhtar-anka", name: "H.E. Mukhtar Ahmed Anka", title: "Former Deputy Governor", state: "—",
    region: "North-West", category: "Former", status: "Active",
    service: [], committees: [], leadershipRole: "Deputy National Chairman (North)",
    photo: "/assets/leadership/mukhtar-anka.jpeg",
    bio: "Deputy National Chairman (North) of the Forum.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "hazeem-gbolarumi", name: "H.E. Hazeem Gbolarumi", title: "Former Deputy Governor", state: "—",
    region: "South-West", category: "Former", status: "Active",
    service: [], committees: [], leadershipRole: "Deputy National Chairman (South)",
    photo: "/assets/leadership/hazeem-gbolarumi.jpeg",
    bio: "Deputy National Chairman (South) of the Forum.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "pauline-tallen", name: "H.E. Dame Pauline Tallen, OFR, CON", title: "Former Deputy Governor", state: "Plateau",
    region: "North-Central", category: "Former", status: "Active",
    service: [{ office: "Deputy Governor", state: "Plateau", startYear: 2007, endYear: 2011 }],
    committees: [], leadershipRole: "National Treasurer",
    photo: "/assets/leadership/pauline-tallen.jpeg",
    bio: "Former Deputy Governor of Plateau State and former Minister of Women Affairs. National Treasurer of the Forum.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "abdulmalik-mahood", name: "H.E. Abdulmalik Mahood", title: "Former Deputy Governor", state: "—",
    region: "North-Central", category: "Former", status: "Active",
    service: [], committees: [], leadershipRole: "Chairman, Board of Trustees",
    photo: "/assets/leadership/abdulmalik-mahood.jpeg",
    bio: "Chairman of the Board of Trustees of the Forum.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "goodluck-jonathan", name: "H.E. Dr Goodluck Ebele Jonathan, GCFR", title: "Former President, Federal Republic of Nigeria", state: "Bayelsa",
    region: "South-South", category: "Former", status: "Honorary",
    service: [], committees: [],
    bio: "Former President of Nigeria and Grand Patron of the Forum.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "aliyu-wamakko", name: "H.E. Sen. Aliyu M. Wamakko, CON", title: "Former Governor", state: "Sokoto",
    region: "North-West", category: "Former", status: "Honorary",
    service: [], committees: [],
    bio: "Former Governor of Sokoto State and National Patron of the Forum.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "abdullahi-ganduje", name: "H.E. Dr Abdullahi Umar Ganduje, CON", title: "Former Governor", state: "Kano",
    region: "North-West", category: "Former", status: "Honorary",
    service: [], committees: [],
    bio: "Former Governor of Kano State and National Patron of the Forum.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "aminu-masari", name: "H.E. Rt. Hon. Aminu Bello Masari, CFR", title: "Former Governor", state: "Katsina",
    region: "North-West", category: "Former", status: "Honorary",
    service: [], committees: [],
    bio: "Former Governor of Katsina State and Chairman of the 5th National Conference.",
    visibility: "PUBLIC", publications: [], events: [],
  },
  {
    slug: "ifeanyi-okowa", name: "H.E. Sen. Ifeanyi Okowa, CON", title: "Former Governor", state: "Delta",
    region: "South-South", category: "Former", status: "Honorary",
    service: [], committees: [],
    bio: "Former Governor of Delta State and Chairman of the 5th National Conference.",
    visibility: "PUBLIC", publications: [], events: [],
  },
];

/* ————————————————— Events / Conference engine (§13–14) ————————————————— */
export const events: ForumEvent[] = [
  {
    slug: "fifth-national-conference-2026", title: "5th National Conference 2026",
    theme: "Rethinking Nation-Building: Bridging the Leadership-Citizenship Disconnect Through Orientation, Attitude, Character, Culture and Tradition for Sustainable Development",
    kind: "Annual Conference", startDate: "2026-10-20", endDate: "2026-10-21",
    venue: "Abuja Continental Hotel", city: "Abuja, FCT", status: "Upcoming",
    summary: "The Forum's fifth national conference. Enquiries: 0803 301 3624 · 0916 894 2222 · annualconference@ffdgn.org.ng",
    programme: [
      { time: "Day 1 · 09:00", session: "Opening plenary and goodwill messages" },
      { time: "Day 1 · 11:00", session: "Keynote address — Prof. Jerry Gana, CON" },
      { time: "Day 1 · 13:00", session: "Thematic sessions" },
      { time: "Day 2 · 09:00", session: "Syndicate discussions and recommendations" },
      { time: "Day 2 · 15:00", session: "Communiqué presentation and closing" },
    ],
    speakers: [], documents: [], gallery: [],
    communique: undefined, coverUrl: "/assets/events/conference.png",
    guests: [
      "H.E. Dr Goodluck Ebele Jonathan, GCFR — Grand Patron",
      "H.E. Sen. Aliyu M. Wamakko, CON — National Patron",
      "H.E. Dr Abdullahi Umar Ganduje, CON — National Patron",
      "H.E. Rt. Hon. Aminu Bello Masari, CFR — Conference Chairman",
      "H.E. Sen. Ifeanyi Okowa, CON — Conference Chairman",
      "Prof. Jerry Gana, CON — Keynote Speaker",
    ],
  },
  {
    slug: "national-conference-2025", title: "FFDGN National Leadership Roundtable 2025",
    theme: "Strengthening Institutions. Building Trust. Securing Nigeria's Future.",
    kind: "Roundtable", startDate: "2025-11-12", endDate: "2025-11-14",
    venue: "Transcorp Hilton", city: "Abuja", status: "Past",
    summary: "High-level dialogue on institutional trust, fiscal federalism and shared prosperity.",
    programme: [
      { time: "09:00", session: "Opening & goodwill messages" },
      { time: "10:30", session: "Governance, Growth and Shared Prosperity" },
      { time: "14:00", session: "Closed peer-review session" },
    ],
    speakers: ["atim-tyonongu", "hafsat-balewa"],
    documents: ["national-conference-communique-2025"], gallery: [],
    communique: "national-conference-communique-2025", coverUrl: "/assets/events/national-conference-2025.jpg",
  },
  {
    slug: "national-conference-2024", title: "FFDGN National Conference 2024",
    theme: "Renewed Hope: Strengthening Governance, Driving Sustainable Development",
    kind: "Annual Conference", startDate: "2024-11-12", endDate: "2024-11-14",
    venue: "Transcorp Hilton", city: "Abuja", status: "Past",
    summary: "Institutional reforms, stronger state–federal collaboration and human-capital investment.",
    programme: [
      { time: "09:00", session: "Opening plenary" },
      { time: "11:00", session: "Subnational finance" },
    ],
    speakers: ["eze-okonkwo", "atim-tyonongu"],
    documents: ["end-of-term-governance-2024"], gallery: [],
    coverUrl: "/assets/events/3rd-annual-conference.jpg",
  },
];

/* ————————————————— Knowledge Centre (§11) ————————————————— */
export const documents: KnowledgeDoc[] = [
  {
    slug: "national-conference-communique-2025", title: "2025 National Conference Communiqué",
    type: "Communiqué", status: "Published", published: "2025-11-15", author: "FFDGN Secretariat",
    topic: "Governance & Development", year: 2025, event: "national-conference-2025",
    pages: 8, size: "2.4 MB", summary: "Official outcomes and resolutions of the 2025 National Leadership Roundtable.",
    visibility: "PUBLIC", downloads: 1840,
  },
  {
    slug: "state-federal-cooperation-2025", title: "Policy Brief No. 18: State-Level Economic Governance and Development",
    type: "Policy Brief", status: "Published", published: "2025-06-02", author: "Policy & Governance Committee",
    topic: "Fiscal Federalism", year: 2025, committee: "policy-governance", event: "fifth-national-conference-2026",
    pages: 14, size: "1.1 MB", summary: "Evidence-based recommendations on state–federal fiscal coordination.",
    visibility: "PUBLIC", downloads: 2310,
  },
  {
    slug: "end-of-term-governance-2024", title: "End-of-Term Governance Report 2024",
    type: "Report", status: "Published", published: "2024-08-15", author: "Research Unit",
    topic: "Institutional Memory", year: 2024, pages: 64, size: "6.8 MB",
    summary: "Continuity, handover practice and advancing governance — lessons from service.",
    visibility: "PUBLIC", downloads: 3120,
  },
  {
    slug: "primary-healthcare-peer-review-2024", title: "Peer Review: Primary Healthcare Delivery (2024 Cycle)",
    type: "Research", status: "Published", published: "2024-04-20", author: "Peer Review Committee",
    topic: "Health Systems", year: 2024, committee: "peer-review",
    pages: 32, size: "3.2 MB", summary: "Independent review of state primary-healthcare programmes.",
    visibility: "MEMBERS_ONLY", downloads: 640,
  },
  {
    slug: "subnational-finance-2025", title: "Subnational Finance & Accountability Study",
    type: "Research", status: "Institutional Review", published: "2025-09-01", author: "Research Unit",
    topic: "Public Finance", year: 2025, pages: 48, size: "4.0 MB",
    summary: "Under institutional review —due for approval before publication.",
    visibility: "COMMITTEE_ONLY", downloads: 0,
  },
];

/* ————————————————— News & Media (§21) ————————————————— */
export const news: NewsItem[] = [
  {
    slug: "state-federal-collaboration-call", title: "FFDGN Calls for Stronger State-Federal Collaboration on National Development",
    category: "News", date: "2026-05-12", location: "Abuja",
    excerpt: "Forum emphasizes collaborative governance, policy coherence and institutional strengthening as pathways to sustainable development.",
    body: ["The Forum of Former Deputy Governors of Nigeria has called for deeper state–federal collaboration…", "Speaking through its Secretariat, the Forum said policy coherence…"],
    relatedEvent: "fifth-national-conference-2026", relatedDocs: ["state-federal-cooperation-2025"], official: true,
  },
  {
    slug: "polish-nigeria-partnership", title: "FFDGN Partners with Polish-Nigeria Business Council",
    category: "Press Release", date: "2025-09-10", location: "Abuja",
    excerpt: "Structured cooperation on economic ties, knowledge exchange and sustainable growth.",
    body: ["The Forum has formalised a structured partnership with the Polish-Nigeria Business Council…"],
    official: true,
  },
  {
    slug: "strategic-meeting-2025", title: "Forum Holds Strategic Meeting on National Development",
    category: "News", date: "2025-08-28", location: "Abuja",
    excerpt: "Leadership reviewed the policy calendar and conference intelligence cycle.",
    body: ["The meeting reviewed preparations for the Annual Conference…"], official: true,
  },
  {
    slug: "2024-communique-publication", title: "Publication of 2024 Communiqué Now Available",
    category: "Statement", date: "2025-08-15", location: "Abuja",
    excerpt: "The official 2024 conference outcomes are now available in the Knowledge Centre.",
    body: ["Members of the public and researchers can now access…"],
    relatedDocs: ["end-of-term-governance-2024"], official: true,
  },
];

/* ————————————————— Committees (§18) ————————————————— */
export const committees: Committee[] = [
  { slug: "policy-governance", name: "Policy & Governance Committee", mandate: "Turns experience into practical policy solutions and recommendations.", chair: "eze-okonkwo", members: ["atim-tyonongu", "eze-okonkwo", "sule-lamido-jnr"], meetings: 14, documents: ["state-federal-cooperation-2025"], status: "Standing" },
  { slug: "peer-review", name: "Peer Review Committee", mandate: "Independent review of national and subnational programmes.", chair: "hafsat-balewa", members: ["hafsat-balewa", "ibrahim-dambo"], meetings: 9, documents: ["primary-healthcare-peer-review-2024"], status: "Standing" },
  { slug: "mentorship", name: "Mentorship & Capacity Building", mandate: "Guides the next generation of public leaders.", chair: "hafsat-balewa", members: ["hafsat-balewa", "atim-tyonongu", "ngozi-eze"], meetings: 6, documents: [], status: "Active" },
  { slug: "research", name: "Research & Knowledge", mandate: "Builds the Forum's lasting knowledge base.", chair: "eze-okonkwo", members: ["eze-okonkwo"], meetings: 11, documents: ["subnational-finance-2025"], status: "Standing" },
  { slug: "partnerships", name: "Strategic Partnerships", mandate: "Structured collaborations for broader impact.", chair: "funke-ajayi", members: ["funke-ajayi"], meetings: 5, documents: [], status: "Active" },
];

/* ————————————————— Partnerships (§20) ————————————————— */
export const partnerships: Partnership[] = [
  { slug: "polish-nigeria-business-council", name: "Polish-Nigeria Business Council", type: "Economic Cooperation", since: 2025, purpose: "Building stronger economic ties and creating opportunities for sustainable growth.", cooperation: ["Trade & investment dialogue", "Knowledge exchange", "Conference participation"], events: ["national-conference-2025"] },
  { slug: "african-union-ecosocc", name: "African Union (ECOSOCC)", type: "Institutional", since: 2023, purpose: "Continental governance dialogue and peer learning.", cooperation: ["Governance convenings", "Policy exchange"], events: [] },
  { slug: "undp-nigeria", name: "UNDP Nigeria", type: "Development", since: 2022, purpose: "Support for institutional strengthening and development research.", cooperation: ["Research", "Capacity building"], events: ["national-conference-2024"] },
  { slug: "world-bank", name: "World Bank", type: "Knowledge", since: 2021, purpose: "Subnational governance data and development financing insight.", cooperation: ["Data", "Dialogue"], events: [] },
  { slug: "ecowas", name: "ECOWAS", type: "Regional", since: 2020, purpose: "Regional democratic governance and peer exchange.", cooperation: ["Regional convenings"], events: [] },
];

/* ————————————————— Institutional memory timeline (§10/57) ————————————————— */
export const timeline: TimelineEntry[] = [
  { year: 2008, title: "Inaugural Meeting & Forum Establishment", summary: "Founding convening of former Deputy Governors; mandate adopted.", links: [{ label: "About the Forum", href: "/about" }] },
  { year: 2012, title: "National Dialogue on State Governance", summary: "First structured policy dialogue; early communiqués archived.", links: [{ label: "Knowledge Centre", href: "/knowledge" }] },
  { year: 2016, title: "Institutional Strengthening Initiative", summary: "Committees formalised; peer-review mechanism piloted.", links: [{ label: "Committees", href: "/committees" }] },
  { year: 2020, title: "Policy Dialogue Series & Publications", summary: "Standing research output begins; reports and briefs published.", links: [{ label: "Publications", href: "/knowledge" }] },
  { year: 2024, title: "Strategic Plan: Leadership, Legacy", summary: "Legacy framework and conference intelligence cycle adopted.", links: [{ label: "2024 Conference", href: "/events/national-conference-2024" }] },
  { year: 2026, title: "Digital Institution Launched", summary: "Public website, member portal and secretariat console unified.", links: [{ label: "5th National Conference 2026", href: "/events/fifth-national-conference-2026" }] },
];

export const roles = [
  { slug: "policy-governance", title: "Institutional Dialogue", text: "Facilitating confidential, constructive conversations that shape better governance across the federation." },
  { slug: "policy-experience", title: "Policy & Experience", text: "Turning years of executive experience into practical, evidence-based policy solutions." },
  { slug: "peer-review", title: "Peer Review", text: "Promoting accountability through independent review of programmes and initiatives." },
  { slug: "mentorship", title: "Mentorship", text: "Supporting the next generation of public servants with wisdom and insight." },
  { slug: "research", title: "Research & Knowledge", text: "Building a lasting institutional knowledge base for Nigeria." },
  { slug: "partnerships", title: "Strategic Partnerships", text: "Creating collaborations that advance good governance and sustainable development." },
];

/* ————— Lookups ————— */
export const getMember = (slug: string) => members.find((m) => m.slug === slug);
export const getEvent = (slug: string) => events.find((e) => e.slug === slug);
export const getDoc = (slug: string) => documents.find((d) => d.slug === slug);
export const getNews = (slug: string) => news.find((n) => n.slug === slug);
export const getCommittee = (slug: string) => committees.find((c) => c.slug === slug);
export const memberName = (slug: string) => members.find((m) => m.slug === slug)?.name ?? slug;
