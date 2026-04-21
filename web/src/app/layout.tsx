import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader, SiteFooter } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Vetly — source-trust signals for the open web",
  description:
    "Vetly rates publisher trust on a transparent methodology: AI-generated-content probability, citations, byline, freshness, ad density, editorial bias markers. Free for everyone, donation-supported. Chrome extension + web.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        <div className="min-h-[calc(100vh-110px)]">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
