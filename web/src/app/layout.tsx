import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vetly — source-trust signals for Google search",
  description:
    "Vetly annotates Google search results with a trust badge — green, amber, or red — based on publisher reputation, AI-generated-content probability, citations, freshness, and ad density. Signal, not gate.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
