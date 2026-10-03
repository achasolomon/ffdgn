import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Header, Footer, UtilityBar } from "@/components/chrome";
import { Providers } from "@/components/providers";
import { SiteFrame } from "@/components/site-frame";
import { getSettings, getSiteFooter, getSiteNavigation } from "@/lib/repo";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ffdgn.org.ng";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const title = settings["site.title"] ?? "FFDGN — Forum of Former Deputy Governors of Nigeria";
  const description = settings["site.description"] ?? "A national forum bringing together former Deputy Governors to share experience, strengthen institutional knowledge and contribute to Nigeria's development.";
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s · FFDGN" },
    description,
    openGraph: { type: "website", siteName: "FFDGN", title, description, url: SITE_URL, locale: "en_NG" },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Minted per request by proxy.ts. Handing it to the JSON-LD script lets the
  // page carry structured data without re-opening `'unsafe-inline'`.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const [settings, navigation, footer] = await Promise.all([getSettings(), getSiteNavigation(), getSiteFooter()]);
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings["site.title"] ?? "Forum of Former Deputy Governors of Nigeria",
    alternateName: "FFDGN",
    url: SITE_URL,
    email: settings["site.email"] ?? "info@ffdgn.org.ng",
    address: { "@type": "PostalAddress", addressLocality: settings["site.address"] ?? "Abuja, Nigeria", addressCountry: "NG" },
  };
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
          Skip to main content
        </a>
        <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <Providers>
        <SiteFrame>
        <UtilityBar settings={settings} />
        <Header settings={settings} navigation={navigation} />
        <main id="main" className="min-h-[60vh]">{children}</main>
        <Footer settings={settings} columns={footer} />
        </SiteFrame>
        </Providers>
      </body>
    </html>
  );
}
