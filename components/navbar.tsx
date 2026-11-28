"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ui/theme-toggle";
import { SITE } from "@/data/site";

const NAV_LINKS = [
  { label: "Journey", href: "#journey", page: null },
  { label: "Projects", href: "#projects", page: "/projects" },
  { label: "Open Source", href: "#opensource", page: "/open-source" },
  { label: "Writing", href: "#writing", page: "/blog" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // On sub-pages, prefix hash links with "/" so they navigate home first
  const resolveHref = (href: string) =>
    href.startsWith("#") && !isHome ? `/${href}` : href;

  // Highlight the section currently crossing the upper third of the viewport.
  // Every section is observed (not just linked ones) so scrolling back to the
  // hero or about clears the highlight.
  useEffect(() => {
    if (!isHome) return;
    const sections = document.querySelectorAll<HTMLElement>("main section[id]");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-30% 0px -65% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHome]);

  const isActive = (link: (typeof NAV_LINKS)[number]) =>
    isHome
      ? activeSection === link.href
      : link.page !== null && (pathname.startsWith(link.page) || (link.page === "/projects" && pathname.startsWith("/work")));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="flex h-12 items-stretch justify-between">
        <div className="flex min-w-0 items-stretch">
          <Link
            href="/"
            className="flex items-center border-r border-line px-5 font-display text-lg font-semibold tracking-tight text-ink-strong transition-opacity hover:opacity-70 sm:px-6"
            aria-label={`${SITE.name}, home`}
          >
            NK<span className="text-accent">.</span>
          </Link>

          <nav className="hidden items-stretch px-2 lg:flex" aria-label="Primary">
            {NAV_LINKS.map((link, i) => (
              <Link
                key={link.href}
                href={resolveHref(link.href)}
                aria-current={isActive(link) ? "location" : undefined}
                className="group hud-label flex items-center px-1.5 whitespace-nowrap"
              >
                <span
                  className={`invert-block flex items-center gap-1.5 px-1.5 py-0.5 group-hover:bg-invert-bg group-hover:text-invert-fg ${
                    isActive(link) ? "bg-invert-bg text-invert-fg" : "text-muted"
                  }`}
                >
                  <span className="opacity-50">0{i + 1}</span>
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-stretch">
          <Link
            href={SITE.resume}
            target="_blank"
            className="hud-label hidden items-center gap-1.5 border-l border-line px-5 text-muted transition-colors hover:text-ink md:flex"
          >
            Resume
            <ArrowUpRight size={12} />
          </Link>
          <ThemeToggle className="w-12 border-l border-line" />
          <Link
            href={resolveHref("#contact")}
            className="invert-block hud-label hidden items-center gap-2 bg-invert-bg px-5 text-invert-fg hover:bg-accent hover:text-white sm:flex"
          >
            Let&apos;s talk
          </Link>
          <button
            type="button"
            className="invert-block flex w-12 items-center justify-center border-l border-line text-muted hover:bg-invert-bg hover:text-invert-fg lg:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <nav
          id="mobile-menu"
          className="border-t border-line bg-bg lg:hidden"
          aria-label="Mobile"
        >
          {[...NAV_LINKS, { label: "Contact", href: "#contact", page: null }].map(
            (link, i) => (
              <Link
                key={link.href}
                href={resolveHref(link.href)}
                onClick={() => setMobileOpen(false)}
                className="invert-block flex items-baseline gap-4 border-b border-line px-5 py-4 hover:bg-invert-bg hover:text-invert-fg"
              >
                <span className="hud-label opacity-50">0{i + 1}</span>
                <span className="font-display text-2xl font-medium tracking-tight">
                  {link.label}
                </span>
              </Link>
            ),
          )}
          <Link
            href={SITE.resume}
            target="_blank"
            onClick={() => setMobileOpen(false)}
            className="hud-label flex items-center gap-1.5 px-5 py-4 text-muted"
          >
            Download resume <ArrowUpRight size={12} />
          </Link>
        </nav>
      )}
    </header>
  );
}
