/**
 * Seeds the official About content (Who We Are brochure) into the CMS
 * InstitutionalPage/Section tables, corrects the founding timeline from the
 * incorporation record, and adds the real 2022 Akwa Ibom conference.
 * Idempotent. Run: `npx tsx scripts/seed-about.ts`
 */
import { db } from "../lib/db";

const SECTIONS: { title: string; body: string; imageUrl?: string; imageAlt?: string }[] = [
  {
    title: "Who We Are",
    body: [
      "The Forum of Former Deputy Governors of Nigeria is a non-profit and non-partisan organization founded to provide opportunities for past Deputy Governors to deploy their expertise, skills and knowledge individually and collectively for the growth and sustainable development of Nigeria.",
      "As a good governance interventionist organization, the Forum is established to encourage, reward and appreciate any entity corporate or individual, institution or group, that identifies with these noble objectives or promote same in Nigeria or amongst Nigerians in the Diaspora.",
    ].join("\n\n"),
  },
  {
    title: "A Platform for Quality Managers",
    body: [
      "As a critical platform of quality managers of human and material resources, the Forum will continue to contribute to nation-building through advocacy for sound policy initiatives that will promote a culture of good governance, accountability and politics of development in all strata of leadership in Nigeria.",
      "The Forum believes that part of overcoming our Nation-Building challenges is to promote the consciousness on Nigeria's core national values such as good character, integrity, dignity of labour, social justice, religious tolerance and diversity at all times.",
      "The Forum also provides voice of reason to current burning issues that affect the interest of members and to serve as a vanguard for the protection of the institution and the person of Deputy Governors in Nigeria.",
    ].join("\n\n"),
  },
  {
    title: "Our Vision",
    body: "To work towards building a nation where Leadership renders quality national services to the greatest number of Nigerians irrespective of party affiliations.",
  },
  {
    title: "Our Mission",
    body: "To develop programmes aimed at building partnerships and consensus amongst Nigerians towards the attainment of the Nation of our dream.",
  },
  {
    title: "How the Forum Makes Nation Building Happen",
    body: [
      "By molding lives: The Forum will help remold lives of Nigerians to dedicate themselves to the promotion of our National objectives which are: (a) A free and democratic society; (b) United, strong and self-reliant nation; (c) A great and dynamic economy; (d) A just and egalitarian society; (e) A land of bright and full opportunities for all citizens. We will achieve this by hosting Seminars, Workshops and Conferences.",
      "Undertaking National Rebranding Projects: The Forum will work towards creative and rebranding projects to promote national pride and good citizenship through partnership and the hosting of Summits locally and internationally.",
      "To appreciate and encourage good governance: The Forum should organize and host its good governance Awards from time to time to recognize and encourage individuals, groups and institutions to reach the mark of excellence in their areas of expertise.",
      "Empowerment: The Forum shall undertake capacity building and empowerment programmes aimed at promoting and supporting entrepreneurship and poverty reduction programmes for Nigeria citizens.",
    ].join("\n\n"),
  },
  {
    title: "The Inspiration",
    body: "The Forum of Former Deputy Governors of Nigeria was incorporated on the 25th April 2014, sequel to the initiative of H.E Prof. Chigozie Ogbu OFR who invited some of his colleagues to pay a courtesy visit on H.E Goodluck Jonathan in order to congratulate him on his emergence as the Acting-President of the Federal Republic of Nigeria in 2010. It was at this visit that H.E Goodluck Ebele Jonathan advised them to establish a Forum together. Members later retired to Rockview Hotel Wuse 2, Abuja same day where it was unanimously agreed that the Forum of Former Deputy Governors of Nigeria be formed. Sir Gabriel Tobi nominated, (Rivers State) while Late Mr. Patrick Yakowa the then Deputy Governor (Kaduna State) seconded that His Excellency Abdulmalik Mahmood be the Pioneer National Chairman, the motion was duly adopted. In the same vein, five persons were selected to represent each Geo-political zone to form the First National Executive Committee of the Forum.",
  },
  {
    title: "Our Membership",
    body: "The Membership of the Forum is open to all Former Deputy Governors who subscribe to the Aims and Objectives as well as serving Deputy Governors who are recognized as Honorary/Associate members. Kindly visit our website for more information: ffdgn.org.ng",
  },
  {
    title: "Our Achievements",
    body: [
      "The Forum in the year 2022, planned, organized and successfully held a National Conference in Akwa-Ibom State. After the Annual General Meeting/Congress of the Forum, held on the 24th Oct. 2022, a one-day conference was also held on 25th Oct. 2022 under the distinguished chairmanship of Hon. Kanu Agabi, SAN, CON and declared open by the Governor of Akwa Ibom State, His Excellency Dr. Udom Emmanuel.",
      "Also in attendance were the Deputy Governor of Akwa Ibom State, His Excellency Moses Ekpo, and other top Government officials, Civil Society Organizations, National Council of Women Societies, National Orientation Agency and the General Public. The Theme of the Conference: NATION BUILDING IN CHALLENGING TIMES, was examined under three different sub-themes by three leading academics, namely: Prof. Audu Nanben Gambo, Prof. Apkan Hogan Ekpo and Dr. Ademola Adeyi.",
      "The problems as identified by the three paper presenters can be summarized as follows: (i) The phenomenon of military regime that installed a command structure that defiled Nigeria's federation installed from 1954; (ii) Wide spread insecurity, which has greatly undermined Nigeria's productivity; (iii) Rapid population growth and high infant mortality; (iv) Rising debt profile; (v) Poor administration of elections; (vi) Polarization of the Nigerian polity which has undermined national cohesion; (vii) Unstable foreign policy.",
      "The strategies for overcoming the challenges as given by the presenters include: (i) Promote consciousness about core national values such as discipline, integrity, dignity of labour, social justice, religious tolerance and diversity; (ii) Promote culture of good governance, accountability and politics of development; (iii) Appointing security chiefs and administrators based on competence and capacity; (iv) Adequate funding of education and health for human capital development; (v) Sensitization of the citizenry to cherish diversity; (vi) Pursue and install a merit-based system for appointment and privileges; (vii) Encourage massive youth employment; (viii) Promote the use of ICT infrastructure within the digital economy to enable the Nigerian Youth to be innovative and productive; (ix) Promote an aggressive and creative branding project of Nigeria to promote national pride and good citizenship; (x) Provision of adequate infrastructure in the power sector to guarantee adequate power supply to drive the economy; (xi) Restructuring the polity by devolving more power to the lower tier of government.",
    ].join("\n\n"),
  },
];

const TIMELINE: { year: number; title: string; summary: string; image: string | null; links: { label: string; href: string }[] }[] = [
  { year: 2010, title: "Rockview Founding Meeting", summary: "Following President Jonathan's advice, former deputy governors unanimously agree at Rockview Hotel, Wuse 2, Abuja to form the Forum; Abdulmalik Mahmood adopted as Pioneer National Chairman.", image: "/assets/events/inaugural-conference.jpg", links: [{ label: "About the Forum", href: "/about" }] },
  { year: 2012, title: "National Dialogue on State Governance", summary: "First structured policy dialogue; early communiqués archived.", image: "/assets/events/national-dialogue.jpg", links: [{ label: "Knowledge Centre", href: "/knowledge" }] },
  { year: 2014, title: "Incorporation", summary: "The Forum is incorporated on 25 April 2014, sequel to Prof. Chigozie Ogbu's initiative.", image: "/media/site/map-states.svg", links: [{ label: "The Inspiration", href: "/about" }] },
  { year: 2016, title: "Institutional Strengthening Initiative", summary: "Committees formalised; peer-review mechanism piloted.", image: "/assets/events/2016-institutional-strenghtening.jpg", links: [{ label: "Committees", href: "/committees" }] },
  { year: 2020, title: "Policy Dialogue Series & Publications", summary: "Standing research output begins; reports and briefs published.", image: "/assets/events/2020-dialogue-series.jpg", links: [{ label: "Publications", href: "/knowledge" }] },
  { year: 2022, title: "National Conference, Akwa Ibom", summary: "AGM/Congress and one-day national conference on Nation Building in Challenging Times, chaired by Kanu Agabi, SAN, CON.", image: "/assets/gallery/gallery6.jpg", links: [{ label: "2022 Conference", href: "/events/national-conference-2022" }] },
  { year: 2024, title: "Strategic Plan: Leadership, Legacy", summary: "Legacy framework and conference intelligence cycle adopted.", image: "/assets/events/2024-strategic-plan.jpg", links: [{ label: "2024 Conference", href: "/events/national-conference-2024" }] },
  { year: 2026, title: "Digital Institution Launched", summary: "Public website, member portal and secretariat console unified.", image: "/assets/events/2026-digital-institution.jpeg", links: [{ label: "5th National Conference 2026", href: "/events/fifth-national-conference-2026" }] },
];

async function main() {
  // ——— About page + sections ———
  const page = await db.institutionalPage.upsert({
    where: { slug: "about" },
    update: {
      title: "About the Forum",
      eyebrow: "The Forum",
      lede: "A non-profit, non-partisan organisation of former deputy governors deploying experience, skills and knowledge for Nigeria's growth and sustainable development.",
      body: "Kindly visit ffdgn.org.ng for more information.",
      published: true,
    },
    create: {
      slug: "about",
      title: "About the Forum",
      eyebrow: "The Forum",
      lede: "A non-profit, non-partisan organisation of former deputy governors deploying experience, skills and knowledge for Nigeria's growth and sustainable development.",
      body: "Kindly visit ffdgn.org.ng for more information.",
      published: true,
    },
  });
  await db.institutionalSection.deleteMany({ where: { pageId: page.id } });
  for (const [i, s] of SECTIONS.entries()) {
    await db.institutionalSection.create({
      data: { pageId: page.id, title: s.title, body: s.body, position: i, published: true },
    });
  }
  console.log("about page + sections:", SECTIONS.length);

  // ——— Corrected timeline ———
  await db.timelineLink.deleteMany({});
  await db.timelineEntry.deleteMany({});
  for (const [i, t] of TIMELINE.entries()) {
    const entry = await db.timelineEntry.create({
      data: { year: t.year, title: t.title, summary: t.summary, position: i, imageUrl: t.image },
    });
    for (const l of t.links) {
      await db.timelineLink.create({ data: { entryId: entry.id, label: l.label, href: l.href } });
    }
  }
  console.log("timeline entries:", TIMELINE.length);

  // ——— Real 2022 Akwa Ibom conference ———
  const conf = await db.forumEvent.upsert({
    where: { slug: "national-conference-2022" },
    update: {},
    create: {
      slug: "national-conference-2022",
      title: "National Conference 2022",
      theme: "Nation Building in Challenging Times",
      kind: "Annual Conference",
      startDate: new Date("2022-10-24"), endDate: new Date("2022-10-25"),
      venue: "Akwa Ibom State", city: "Uyo", status: "Past",
      summary: "Annual General Meeting/Congress followed by a one-day national conference chaired by Hon. Kanu Agabi, SAN, CON and declared open by Governor Udom Emmanuel, with papers by Prof. Audu Nanben Gambo, Prof. Apkan Hogan Ekpo and Dr. Ademola Adeyi.",
      guestList: [
        "Hon. Kanu Agabi, SAN, CON — Conference Chairman",
        "H.E. Dr. Udom Emmanuel — Declared the conference open",
        "H.E. Moses Ekpo — Deputy Governor of Akwa Ibom State",
        "Prof. Audu Nanben Gambo — Paper Presenter",
        "Prof. Apkan Hogan Ekpo — Paper Presenter",
        "Dr. Ademola Adeyi — Paper Presenter",
      ].join("\n"),
    },
  });
  await db.eventProgramme.deleteMany({ where: { eventId: conf.id } });
  const prog: [string, string][] = [
    ["Oct 24", "Annual General Meeting / Congress of the Forum"],
    ["Oct 25 · 09:00", "Opening — declared open by the Governor of Akwa Ibom State"],
    ["Oct 25 · 10:00", "Paper presentations: Nation Building in Challenging Times"],
    ["Oct 25 · 14:00", "Resolutions and closing"],
  ];
  for (const [i, [slotTime, session]] of prog.entries()) {
    await db.eventProgramme.create({ data: { eventId: conf.id, slotTime, session, position: i } });
  }
  console.log("event: national-conference-2022");

  // ——— Founding facts: established year + metric + pioneer chairman spelling ———
  await db.siteSetting.upsert({
    where: { key: "site.established" },
    update: { value: "2014" },
    create: { key: "site.established", value: "2014" },
  });
  const metric = await db.siteMetric.findUnique({ where: { key: "Years of Institutional Experience" } });
  if (metric) {
    await db.siteMetric.update({ where: { id: metric.id }, data: { value: "12+" } });
  }
  await db.member.updateMany({ where: { slug: "abdulmalik-mahood" }, data: { fullName: "H.E. Abdulmalik Mahmood" } });
  console.log("founding facts updated (est. 2014, 12+, Mahmood)");

  const counts = {
    sections: await db.institutionalSection.count({ where: { pageId: page.id } }),
    timeline: await db.timelineEntry.count(),
    events: await db.forumEvent.count(),
  };
  console.log(JSON.stringify(counts));
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try { await db.$disconnect(); } catch { /* noop */ }
  process.exit(1);
});
