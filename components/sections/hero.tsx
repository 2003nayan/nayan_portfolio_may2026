import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageSquare } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import Button from "@/components/ui/button";
import LocalTime from "@/components/ui/local-time";
import { CONTAINER } from "@/components/ui/section";
import HeroScene from "@/components/sections/hero-scene";
import { SITE } from "@/data/site";
import { HOME_SECTIONS } from "@/data/sections";

const STATS = [
  { value: SITE.stats.months, label: "Months in production" },
  { value: SITE.stats.projects, label: "Projects shipped" },
  { value: SITE.stats.ossPrs, label: "Open-source PRs" },
];

// Position in the intro's staggered entrance (see .intro-rise in globals.css)
const rise = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function Hero() {
  return (
    <section id="hero">
      <div className="relative isolate flex min-h-[calc(100svh-3rem)] items-center justify-center overflow-hidden">
        <HeroScene />

        {/* Vignette keeps the copy legible over the cards */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_42%_46%_at_50%_50%,var(--bg)_25%,transparent_100%)] opacity-90"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t from-bg to-transparent"
        />

        <div className="relative z-20 flex flex-col items-center px-5 py-28 text-center">
          <h1 className="intro-rise" style={rise(0)}>
            <span className="wordmark">{SITE.name}</span>
          </h1>

          <p style={rise(1)} className="intro-rise mt-6 font-display text-[clamp(1.6rem,3.4vw,2.75rem)] font-semibold tracking-[-0.03em] text-ink-strong md:mt-8">
            {SITE.tagline}{" "}
            <span className="serif-accent font-normal text-muted">
              {SITE.taglineAccent}.
            </span>
          </p>

          <p style={rise(2)} className="intro-rise mt-5 max-w-xl text-base leading-relaxed text-muted md:text-lg">
            {SITE.description} at {SITE.company}. The only fresher sent onsite
            to a global FMCG plant, now building shopfloor platforms and digital
            twins for FMCG and spirits manufacturers across India and the Philippines.
          </p>

          <div style={rise(3)} className="intro-rise mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Button href="#projects" className="px-6">
              View work <ArrowRight size={13} />
            </Button>
            <Button href="#contact" variant="ghost" className="px-6">
              <MessageSquare size={13} /> Let&apos;s talk
            </Button>
          </div>
          <p style={rise(4)} className="intro-rise hud-label mt-3 text-faint">
            {SITE.location} · <LocalTime />
          </p>

          <p style={rise(5)} className="intro-rise mt-8 text-sm text-muted md:text-base">
            Want the short version?{" "}
            <Link
              href={SITE.resume}
              target="_blank"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
            >
              Read the resume
            </Link>{" "}
            or{" "}
            <Link
              href="#journey"
              className="text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
            >
              follow the journey
            </Link>
            .
          </p>

          <div style={rise(6)} className="intro-rise hud-label mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-faint">
            <span className="flex items-center gap-2 text-muted">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Available for opportunities
            </span>
            <span>React · FastAPI · Python</span>
            <Link
              href={SITE.social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 transition-colors hover:text-ink"
            >
              <GithubIcon size={12} /> GitHub <ArrowUpRight size={11} />
            </Link>
          </div>
        </div>

        {/* Section index, bottom-right. On xl the fixed section tracker
            takes over this spot, so this static copy hides there. */}
        <nav
          aria-label="Sections"
          className="absolute right-12 bottom-10 z-20 hidden text-right lg:block xl:hidden"
        >
          <ul>
            {HOME_SECTIONS.map((item) => (
              <li key={item.id}>
                <Link
                  href={`#${item.id}`}
                  className="font-display text-lg leading-tight font-bold tracking-tight text-faint uppercase transition-colors [font-stretch:115%] hover:text-ink-strong"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Stats strip */}
      <div className="border-t border-line">
        <dl className={`${CONTAINER} grid grid-cols-3`}>
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col-reverse py-6 md:py-8 ${i > 0 ? "border-l border-line pl-4 sm:pl-8" : ""}`}
            >
              <dt className="hud-label mt-2 text-faint">{stat.label}</dt>
              <dd className="font-display text-3xl font-medium tracking-tight text-ink-strong md:text-5xl">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
