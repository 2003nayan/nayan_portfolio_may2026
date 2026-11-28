import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/ui/reveal";
import Section, { SectionHeader } from "@/components/ui/section";
import StatusChip from "@/components/ui/status-chip";
import {
  OSS_CONTRIBUTIONS,
  OSS_STATS,
  type OSSContribution,
} from "@/data/opensource";

export const OSS_INTRO =
  "I’ve submitted fixes to Bruno and Supabase on GitHub. They prevent lost form data, protect credentials during redirects, and catch broken invitation settings.";

export function OssStats() {
  const openCount = OSS_CONTRIBUTIONS.filter((contribution) => contribution.status === "open").length;
  const stats = [
    { value: OSS_STATS.stars, label: "Combined GitHub stars for Bruno and Supabase" },
    { value: OSS_CONTRIBUTIONS.length, label: "Pull requests submitted" },
    { value: openCount, label: "Open pull requests" },
  ];

  return (
    <dl className="grid grid-cols-3 border-t border-l border-line">
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex flex-col-reverse justify-end border-r border-b border-line p-4 sm:p-6 md:p-8"
        >
          <dt className="hud-label mt-2 text-faint">{s.label}</dt>
          <dd className="font-display text-3xl font-medium tracking-tight text-ink-strong md:text-5xl">
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function PrList({
  prs,
  compact = false,
}: {
  prs: OSSContribution[];
  compact?: boolean;
}) {
  return (
    <ul className="border-t border-line">
      {prs.map((pr) => (
        <li key={pr.prNumber} className="border-b border-line">
          <Link
            href={pr.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group grid gap-x-8 gap-y-3 py-6 transition-colors hover:bg-bg-raised md:grid-cols-12 md:py-8"
          >
            <div className="flex flex-wrap items-center gap-3 md:col-span-3 md:flex-col md:items-start">
              <StatusChip status={pr.status} />
              <span className="hud-label text-faint">
                <span className="text-ink">{pr.project}</span> #{pr.prNumber} ·{" "}
                {pr.dates}
              </span>
            </div>

            <div className="md:col-span-8">
              <h3 className="font-display text-lg font-medium tracking-tight text-ink-strong md:text-xl">
                {pr.title}
              </h3>
              <p
                className={`mt-2 text-sm leading-relaxed text-muted ${compact ? "line-clamp-2" : ""}`}
              >
                {pr.description}
              </p>
              <p className="hud-label mt-3 text-faint">
                {pr.technologies.join(" / ")}
                {pr.additions + pr.deletions > 0 &&
                  ` · +${pr.additions} −${pr.deletions}`}
              </p>
            </div>

            <ArrowUpRight
              size={18}
              aria-hidden="true"
              className="hidden justify-self-end text-faint transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink md:col-span-1 md:block"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function OpenSource() {
  const featured = OSS_CONTRIBUTIONS.filter((c) => c.featured);

  return (
    <Section id="opensource">
      <SectionHeader
        index="05"
        label="Open Source"
        title={
          <>
            Contributing to the{" "}
            <span className="serif-accent">ecosystem</span>.
          </>
        }
        intro={OSS_INTRO}
        action={{ href: "/open-source", label: "All contributions" }}
      />
      <Reveal>
        <OssStats />
      </Reveal>
      <Reveal className="mt-12">
        <PrList prs={featured} compact />
      </Reveal>
    </Section>
  );
}
