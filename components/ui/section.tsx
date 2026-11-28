import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/reveal";
import { sectionLabel } from "@/data/sections";

export const CONTAINER = "mx-auto w-full max-w-7xl px-5 sm:px-8";

// Home section column: the container boxed in by vertical rules on xl, so
// the full-width horizontal rules cross them like a grid.
export const SECTION_BOX = `${CONTAINER} py-20 md:py-32 xl:border-x xl:border-line`;

// Per-card hover colours for .card-accent, cycled by index. Same hues as the
// hero's orbit arcs so the page reads as one palette.
const CARD_COLORS = ["var(--accent)", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];

export function cardAccent(index: number) {
  return { "--card-color": CARD_COLORS[index % CARD_COLORS.length] } as React.CSSProperties;
}

// Section name running vertically in the right rail beside its section (xl).
// Decorative: the section tracker carries the same names accessibly.
export function RailLabel({ id }: { id?: string }) {
  const label = id && sectionLabel(id);
  if (!label) return null;
  return (
    <span aria-hidden="true" className="rail-label hidden xl:block">
      {label}
    </span>
  );
}

export default function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`relative border-t border-line ${className}`}>
      <div className={SECTION_BOX}>{children}</div>
      <RailLabel id={id} />
    </section>
  );
}

// "01 / About" row, then the display headline and an optional intro line.
// Reveals itself (index row first, then the headline), so sections only
// need to wrap their own content.
export function SectionHeader({
  index,
  label,
  title,
  intro,
  action,
  aside,
}: {
  index: string;
  label: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  action?: { href: string; label: string };
  aside?: React.ReactNode;
}) {
  return (
    <Reveal stagger className="mb-12 md:mb-16">
      <div className="mb-8 flex items-center justify-between gap-4 border-b border-line pb-4 md:mb-10">
        <p className="hud-label text-muted">
          <span className="text-ink">{index}</span>
          <span className="mx-2 text-faint">/</span>
          {label}
        </p>
        {action && (
          <Link
            href={action.href}
            className="hud-label group inline-flex items-center gap-2 text-muted transition-colors hover:text-ink"
          >
            {action.label}
            <ArrowRight
              size={12}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="display-2 max-w-3xl">{title}</h2>
          {intro && (
            <p className="mt-5 max-w-xl text-base text-muted md:text-lg">
              {intro}
            </p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </Reveal>
  );
}

// Header for standalone pages: breadcrumb, h1 and intro.
export function PageHeader({
  crumb,
  title,
  intro,
}: {
  crumb: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
}) {
  return (
    <header className="border-b border-line">
      <div className={`${CONTAINER} pt-16 pb-14 md:pt-24 md:pb-20`}>
        <p className="hud-label text-muted">
          <Link href="/" className="transition-colors hover:text-ink">
            Home
          </Link>
          <span className="mx-2 text-faint">/</span>
          <span className="text-ink">{crumb}</span>
        </p>
        <h1 className="display-1 mt-8 max-w-5xl">{title}</h1>
        {intro && (
          <p className="mt-6 max-w-xl text-base text-muted md:text-lg">
            {intro}
          </p>
        )}
      </div>
    </header>
  );
}
