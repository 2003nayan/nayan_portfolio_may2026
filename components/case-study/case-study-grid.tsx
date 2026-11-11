import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/reveal";
import StatValue from "@/components/ui/stat-value";
import { cardAccent } from "@/components/ui/section";
import type { CaseStudy } from "@/data/case-studies";

function CaseStudyCard({ study, index }: { study: CaseStudy; index: number }) {
  const number = String(index + 1).padStart(2, "0");
  const headline = study.stats[0];

  return (
    <Link
      href={`/work/${study.slug}`}
      className="card-accent group flex flex-col border-r border-b border-line transition-colors hover:bg-bg-raised"
      style={cardAccent(index)}
    >
      <div className="hud-label flex items-center justify-between border-b border-line px-5 py-3 text-faint sm:px-6">
        <span className="text-ink">{number}</span>
        <span>{study.location}</span>
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="hud-label text-accent-ink">{study.client}</p>
        <h3 className="mt-3 font-display text-2xl font-medium tracking-tight text-ink-strong">
          {study.title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
          {study.summary}
        </p>

        <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-4">
          <div>
            <p className="font-display text-2xl font-medium tracking-tight text-ink-strong">
              <StatValue value={headline.value} />
            </p>
            <p className="hud-label mt-1 text-faint">{headline.label}</p>
          </div>
          <span className="hud-label inline-flex items-center gap-2 text-muted transition-colors group-hover:text-ink">
            Read case study
            <ArrowRight
              size={12}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}

// `reveal`: stagger the cards in on scroll (home page only)
export default function CaseStudyGrid({
  studies,
  reveal = false,
}: {
  studies: CaseStudy[];
  reveal?: boolean;
}) {
  const className = "grid border-t border-l border-line md:grid-cols-2";
  const cards = studies.map((study, i) => (
    <CaseStudyCard key={study.slug} study={study} index={i} />
  ));
  return reveal ? (
    <Reveal stagger className={className}>
      {cards}
    </Reveal>
  ) : (
    <div className={className}>{cards}</div>
  );
}
