import { websiteMetadata } from "@/lib/website-repo";
import { managedWebsitePage } from "@/components/website-page";
import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { getSettings } from "@/lib/repo";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const managed = await managedWebsitePage("/contact");
  if (managed) return managed;

  const [params, settings] = await Promise.all([searchParams, getSettings()]);
  const subject = params.subject ?? "";
  return (
    <div className="contact-page mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Contact the Secretariat" }]} />
      <SectionHeading as="h1" eyebrow="Secretariat" title="Contact the Secretariat" lede="The Secretariat provides administrative, research and coordination support to the Forum and its activities." />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <aside className="h-fit bg-forest-950 p-7 text-white">
          <p className="eyebrow-light">Secretariat address</p>
          <ul className="mt-4 space-y-4 text-sm text-white/80">
            <li className="flex gap-2.5"><MapPin size={16} className="mt-0.5 text-gold" /> {settings["contact.address"]}</li>
            <li className="flex gap-2.5"><Phone size={16} className="mt-0.5 text-gold" /> {settings["site.phone"]}</li>
            <li className="flex gap-2.5"><Mail size={16} className="mt-0.5 text-gold" /> {settings["site.email"]}</li>
            <li className="flex gap-2.5"><Clock size={16} className="mt-0.5 text-gold" /> {settings["contact.hours"]}</li>
          </ul>
          <div className="mt-6 border-t border-white/15 pt-5">
            <p className="eyebrow-light">{settings["contact.conference_title"]}</p>
            <ul className="mt-3 space-y-2.5 text-sm text-white/80">
              <li className="flex gap-2.5"><Phone size={16} className="mt-0.5 text-gold" /> {settings["contact.conference_phone"]}</li>
              <li className="flex gap-2.5"><Mail size={16} className="mt-0.5 text-gold" /> {settings["contact.conference_email"]}</li>
            </ul>
          </div>
        </aside>
        <ContactForm subject={subject} />
      </div>
    </div>
  );
}

export async function generateMetadata() {return await websiteMetadata("/contact") ?? {}; }
