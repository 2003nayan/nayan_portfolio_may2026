import type { Metadata, Viewport } from "next";
import { Archivo, Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ScrollRuler from "@/components/ui/scroll-ruler";
import { SITE } from "@/data/site";
import { Analytics } from "@vercel/analytics/next";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

// Runs before first paint so a saved light preference never flashes dark.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

// Plays the home intro (components/ui/intro.tsx) on a full load of "/" with
// no hash, once per session, and never with reduced motion. Set before first
// paint so the overlay never flashes on visits that skip it.
const INTRO_SCRIPT = `try{if(location.pathname==="/"&&!location.hash&&!sessionStorage.getItem("intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.documentElement.dataset.intro="play";sessionStorage.setItem("intro","1")}}catch(e){}`;

export const viewport: Viewport = {
  themeColor: "#111214",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Full Stack Engineer`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.shortBio,
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
    title: `${SITE.name} — Full Stack Engineer`,
    description: SITE.shortBio,
    siteName: SITE.name,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Full Stack Engineer`,
    description: SITE.shortBio,
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
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${archivo.variable} ${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT + INTRO_SCRIPT }} />
        <noscript>
          <style>{`.reveal,.reveal-stagger>*{opacity:1!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-screen bg-bg text-ink antialiased">
        <Navbar />
        <ScrollRuler />
        <main>{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
