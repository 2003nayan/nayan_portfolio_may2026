import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { CONTAINER } from "@/components/ui/section";
import Architecture from "@/components/case-study/architecture";
import StatValue from "@/components/ui/stat-value";
import { CASE_STUDIES, getCaseStudy } from "@/data/case-studies";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CASE_STUDIES.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudy(slug);
  if (!study) return {};
  return {
    title: `${study.client} — ${study.title}`,
    description: study.summary,
  };
}

// "01 / The problem" row: label column on the left, content on the right.
function Block({
  index,
  label,
  children,
}: {
  index: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-line py-12 md:grid-cols-[220px_1fr] md:gap-10 md:py-16">
      <p className="hud-label text-muted md:sticky md:top-24 md:self-start">
        <span className="text-ink">{index}</span>
        <span className="mx-2 text-faint">/</span>
        {label}
      </p>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) notFound();

  const position = CASE_STUDIES.findIndex((c) => c.slug === study.slug);
  const next = CASE_STUDIES[(position + 1) % CASE_STUDIES.length];

  const meta = [
    { label: "Client", value: study.client },
    { label: "Where", value: study.location },
    { label: "When", value: study.dates },
    { label: "My role", value: study.role },
  ];

  return (
    <article>
      <header className="border-b border-line">
        <div className={`${CONTAINER} pt-16 pb-14 md:pt-24 md:pb-20`}>
          <p className="hud-label text-muted">
            <Link href="/" className="transition-colors hover:text-ink">
              Index
            </Link>
            <span className="mx-2 text-faint">/</span>
            <Link href="/work" className="transition-colors hover:text-ink">
              Case studies
            </Link>
            <span className="mx-2 text-faint">/</span>
            <span className="text-ink">{study.client}</span>
          </p>
          <p className="hud-label mt-8 text-accent-ink">{study.client}</p>
          <h1 className="display-1 mt-3 max-w-5xl">{study.title}</h1>
          <p className="mt-6 max-w-2xl text-base text-muted md:text-lg">
            {study.summary}
          </p>

          <dl className="mt-12 grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-4">
            {meta.map((item) => (
              <div key={item.label} className="border-r border-b border-line p-4">
                <dt className="hud-label text-faint">{item.label}</dt>
                <dd className="mt-2 text-sm text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>

          <dl className="grid grid-cols-2 border-l border-line lg:grid-cols-4">
            {study.stats.map((stat) => (
              // Label sits under the number visually, but <dt> must come first
              <div
                key={stat.label}
                className="flex flex-col-reverse justify-end border-r border-b border-line p-4"
              >
                <dt className="hud-label mt-2 text-faint">{stat.label}</dt>
                <dd className="font-display text-3xl font-medium tracking-tight text-ink-strong md:text-4xl">
                  <StatValue value={stat.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <div className={`${CONTAINER} pb-8`}>
        <Block index="01" label="The problem">
          <div className="max-w-3xl space-y-4 text-base leading-relaxed text-muted md:text-lg">
            {study.problem.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Block>

        <Block index="02" label="My role">
          <div className="max-w-3xl space-y-4 text-base leading-relaxed text-muted md:text-lg">
            {study.ownership.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Block>

        <Block index="03" label="Architecture">
          <Architecture tiers={study.architecture} />
          {study.architectureNote && (
            <p className="mt-4 max-w-3xl text-sm text-muted">
              ↳ {study.architectureNote}
            </p>
          )}
        </Block>

        <Block index="04" label="What I built">
          <ul className="grid border-t border-l border-line sm:grid-cols-2">
            {study.built.map((item) => (
              <li key={item.title} className="border-r border-b border-line p-5">
                <h3 className="font-display text-lg font-medium tracking-tight text-ink-strong">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </Block>

        <Block index="05" label="Hard parts">
          <div className="space-y-10">
            {study.challenges.map((c) => (
              <div key={c.title} className="max-w-3xl">
                <h3 className="font-display text-xl font-medium tracking-tight text-ink-strong md:text-2xl">
                  {c.title}
                </h3>
                <p className="hud-label mt-5 text-faint">Problem</p>
                <p className="mt-2 leading-relaxed text-muted">{c.problem}</p>
                <p className="hud-label mt-5 text-accent-ink">Solution</p>
                <p className="mt-2 leading-relaxed text-ink">{c.solution}</p>
              </div>
            ))}
          </div>
        </Block>

        <Block index="06" label="Results">
          <ul className="max-w-3xl space-y-3">
            {study.results.map((r) => (
              <li key={r} className="flex gap-3 leading-relaxed text-ink">
                <span className="mt-2.5 size-1.5 shrink-0 bg-accent" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
        </Block>

        <Block index="07" label="Stack">
          <ul className="flex flex-wrap gap-2">
            {study.stack.map((tech) => (
              <li key={tech} className="hud-label border border-line px-3 py-2 text-muted">
                {tech}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-sm text-faint">
            Client work under NDA: diagrams are simplified and no client screens,
            code or data are shown.
          </p>
        </Block>
      </div>

      <div className="border-t border-line">
        <div className={`${CONTAINER} flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between`}>
          <Link
            href="/work"
            className="hud-label inline-flex items-center gap-2 text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={13} />
            All case studies
          </Link>
          <Link
            href={`/work/${next.slug}`}
            className="group inline-flex items-center gap-3 text-right"
          >
            <span>
              <span className="hud-label block text-faint">Next · {next.client}</span>
              <span className="font-display text-lg font-medium tracking-tight text-ink-strong">
                {next.title}
              </span>
            </span>
            <ArrowRight
              size={16}
              className="text-muted transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
