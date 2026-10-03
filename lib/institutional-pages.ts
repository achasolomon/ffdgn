export interface InstitutionalSectionContent {
  /** Absent for seeded fallback content, which is not editable in place. */
  id?: string;
  title: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  position: number;
  published?: boolean;
}

export interface InstitutionalPageContent {
  slug: "about" | "governance" | "privacy" | "accessibility" | "renewed-hope" | "polish-nigeria";
  title: string;
  eyebrow: string;
  lede: string;
  /**
   * Closing prose, paragraphs split on blank lines. Kept as the page's trailing
   * note rather than the primary content: `sections` is now the structured
   * middle of the page and is what carries imagery.
   */
  body: string;
  sections: InstitutionalSectionContent[];
}

export const INSTITUTIONAL_PAGES: InstitutionalPageContent[] = [
  {
    slug: "about",
    title: "A national forum for experience, dialogue and institutional continuity",
    eyebrow: "The Forum",
    lede: "The Forum of Former Deputy Governors of Nigeria (FFDGN) is a non-partisan organisation of former and serving deputy governors committed to national development through knowledge sharing, policy advocacy, mentorship and strategic partnerships.",
    body: "Provide a structured platform for experience-sharing among former and serving Deputy Governors.\n\nConvert executive experience into evidence-based policy recommendations.\n\nStrengthen democratic governance through peer review, dialogue and mentorship.\n\nPreserve institutional memory through conferences, communiqués, reports and decisions.\n\nBuild strategic partnerships that advance good governance and sustainable development.\n\nMembership cuts across party, region and generation. The Forum speaks as an institution through approved communiqués, reports and statements.\n\nThe Forum is guided by its Grand Patron, former President Dr Goodluck Ebele Jonathan, GCFR, and National Patrons H.E. Sen. Aliyu M. Wamakko, CON and H.E. Dr Abdullahi Umar Ganduje, CON.",
    sections: [],
  },
  {
    slug: "governance",
    title: "How the Forum governs itself",
    eyebrow: "Governance",
    lede: "Clear layers, documented approvals, auditable decisions: the same discipline the Forum recommends to public institutions.",
    body: "",
    sections: [
      { title: "Board of Trustees", body: "Guardianship of the mandate, values and long-term direction of the Forum.", position: 0 },
      { title: "National Executive", body: "President, Vice President, Secretary General and officers provide day-to-day leadership.", position: 1 },
      { title: "Committees", body: "Standing and ad-hoc working arms cover policy, peer review, mentorship, research and partnerships.", position: 2 },
      { title: "Secretariat", body: "The operational arm provides administration, research support, coordination and publishing.", position: 3 },
      { title: "Audit & Accountability", body: "An immutable audit trail records membership, documents, events and permissions.", position: 4 },
    ],
  },
  {
    slug: "polish-nigeria",
    title: "Polish Nigeria Business Council",
    eyebrow: "Programs ? PNBC",
    lede: "Connecting businesses, investors and institutions in Poland and Nigeria through trade, investment, knowledge sharing and cultural exchange.",
    body: "The Council's 2026 Strategic Plan sets out a programme of bilateral engagement, business connections and institutional cooperation. The initiatives below describe the plan's proposed activities. Contact the Secretariat for participation enquiries and confirmed arrangements.",
    sections: [
      { title: "Building economic bridges", body: "The Polish?Nigeria Business Council (PNBC) brings together businesses, policymakers and institutions to develop economic, cultural and educational links between both countries. Its ambition is to become a leading platform for bilateral trade, investment and strategic cooperation.", imageUrl: "/assets/partnerships/polish-nigeria-business-council.png", imageAlt: "Polish?Nigeria Business Council", position: 0 },
      { title: "2026 priorities", body: "The strategic plan focuses on expanding bilateral trade, enabling investment in priority sectors, growing the Council's membership and institutional connections, and increasing opportunities for cultural and educational exchange.", position: 1 },
      { title: "Trade missions and business connections", body: "Proposed missions in both directions connect Nigerian exporters and entrepreneurs with Polish manufacturers, investors and business institutions. Business forums, exhibitions and meetings are intended to open new markets, encourage joint ventures and support technology transfer.", position: 2 },
      { title: "Priority sectors", body: "Agriculture and agro-processing: farm machinery, food processing and agricultural exports.\n\nManufacturing: machinery, industrial equipment and automotive components.\n\nEnergy: renewable power, energy infrastructure and gas technology.\n\nInfrastructure: construction, transport and smart city development.\n\nTechnology: ICT, digital solutions and financial technology.\n\nMining: mineral exploration and mining technology.", position: 3 },
      { title: "Knowledge, culture and education", body: "The plan promotes people-to-people connections through cultural programmes, educational exchanges and knowledge sharing. A proposed digital business portal would help businesses discover opportunities and connect across both markets.", position: 4 },
    ],
  },
  {
    slug: "renewed-hope",
    title: "Renewed Hope Agenda Peer Review Group",
    eyebrow: "RHPRG",
    lede: "A strategic advisory body assessing, evaluating and guiding the effective implementation of the Renewed Hope Agenda — under the principle of critique to build.",
    body: "The Group when established shall identify projects and policies of the Renewed Hope Agenda across MDAs of the Federal Government and periodically review them while taking accounts of the objectives of such projects and the expectations of the Citizenry.",
    sections: [
      {
        title: "Concept Note",
        body: "Nigeria's diverse challenges, ranging from economic instability and security threats to governance inefficiencies, have created a critical need for comprehensive reforms. President Bola Tinubu's Renewed Hope Agenda is a transformative program aimed at addressing these challenges through sustainable, inclusive, and multi-sectoral solutions.\n\nThe Agenda is anchored on eight key pillars: Economic Reform, National Security, Agricultural Boost, Energy and Resource Utilization, Infrastructure Improvement, Education and Health, Diversification, and Governance Enhancement. Despite the Agenda's well-defined objectives, implementation faces obstacles such as governance inefficiencies, economic disparities, sector dependencies, and the pressing need for effective security measures.",
        position: 0,
      },
      {
        title: "The case for constructive review",
        body: "Most elites and citizens of developing countries either out of ignorance or sheer nepotism adopt the principle of deconstructive criticism or better described as hate-based-criticism on national issues or governance policies. While others engage in criticism rooted in opposition aimed at mind manipulation for increased electoral gains or for seeking political patronage.\n\nIt is to address these challenges and ensure successful implementation of the Agenda that the Renewed Hope Peer Review Group (RHPRG) is being established.",
        position: 1,
      },
      {
        title: "The Forum's contribution",
        body: "The FFDGN with array of seasoned leaders of thought, versed in administration, politics and business armed with virtues of patience and analytical mindset are set to make a difference that will add to the rung of her nation building ladder in Nigeria, capable of laying and an enduring foundation for the change, we really crave for.\n\nThat foundation is mortared with the principle of \u201ccriticize - to - build\u201d and this will serve as bedrock of the establishment of the Renewed Hope Peer Review Group (RHPRG).",
        position: 2,
      },
      {
        title: "Objectives of the Group",
        body: "The RHPRG is a strategic advisory body tasked with assessing, evaluating, and guiding the effective implementation of the Renewed Hope Agenda. Its primary goal is to ensure that the Agenda's objectives are met efficiently and equitably while highlighting key challenges hindering or slowing progress.\n\nThe Group shall also act as an independent advisory organ to the government and citizens.\n\nMatching the objectives and specifying progress will help Nigerians at home and Nigerians In Diaspora and by extension the International Community to appreciate such projects with optimism and respect.\n\nThe RHPRG shall also identify weaknesses capable of either derailing the projects or stalling them. The Group while reporting will have to come up with suggestions on how to mitigate the identified weaknesses. This balance will help Mr. President know when to urgently reorganize resources needed to complete projects of the Agenda.",
        position: 3,
      },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy & visibility",
    eyebrow: "Resources",
    lede: "Member information is handled according to explicit visibility levels and role-based access.",
    body: "Member records use five visibility levels: Public, Members Only, Committee Only, Secretariat Only and Private.\n\nPublic information may include a member name, former state, former office, approved biography and photograph.\n\nPersonal phone numbers, private email addresses and internal notes are never public without authorization.\n\nPortal and console pages are excluded from indexing and protected by authenticated access controls.",
    sections: [],
  },
  {
    slug: "accessibility",
    title: "Accessibility statement",
    eyebrow: "Resources",
    lede: "FFDGN aims to make its digital platform usable by people with a broad range of abilities and assistive technologies.",
    body: "Target: WCAG 2.1 AA. The platform uses semantic landmarks, a skip link, keyboard-operable navigation, visible focus indicators, labelled forms, reduced-motion support and responsive layouts.\n\nReport an accessibility barrier to info@ffdgn.org.ng with the page URL and assistive technology used.",
    sections: [],
  },
];

export function fallbackInstitutionalPage(slug: string): InstitutionalPageContent | null {
  return INSTITUTIONAL_PAGES.find((page) => page.slug === slug) ?? null;
}

export interface PeerReviewMemberContent {
  /** Absent for seeded fallback content, which is not editable in place. */
  id?: string;
  /** Display order; doubles as the S/N column on the public table. */
  position: number;
  name: string;
  zone: string;
  role: string;
  phone?: string;
  email?: string;
  published?: boolean;
}

/**
 * Fallback roster used only while the database is unreachable. The live
 * source of truth is the `peer_review_members` table, edited in the CMS.
 *
 * `position` mirrors the S/N column of the source roster, so it deliberately
 * skips 4 and 10 — those rows existed but carried no name. Filling them in
 * happens through the admin editor, which can insert at any position.
 */
export const PEER_REVIEW_MEMBERS: PeerReviewMemberContent[] = [
  { position: 1, name: "Isah Ozi Salami OFR", zone: "North Central", role: "Chairman" },
  { position: 2, name: "Hon Kenneth Ibe-Kalu", zone: "Secretariat", role: "Secretary" },
  { position: 3, name: "Prof Gideon Goshit", zone: "North Central", role: "Member" },
  { position: 5, name: "Dr Uwem Affiah", zone: "South South", role: "Member" },
  { position: 6, name: "Prof Uchenna Uwaleke", zone: "South East", role: "Member" },
  { position: 7, name: "Chief Raph Egbu", zone: "South East", role: "Member" },
  { position: 8, name: "Prof Emmanuel Adedun", zone: "South West", role: "Member" },
  { position: 9, name: "Adeyi Ademola Major", zone: "South West", role: "Member" },
  { position: 11, name: "Prof Habu Mohammed", zone: "North West", role: "Member" },
  { position: 12, name: "Prof Nuhu Gworgwor", zone: "North East", role: "Member" },
  { position: 13, name: "Prof Dauda Saleh", zone: "North East", role: "Member" },
  { position: 14, name: "Prof Onje Gye-Wado", zone: "FFDGN Rep", role: "Member" },
  { position: 15, name: "H.E James Bawa Magaji", zone: "FFDGN Rep", role: "Member" },
];