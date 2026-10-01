/**
 * Imports verified real-world Forum coverage + people into MySQL.
 * Idempotent (upsert by slug). Run: `npx tsx scripts/import-real-news.ts`
 *
 * Sources are external press (category "Media Coverage", official=false)
 * with source attribution preserved in the closing paragraph.
 */
import { db } from "../lib/db";

interface RealStory {
  slug: string; title: string; date: string; location: string;
  excerpt: string; body: string[]; imageUrl: string | null;
}

const STORIES: RealStory[] = [
  {
    slug: "ganduje-tasks-ex-deputy-governors-nation-building",
    title: "Ganduje Tasks Ex-Deputy Governors on Nation Building",
    date: "2026-09-23", location: "Abuja",
    excerpt:
      "Former Kano State Governor Dr Abdullahi Umar Ganduje has urged the Forum of Former Deputy Governors of Nigeria to deploy its wealth of governance experience to nation-building and democratic development.",
    body: [
      "Former Kano State Governor, Dr Abdullahi Umar Ganduje, has urged the Forum of Former Deputy Governors of Nigeria to use its experience in governance and politics to contribute more to nation-building and democratic development.",
      "Ganduje made the call when he visited the headquarters of the Forum in Abuja, where he expressed satisfaction with the growth and activities of the organisation.",
      "He said the Forum had provided a platform for former deputy governors to bring their wealth of experience to bear on issues of governance, democracy and national development.",
      "The former governor said the establishment of a permanent headquarters would provide an enabling environment for members to plan, exchange ideas and contribute meaningfully to national development.",
      "Ganduje also commended the Forum for sustaining its annual national conference, with this year's edition scheduled for Oct. 20 and 21 in Abuja.",
      "He urged Nigerians, particularly former public office holders, to remain committed to nation-building rather than allowing personal, ethnic or religious interests to override the collective interest of the country.",
      "According to him, platforms such as the Forum can help enlighten citizens and promote national integration, democratic sustainability and good governance.",
      "Ganduje said Nigerians should not lose confidence in the country, but continue to support efforts aimed at building a more united and prosperous nation.",
      "Earlier, the Forum's National Chairman, Dr Chris Akomas, said the Forum had grown through the commitment and sacrifice of former deputy governors who conceived and nurtured the idea of creating a platform for continued national service.",
      "He acknowledged the support of the Forum's Grand Patron, former President Goodluck Jonathan, and National Patrons, including Ganduje and Senator Aliyu Wamakko, among other stakeholders.",
      "Akomas said the fifth national conference would focus on the theme, \u201cRethinking Nation Building: Bridging the Leadership-Citizen Disconnect on Orientation, Attitude, Character, Culture and Tradition Towards Sustainable Development.\u201d",
      "The highlight of the event was the cutting of the 66th birthday cake of Dr Chris Akomas.",
      "Source: EDGE, September 23, 2026 (by George Humphrey). Originally published at https://edgengr.com/news/ganduje-tasks-ex-deputy-governors-on-nation-building/",
    ],
    imageUrl: "/assets/news/visit_ganduje.jpeg",
  },
  {
    slug: "forum-felicitates-akomas-at-66",
    title: "Deputy Governors' Forum Felicitates Akomas at 66",
    date: "2026-09-23", location: "Abuja",
    excerpt:
      "The Forum has felicitated its National Chairman, Dr Chris Akomas, on his 66th birthday, citing his contributions to public service and governance.",
    body: [
      "The Forum of Former Deputy Governors of Nigeria (FFDGN) has felicitated its National Chairman, Dr Chris Akomas, on his 66th birthday, citing his contributions to public service and governance.",
      "The Director-General of the forum, Dr Kenneth Ibe-Kalu, in a statement on Wednesday in Abuja said Akomas had brought his experience in public administration to the leadership of the forum.",
      "Ibe-Kalu said the forum's national conferences under Akomas' leadership had provided opportunities for former deputy governors and other stakeholders to deliberate on governance and national development.",
      "He said Akomas had consistently advocated policies that would improve the welfare of Nigerians, including access to food and other basic necessities.",
      "\u201cDr Chris is a bold and courageous leader who pursues every cause he believes in with dedication and love for humanity,\u201d he said.",
      "Akomas, a former Deputy Governor of Abia, also served as the Federal Commissioner representing the state on the Revenue Mobilisation Allocation and Fiscal Commission (RMAFC).",
      "He chaired the commission's Indices and Disbursement Committee and previously served as Abia Commissioner for Lands and Survey.",
      "He holds a PhD in Applied Psychology from Olabisi Onabanjo University, Ago-Iwoye, and a master's degree in Personnel Psychology from the University of Ibadan.",
      "He is currently the National Chairman of the FFDGN and National Secretary of the South-East Stakeholders Forum.",
      "Source: News Agency of Nigeria (NAN), September 23, 2026 (by Emmanuel Oloniruha). Originally published at https://nannews.ng/deputy-governors-forum-felicitates-akomas-at-66/",
    ],
    imageUrl: "/assets/news/ganduje3.jpeg",
  },
  {
    slug: "ganduje-urges-harmony-governors-deputies",
    title: "Ganduje Urges Ex-Deputy Governors to Foster Harmony Between Governors, Deputies",
    date: "2026-07-23", location: "Abuja",
    excerpt:
      "Dr Abdullahi Ganduje has urged the Forum to promote harmonious relationships between governors and their deputies and to mediate wherever disagreements arise.",
    body: [
      "Former Kano State Governor, Dr Abdullahi Ganduje, has urged the Forum of Former Deputy Governors of Nigeria (FFDGN) to promote harmonious relationships between governors and their deputies to strengthen democratic governance.",
      "Ganduje, the National Patron of the forum, made the call on Thursday in Abuja when members paid him a courtesy visit ahead of the forum's fifth national conference.",
      "He urged the forum to mediate whenever disagreements arose between governors and their deputies, saying its members possessed the experience to resolve such disputes.",
      "\u201cI believe your forum should make it one of its responsibilities to help resolve conflicts between governors and their deputies whenever they arise. Such efforts will command respect because you understand the responsibilities of both offices and the dynamics of that relationship,\u201d he said.",
      "Ganduje also urged the forum to monitor political developments across states, irrespective of political affiliations, and offer practical governance advice to serving public office holders.",
      "He described the office of deputy governor as indispensable, saying the Constitution provided for continuity in governance while the responsibilities of government were too enormous for one person.",
      "The former governor also urged the forum to examine recurring conflicts between predecessors and successors in office.",
      "According to him, the issue cuts across political parties and should form the theme of one of the forum's future conferences.",
      "\u201cThese problems still occur because of individual attitudes, misuse of power and, in many cases, the influence of sycophants on both sides,\u201d he said.",
      "Ganduje, a former National Chairman of the All Progressives Congress (APC), commended the forum for sustaining its activities, saying the seriousness of any organisation was measured by the impact of its programmes.",
      "He also accepted the invitation to attend the forum's fifth national conference scheduled for Oct. 20 and Oct. 21.",
      "Earlier, the forum's Chairman, Dr Chris Akomas, said the conference would focus on nation building, leadership and national unity.",
      "He said the conference, with the theme, \u201cRethinking Nation Building: Bridging the Leadership-Citizen Disconnect\u201d, aimed to bridge the widening gap between leaders and citizens through practical recommendations from experienced former public office holders.",
      "Akomas said the visit also provided an opportunity to present Ganduje with the proceedings of the forum's fourth national conference and its 2026/2027 desk calendar.",
      "He reaffirmed the forum's commitment to promoting national unity, good governance and democratic development by leveraging the experience of former deputy governors.",
      "Source: News Agency of Nigeria (NAN), July 23, 2026 (by Emmanuel Oloniruha). Originally published at https://nannews.ng/ganduje-urges-ex-deputy-governors-to-foster-harmony-between-governors-deputies/",
    ],
    imageUrl: "/assets/news/visit_ganduje2.jpeg",
  },
];

async function main() {
  for (const s of STORIES) {
    await db.newsArticle.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title, category: "Media Coverage", date: new Date(s.date),
        location: s.location, excerpt: s.excerpt, body: s.body.join("\n\n"),
        official: false, imageUrl: s.imageUrl,
      },
      create: {
        slug: s.slug, title: s.title, category: "Media Coverage", date: new Date(s.date),
        location: s.location, excerpt: s.excerpt, body: s.body.join("\n\n"),
        official: false, imageUrl: s.imageUrl,
      },
    });
    console.log("upserted:", s.slug);
  }

  // Real person named across all three stories: National Chairman.
  await db.member.upsert({
    where: { slug: "chris-akomas" },
    update: {
      fullName: "Dr Chris Akomas", title: "Former Deputy Governor", state: "Abia",
      region: "South-East", category: "Former", status: "Active",
      leadershipRole: "National Chairman", visibility: "PUBLIC",
      bio: "Former Deputy Governor of Abia State and National Chairman of the Forum of Former Deputy Governors of Nigeria. Served as Federal Commissioner representing Abia on the Revenue Mobilisation Allocation and Fiscal Commission (RMAFC), where he chaired the Indices and Disbursement Committee, and previously as Abia Commissioner for Lands and Survey. Holds a PhD in Applied Psychology from Olabisi Onabanjo University and a master's in Personnel Psychology from the University of Ibadan. Also serves as National Secretary of the South-East Stakeholders Forum.",
    },
    create: {
      slug: "chris-akomas", fullName: "Dr Chris Akomas", title: "Former Deputy Governor",
      state: "Abia", region: "South-East", category: "Former", status: "Active",
      leadershipRole: "National Chairman", visibility: "PUBLIC",
      bio: "Former Deputy Governor of Abia State and National Chairman of the Forum of Former Deputy Governors of Nigeria. Served as Federal Commissioner representing Abia on the Revenue Mobilisation Allocation and Fiscal Commission (RMAFC), where he chaired the Indices and Disbursement Committee, and previously as Abia Commissioner for Lands and Survey. Holds a PhD in Applied Psychology from Olabisi Onabanjo University and a master's in Personnel Psychology from the University of Ibadan. Also serves as National Secretary of the South-East Stakeholders Forum.",
    },
  });
  // NOTE: no service-year record seeded — years in office were not in the
  // source stories. The Secretariat should add them via the member console.
  console.log("upserted: chris-akomas");

  const counts = { news: await db.newsArticle.count(), members: await db.member.count() };
  console.log(JSON.stringify(counts));
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try { await db.$disconnect(); } catch { /* noop */ }
  process.exit(1);
});
