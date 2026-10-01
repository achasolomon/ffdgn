import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { Header, Footer, UtilityBar } from "@/components/chrome";
import { Providers } from "@/components/providers";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL("https://ffdgn.org.ng"),
  title: { default: "FFDGN — Forum of Former Deputy Governors of Nigeria", template: "%s · FFDGN" },
  description: "A national forum bringing together former Deputy Governors to share experience, strengthen institutional knowledge and contribute to Nigeria's development.",
  openGraph: { type: "website", siteName: "FFDGN", title: "Forum of Former Deputy Governors of Nigeria", description: "Experience in Service. Knowledge for the Future." },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Forum of Former Deputy Governors of Nigeria",
    alternateName: "FFDGN",
    url: "https://ffdgn.org.ng",
    address: { "@type": "PostalAddress", addressLocality: "Abuja", addressCountry: "NG" },
  };
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-ink">
          Skip to main content
        </a>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
        <Providers>
        <UtilityBar />
        <Header />
        <main id="main" className="min-h-[60vh]">{children}</main>
        <Footer />
        </Providers>
      </body>
    </html>
  );
}
