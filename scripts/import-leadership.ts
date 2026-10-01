/**
 * Imports the verified Forum leadership, patrons and the 5th National
 * Conference (per the official conference flyer), replacing the provisional
 * 2026 placeholder event. Idempotent. Run: `npx tsx scripts/import-leadership.ts`
 */
import { db } from "../lib/db";

async function main() {
  // ——— Leaders (portraits in public/assets/leadership, wired by sync) ———
  const leaders = [
    {
      slug: "chris-akomas", fullName: "H.E. Dr Chris Alozie Akomas", title: "Former Deputy Governor",
      state: "Abia", region: "South-East", leadershipRole: "National Chairman",
      bio: "Former Deputy Governor of Abia State and National Chairman of the Forum of Former Deputy Governors of Nigeria. Served as Federal Commissioner representing Abia on the Revenue Mobilisation Allocation and Fiscal Commission (RMAFC), where he chaired the Indices and Disbursement Committee, and previously as Abia Commissioner for Lands and Survey. Holds a PhD in Applied Psychology from Olabisi Onabanjo University and a master's in Personnel Psychology from the University of Ibadan. Also serves as National Secretary of the South-East Stakeholders Forum.",
    },
    {
      slug: "mukhtar-anka", fullName: "H.E. Mukhtar Ahmed Anka", title: "Former Deputy Governor",
      state: "—", region: "North-West", leadershipRole: "Deputy National Chairman (North)",
      bio: "Former Deputy Governor and Deputy National Chairman (North) of the Forum of Former Deputy Governors of Nigeria, coordinating the Forum across the northern states.",
    },
    {
      slug: "hazeem-gbolarumi", fullName: "H.E. Hazeem Gbolarumi", title: "Former Deputy Governor",
      state: "—", region: "South-West", leadershipRole: "Deputy National Chairman (South)",
      bio: "Former Deputy Governor and Deputy National Chairman (South) of the Forum of Former Deputy Governors of Nigeria, coordinating the Forum across the southern states.",
    },
    {
      slug: "pauline-tallen", fullName: "H.E. Dame Pauline Tallen, OFR, CON", title: "Former Deputy Governor",
      state: "Plateau", region: "North-Central", leadershipRole: "National Treasurer",
      bio: "Former Deputy Governor of Plateau State and former Minister of Women Affairs. National Treasurer of the Forum of Former Deputy Governors of Nigeria.",
    },
    {
      slug: "abdulmalik-mahood", fullName: "H.E. Abdulmalik Mahood", title: "Former Deputy Governor",
      state: "—", region: "North-Central", leadershipRole: "Chairman, Board of Trustees",
      bio: "Former Deputy Governor and Chairman of the Board of Trustees of the Forum of Former Deputy Governors of Nigeria.",
    },
  ];
  for (const l of leaders) {
    await db.member.upsert({
      where: { slug: l.slug },
      update: {
        fullName: l.fullName, title: l.title, state: l.state, region: l.region,
        category: "Former", status: "Active", leadershipRole: l.leadershipRole,
        visibility: "PUBLIC", bio: l.bio, photoUrl: `/assets/leadership/${l.slug}.jpeg`,
      },
      create: {
        slug: l.slug, fullName: l.fullName, title: l.title, state: l.state, region: l.region,
        category: "Former", status: "Active", leadershipRole: l.leadershipRole,
        visibility: "PUBLIC", bio: l.bio, photoUrl: `/assets/leadership/${l.slug}.jpeg`,
      },
    });
    console.log("leader:", l.slug);
  }

  // ——— Patrons & conference chairmen (honorary records) ———
  const honorary = [
    { slug: "goodluck-jonathan", fullName: "H.E. Dr Goodluck Ebele Jonathan, GCFR", title: "Former President, Federal Republic of Nigeria", state: "Bayelsa", region: "South-South", bio: "Former President of the Federal Republic of Nigeria and Grand Patron of the Forum." },
    { slug: "aliyu-wamakko", fullName: "H.E. Sen. Aliyu M. Wamakko, CON", title: "Former Governor", state: "Sokoto", region: "North-West", bio: "Former Governor of Sokoto State, serving Senator, and National Patron of the Forum." },
    { slug: "abdullahi-ganduje", fullName: "H.E. Dr Abdullahi Umar Ganduje, CON", title: "Former Governor", state: "Kano", region: "North-West", bio: "Former Governor of Kano State, former National Chairman of the APC, and National Patron of the Forum." },
    { slug: "aminu-masari", fullName: "H.E. Rt. Hon. Aminu Bello Masari, CFR", title: "Former Governor", state: "Katsina", region: "North-West", bio: "Former Governor of Katsina State, former Speaker of the House of Representatives, and Chairman of the 5th National Conference." },
    { slug: "ifeanyi-okowa", fullName: "H.E. Sen. Ifeanyi Okowa, CON", title: "Former Governor", state: "Delta", region: "South-South", bio: "Former Governor of Delta State and Chairman of the 5th National Conference." },
  ];
  for (const h of honorary) {
    await db.member.upsert({
      where: { slug: h.slug },
      update: { fullName: h.fullName, title: h.title, state: h.state, region: h.region, category: "Former", status: "Honorary", visibility: "PUBLIC", bio: h.bio },
      create: { slug: h.slug, fullName: h.fullName, title: h.title, state: h.state, region: h.region, category: "Former", status: "Honorary", visibility: "PUBLIC", bio: h.bio },
    });
    console.log("honorary:", h.slug);
  }

  // Director-General (Secretariat leadership — not a former deputy governor).
  await db.member.upsert({
    where: { slug: "kenneth-ibe-kalu" },
    update: {
      fullName: "Dr Kenneth Ibe-Kalu", title: "Director-General", state: "—",
      region: "North-Central", category: "Secretariat", status: "Active",
      leadershipRole: "Director-General", visibility: "PUBLIC",
      bio: "Director-General of the Forum of Former Deputy Governors of Nigeria, heading the Secretariat that provides administrative, research and coordination support to the Forum and its activities.",
      photoUrl: "/assets/leadership/kenneth-ibe-kalu.jpg",
    },
    create: {
      slug: "kenneth-ibe-kalu", fullName: "Dr Kenneth Ibe-Kalu", title: "Director-General",
      state: "—", region: "North-Central", category: "Secretariat", status: "Active",
      leadershipRole: "Director-General", visibility: "PUBLIC",
      bio: "Director-General of the Forum of Former Deputy Governors of Nigeria, heading the Secretariat that provides administrative, research and coordination support to the Forum and its activities.",
      photoUrl: "/assets/leadership/kenneth-ibe-kalu.jpg",
    },
  });
  console.log("leader: kenneth-ibe-kalu");

  // ——— Leadership hierarchy ———
  await db.leadershipSeat.deleteMany({});
  const seats = [
    { role: "Grand Patron", tier: 0, memberSlug: "goodluck-jonathan", remit: "Custodian of the Forum's values and continuity." },
    { role: "National Chairman", tier: 1, memberSlug: "chris-akomas", remit: "Presides over the Forum and its national engagements." },
    { role: "Deputy National Chairman (North)", tier: 2, memberSlug: "mukhtar-anka", remit: "Coordinates the Forum across the northern states." },
    { role: "Deputy National Chairman (South)", tier: 2, memberSlug: "hazeem-gbolarumi", remit: "Coordinates the Forum across the southern states." },
    { role: "National Treasurer", tier: 2, memberSlug: "pauline-tallen", remit: "Stewardship of Forum resources." },
    { role: "Chairman, Board of Trustees", tier: 2, memberSlug: "abdulmalik-mahood", remit: "Guardianship of mandate and governance." },
    { role: "Director-General", tier: 2, memberSlug: "kenneth-ibe-kalu", remit: "Heads the Secretariat; operational arm of the Forum." },
    { role: "National Patron", tier: 0, memberSlug: "abdullahi-ganduje", remit: "Counsel and support to the Forum." },
    { role: "National Patron", tier: 0, memberSlug: "aliyu-wamakko", remit: "Counsel and support to the Forum." },
  ];
  for (const [i, s] of seats.entries()) {
    await db.leadershipSeat.create({ data: { ...s, position: i } });
  }
  console.log("seats:", seats.length);

  // ——— Replace provisional 2026 placeholder with the real 5th National Conference ———
  await db.forumEvent.deleteMany({ where: { slug: "national-conference-2026" } });
  const conf = await db.forumEvent.upsert({
    where: { slug: "fifth-national-conference-2026" },
    update: {},
    create: {
      slug: "fifth-national-conference-2026",
      title: "5th National Conference 2026",
      theme: "Rethinking Nation-Building: Bridging the Leadership-Citizenship Disconnect Through Orientation, Attitude, Character, Culture and Tradition for Sustainable Development",
      kind: "Annual Conference",
      startDate: new Date("2026-10-20"), endDate: new Date("2026-10-21"),
      venue: "Abuja Continental Hotel", city: "Abuja, FCT", status: "Upcoming",
      summary: "The Forum's fifth national conference convenes former deputy governors, patrons, scholars and stakeholders to examine how orientation, attitude, character, culture and tradition can bridge the leadership–citizen disconnect. Enquiries: 0803 301 3624 · 0916 894 2222 · annualconference@ffdgn.org.ng",
      coverUrl: "/assets/events/conference.png",
      guestList: [
        "H.E. Dr Goodluck Ebele Jonathan, GCFR — Grand Patron",
        "H.E. Sen. Aliyu M. Wamakko, CON — National Patron",
        "H.E. Dr Abdullahi Umar Ganduje, CON — National Patron",
        "H.E. Rt. Hon. Aminu Bello Masari, CFR — Conference Chairman",
        "H.E. Sen. Ifeanyi Okowa, CON — Conference Chairman",
        "Prof. Jerry Gana, CON — Keynote Speaker",
        "Prof. Mkpa Agu Mkpa — Conference Speaker",
        "Prof. Taye Obateru — Conference Speaker",
        "Prof. Victor Dugga — Conference Speaker",
        "Prof. Ayobami Hammed — Conference Speaker",
        "Prof. Iniobong Uko — Conference Speaker",
        "Prof. Umaru A. Pate — Conference Speaker",
      ].join("\n"),
    },
  });
  await db.eventProgramme.deleteMany({ where: { eventId: conf.id } });
  const programme: [string, string][] = [
    ["Day 1 · 09:00", "Opening plenary and goodwill messages"],
    ["Day 1 · 11:00", "Keynote address — Prof. Jerry Gana, CON"],
    ["Day 1 · 13:00", "Thematic sessions: orientation, attitude, character, culture and tradition"],
    ["Day 2 · 09:00", "Syndicate discussions and recommendations"],
    ["Day 2 · 15:00", "Communiqué presentation and closing"],
  ];
  for (const [i, [slotTime, session]] of programme.entries()) {
    await db.eventProgramme.create({ data: { eventId: conf.id, slotTime, session, position: i } });
  }
  console.log("event: fifth-national-conference-2026");

  // Birthday story gets its birthday image.
  await db.newsArticle.update({
    where: { slug: "forum-felicitates-akomas-at-66" },
    data: { imageUrl: "/assets/news/birthday.jpg" },
  });
  console.log("news image: birthday.jpg");

  const counts = {
    members: await db.member.count(), events: await db.forumEvent.count(),
    seats: await db.leadershipSeat.count(),
  };
  console.log(JSON.stringify(counts));
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try { await db.$disconnect(); } catch { /* noop */ }
  process.exit(1);
});
