import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProgramDetail } from "@/components/program-detail";
import { getInstitutionalPage, listPeerReviewMembers } from "@/lib/repo";
export async function generateMetadata(): Promise<Metadata> {
 const authored = await websiteMetadata("/renewed-hope");
 if (authored) return authored;

  const content = await getInstitutionalPage("renewed-hope");
  return {title:content?.title ?? "Renewed Hope",description:content?.lede};
}
export default async function RenewedHopePage() {
  const managed = await managedWebsitePage("/renewed-hope");
  if (managed) return managed;

  const [content,roster] = await Promise.all([getInstitutionalPage("renewed-hope"),listPeerReviewMembers()]);
  if(!content) notFound();
  return <ProgramDetail content={content}><section id="program-people" className="program-people" aria-labelledby="program-people-title"><p className="eyebrow">Composition / {roster.length} members</p><h2 id="program-people-title" className="font-display">Members of the Group</h2>{roster.length ? <div className="program-roster-scroll" role="region" aria-label="Group membership table" tabIndex={0}><table className="program-roster-table"><caption className="sr-only">Members of the Renewed Hope Agenda Peer Review Group</caption><thead><tr><th scope="col">S/N</th><th scope="col">Name</th><th scope="col">Zone</th><th scope="col">Position</th>{roster.some(member => member.phone) && <th scope="col">Mobile</th>}{roster.some(member => member.email) && <th scope="col">Email</th>}</tr></thead><tbody>{roster.map(member => <tr key={member.id ?? `${member.position}-${member.name}`}><td>{member.position}</td><th scope="row">{member.name}</th><td>{member.zone}</td><td>{member.role}</td>{roster.some(member => member.phone) && <td>{member.phone ? <a href={`tel:${member.phone.replace(/\s/g, "")}`}>{member.phone}</a> : "—"}</td>}{roster.some(member => member.email) && <td>{member.email ? <a href={`mailto:${member.email}`}>{member.email}</a> : "—"}</td>}</tr>)}</tbody></table></div> : <p>The composition of the Group has not yet been published.</p>}</section></ProgramDetail>;
}
export const revalidate = 300;
