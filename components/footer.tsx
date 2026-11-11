import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { SITE } from "@/data/site";
import { CONTAINER } from "@/components/ui/section";

const COLUMNS = [
  {
    title: "Site",
    links: [
      { label: "Home", href: "/" },
      { label: "Journey", href: "/#journey" },
      { label: "Contact", href: "/#contact" },
      { label: "Resume", href: SITE.resume, external: true },
    ],
  },
  {
    title: "Work",
    links: [
      { label: "Projects", href: "/projects" },
      { label: "Open Source", href: "/open-source" },
      { label: "Writing", href: "/blog" },
    ],
  },
  {
    title: "Elsewhere",
    links: [
      { label: "GitHub", href: SITE.social.github, external: true },
      { label: "LinkedIn", href: SITE.social.linkedin, external: true },
      { label: "X", href: SITE.social.x, external: true },
      { label: "Medium", href: SITE.social.medium, external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-bg-raised">
      <div className={`${CONTAINER} grid gap-14 py-16 md:py-20 lg:grid-cols-12`}>
        <div className="lg:col-span-6">
          <p className="hud-label text-faint">Say hello</p>
          <a
            href={`mailto:${SITE.email}`}
            className="mt-4 inline-block font-display text-2xl font-medium tracking-tight break-all text-ink-strong transition-colors hover:text-accent-ink sm:text-4xl"
          >
            {SITE.email}
          </a>
          <p className="mt-4 max-w-sm text-sm text-muted">
            {SITE.description} based in {SITE.location}. Open to full-time
            roles and interesting problems.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="hud-label text-faint">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-ink"
                      {...("external" in link &&
                        link.external && {
                          target: "_blank",
                          rel: "noopener noreferrer",
                        })}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-line">
        <div
          className={`${CONTAINER} hud-label flex flex-col gap-3 py-5 text-faint sm:flex-row sm:items-center sm:justify-between`}
        >
          <p>
            © {new Date().getFullYear()} {SITE.name}
          </p>
          <p>Built with Next.js · Pune, India</p>
          <a
            href="#"
            className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
          >
            Back to top <ArrowUp size={12} />
          </a>
        </div>
      </div>
    </footer>
  );
}
