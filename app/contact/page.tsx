import { Breadcrumbs } from "@/components/chrome";
import { SectionHeading } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const subject = (await searchParams).subject ?? "";
  return (
    <div className="mx-auto max-w-shell px-5 py-12">
      <Breadcrumbs items={[{ label: "Contact the Secretariat" }]} />
      <SectionHeading eyebrow="Secretariat" title="Contact the Secretariat" lede="The Secretariat provides administrative, research and coordination support to the Forum and its activities." />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <aside className="h-fit bg-forest-950 p-7 text-white">
          <p className="eyebrow-light">Secretariat address</p>
          <ul className="mt-4 space-y-4 text-sm text-white/80">
            <li className="flex gap-2.5"><MapPin size={16} className="mt-0.5 text-gold" /> No. 12 Pope John Paul II Street, Maitama, Abuja, Nigeria</li>
            <li className="flex gap-2.5"><Phone size={16} className="mt-0.5 text-gold" /> +234 9 4612 3456</li>
            <li className="flex gap-2.5"><Mail size={16} className="mt-0.5 text-gold" /> info@ffdgn.org.ng</li>
            <li className="flex gap-2.5"><Clock size={16} className="mt-0.5 text-gold" /> Mon – Fri, 8:00 AM – 5:00 PM</li>
          </ul>
          <div className="mt-6 border-t border-white/15 pt-5">
            <p className="eyebrow-light">5th National Conference enquiries</p>
            <ul className="mt-3 space-y-2.5 text-sm text-white/80">
              <li className="flex gap-2.5"><Phone size={16} className="mt-0.5 text-gold" /> 0803 301 3624 · 0916 894 2222</li>
              <li className="flex gap-2.5"><Mail size={16} className="mt-0.5 text-gold" /> annualconference@ffdgn.org.ng</li>
            </ul>
          </div>
        </aside>
        <ContactForm subject={subject} />
      </div>
    </div>
  );
}
