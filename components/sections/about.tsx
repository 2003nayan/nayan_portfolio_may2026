import Reveal from "@/components/ui/reveal";
import StatValue from "@/components/ui/stat-value";
import Section, { SectionHeader } from "@/components/ui/section";
import { SITE } from "@/data/site";

const HIGHLIGHTS = [
  {
    value: "10 → 36",
    label: "Machines covered by one platform",
    detail: "Only full-stack developer on a factory operations platform for a global consumer goods company.",
  },
  {
    value: "4",
    label: "Client case studies",
    detail: "Factory software projects featured in this portfolio.",
  },
  {
    value: "2h → 15m",
    label: "Time to roll out updates",
    detail: "I automated how software updates reach the factory floor.",
  },
];

const STACK = [
  { label: "Frontend", detail: "React, Next.js, TypeScript, TanStack Query, Three.js" },
  { label: "Backend", detail: "Python, FastAPI, Node.js, WebSockets, ZeroMQ" },
  { label: "Data", detail: "PostgreSQL, TimescaleDB, SQL" },
  { label: "Industrial & DevOps", detail: "PLC integration (EtherNet/IP, SLMP), Docker, GitLab CI/CD, AWS, Azure" },
];

export default function About() {
  const [lead, ...rest] = SITE.bio.split("\n\n");

  return (
    <Section id="about">
        <SectionHeader
          index="01"
          label="About"
          title={
            <>
              A little <span className="serif-accent">context</span>.
            </>
          }
        />

        <Reveal stagger className="grid gap-12 md:grid-cols-12">
          <div className="space-y-5 text-base leading-relaxed md:col-span-7 md:text-lg">
            <p className="text-ink">{lead}</p>
            {rest.map((paragraph) => (
              <p key={paragraph} className="text-muted">
                {paragraph}
              </p>
            ))}
          </div>
          <figure className="border-l border-accent pl-6 md:col-span-5">
            <figcaption className="hud-label text-faint">How I got started</figcaption>
            <blockquote className="mt-4 font-serif text-2xl leading-snug text-ink md:text-[1.75rem]">
              “{SITE.careerStart}”
            </blockquote>
          </figure>
        </Reveal>

        {/* Highlights: shared-edge grid */}
        <Reveal
          as="dl"
          stagger
          className="mt-16 grid border-t border-l border-line sm:grid-cols-3 md:mt-20"
        >
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.label}
              className="flex flex-col-reverse justify-end border-r border-b border-line p-6 md:p-8"
            >
              <p className="mt-3 text-sm text-muted">{item.detail}</p>
              <dt className="hud-label mt-2 text-faint">{item.label}</dt>
              <dd className="font-display text-3xl font-medium tracking-tight text-ink-strong md:text-4xl">
                <StatValue value={item.value} />
              </dd>
            </div>
          ))}
        </Reveal>

        {/* Day-to-day stack */}
        <Reveal stagger className="grid border-l border-line sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((item, i) => (
            <div
              key={item.label}
              className="invert-block group border-r border-b border-line p-6 hover:bg-invert-bg hover:text-invert-fg md:p-8"
            >
              <p className="hud-label text-faint group-hover:text-invert-fg/60">
                {String.fromCharCode(65 + i)} / Day to day
              </p>
              <p className="mt-6 font-display text-2xl font-medium tracking-tight">
                {item.label}
              </p>
              <p className="mt-1 font-mono text-xs text-muted group-hover:text-invert-fg/70">
                {item.detail}
              </p>
            </div>
          ))}
        </Reveal>
    </Section>
  );
}
