import { db } from "../lib/db";

async function main() {
  const r = {
    settings: await db.siteSetting.count(),
    metrics: await db.siteMetric.count(),
    focus: await db.focusArea.count(),
    timeline: await db.timelineEntry.count(),
    seats: await db.leadershipSeat.count(),
    speakers: await db.eventSpeaker.count(),
    memberEvents: await db.memberEvent.count(),
    memberPubs: await db.memberPublication.count(),
    coop: await db.partnershipCooperation.count(),
    partnerEvents: await db.partnershipEvent.count(),
    newsDocs: await db.newsDoc.count(),
    media: await db.mediaAsset.count(),
    videos: await db.mediaAsset.count({ where: { kind: "VIDEO" } }),
  };
  console.log(JSON.stringify(r));
  await db.$disconnect();
}
main();
