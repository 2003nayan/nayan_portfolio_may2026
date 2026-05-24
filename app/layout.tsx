import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { SITE } from "@/data/site";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — Full Stack Developer`,
    template: `%s | ${SITE.name}`,
  },
  description:
    "Full Stack Developer from Pune. The only fresher selected for a Fortune 500 client deployment — now the sole technical owner. React, Python, Flask, WebSockets, CI/CD.",
  keywords: [
    "Nayan Katiyara",
    "Full Stack Developer",
    "React",
    "Next.js",
    "Python",
    "Flask",
    "Pune",
    "Portfolio",
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE.url,
    title: `${SITE.name} — Full Stack Developer`,
    description:
      "Full Stack Developer from Pune. Fortune 500 client deployment owner. React, Python, Flask, WebSockets.",
    siteName: SITE.name,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Full Stack Developer`,
    description: "Full Stack Developer. Fortune 500 client owner. React, Python, Flask.",
    creator: "@NayanKatiyara",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,600,700,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-[#0A0A0A] text-white">
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
