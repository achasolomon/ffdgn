import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AssetImage } from "./media";
import { ContactForm } from "./contact-form";
import { getWebsitePage } from "@/lib/website-repo";
import { listDocs, listEvents, listNews, listMembers, listCommittees } from "@/lib/repo";
import { asRoute } from "@/lib/routes";
import type { WebsitePage, WebsiteSection, WebsiteItem } from "@/lib/website-content";
import { websiteVideoSource } from "@/lib/website-content";

function Copy({body}: {body:string}) {return <div className="cms-copy">{body.split(/\n\s*\n/).filter(Boolean).map((paragraph,index) => <p key={index}>{paragraph}</p>)}</div>;}
function Action({href,label}: {href:string;label:string}) { return href ? <a className="cms-action" href={href}>{label || "Learn more"}<ArrowRight size={16} /></a> : null; }
async function collectionItems(section: WebsiteSection): Promise<WebsiteItem[]> {
  if(section.collection === "events") return (await listEvents()).slice(0,section.limit).map(item => ({title:item.title,body:item.summary,image:item.coverUrl ?? "",alt:item.title,href:`/events/${item.slug}`}));
  if(section.collection === "news") return (await listNews()).slice(0,section.limit).map(item => ({title:item.title,body:item.excerpt,image:item.image ?? "",alt:item.title,href:`/news/${item.slug}`}));
  if(section.collection === "members") return (await listMembers()).filter(item => item.visibility === "PUBLIC").slice(0,section.limit).map(item => ({title:item.name,body:item.title,image:item.photo ?? "",alt:item.name,href:`/members/${item.slug}`}));
  if(section.collection === "publications") return (await listDocs()).filter(item => item.visibility === "PUBLIC" && item.status === "Published").slice(0,section.limit).map(item => ({title:item.title,body:item.summary,image:"",alt:"",href:`/knowledge/${item.slug}`}));
  return (await listCommittees()).slice(0,section.limit).map(item => ({title:item.name,body:item.mandate,image:item.imageUrl ?? "",alt:item.imageAlt ?? item.name,href:`/committees#${item.slug}`}));
}
async function Section({section}: {section:WebsiteSection}) {
  const items=section.type === "collection" ? await collectionItems(section) : section.items;
  const video = section.type === "video" ? websiteVideoSource(section.href) : null;
  return <section id={section.id} className={`cms-section cms-tone-${section.tone} cms-type-${section.type}`}>
    {section.label && <p className="eyebrow">{section.label}</p>}{section.title && <h2 className="font-display">{section.title}</h2>}
    {section.body && <Copy body={section.body} />}
    {section.image && <figure className="cms-image"><AssetImage src={section.image} alt={section.alt} width={1400} height={900} className="w-full object-contain" sizes="(max-width: 767px) 100vw, 1200px" />{section.caption && <figcaption>{section.caption}</figcaption>}</figure>}
    {["cards","gallery","collection"].includes(section.type) && <div className="cms-cards">{items.map((item,index) => <article key={index}>{item.image && <AssetImage src={item.image} alt={item.alt} width={600} height={450} className="cms-card-image" sizes="(max-width: 767px) 100vw, 33vw" />}{item.title && <h3 className="font-display">{item.title}</h3>}{item.body && <Copy body={item.body} />}<Action href={item.href} label={section.button} /></article>)}</div>}
    {section.type === "table" && <div className="cms-table-scroll" tabIndex={0} role="region" aria-label={section.title || "Information table"}><table><caption className="sr-only">{section.title || "Information"}</caption><thead><tr>{section.columns.map((column,index) => <th scope="col" key={index}>{column}</th>)}</tr></thead><tbody>{section.rows.map((row,index) => <tr key={index}>{row.map((cell,column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>}
    {section.type === "contact" && <ContactForm />}
    {video && <figure>{video.embedded ? <iframe src={video.src} title={section.title || "Forum video"} className="aspect-video w-full" loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen /> : <video src={video.src} controls preload="metadata" className="w-full" aria-label={section.title || "Forum video"} />}{section.caption && <figcaption>{section.caption}</figcaption>}</figure>}
    {section.type !== "video" && <Action href={section.href} label={section.button} />}
  </section>;
}
export async function WebsitePageView({page}: {page:WebsitePage}) {
  const sections=await Promise.all(page.sections.filter(section => !section.hidden).map(async section => <div key={section.id}>{await Section({section})}</div>));
  return <div className="cms-public-page mx-auto max-w-shell px-5 py-12"><header className={`cms-page-header ${page.image ? "cms-page-with-image" : ""}`}>{page.image && <div className="cms-page-background" aria-hidden><AssetImage src={page.image} alt="" width={1800} height={1000} className="h-full w-full object-cover" sizes="100vw" priority /></div>}{page.label && <p className="eyebrow-light">{page.label}</p>}<h1 className="font-display">{page.title}</h1>{page.introduction && <Copy body={page.introduction} />}</header>{sections}<Link href={asRoute("/")} className="cms-home-link">FFDGN home</Link></div>;
}
export async function managedWebsitePage(path:string) {
  const page=await getWebsitePage(path);
  return page && page.layout !== "extend" ? <WebsitePageView page={page} /> : null;
}
export async function WebsiteExtraSections({ page }: { page: WebsitePage }) {
  const sections = await Promise.all(page.sections.filter(section => !section.hidden).map(async section => <div key={section.id}>{await Section({section})}</div>));
  return <div className="cms-public-page cms-page-extension mx-auto max-w-shell px-5 pb-12">{sections}</div>;
}
