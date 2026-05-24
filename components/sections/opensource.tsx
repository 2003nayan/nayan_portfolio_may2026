"use client";

import Link from "next/link";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { OSS_CONTRIBUTIONS, OSS_STATS } from "@/data/opensource";
import { ExternalLink, GitMerge, GitPullRequest } from "lucide-react";

function StatCard({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub?: string;
}) {
  return (
    <div className="card text-center space-y-1">
      <p className="text-white text-2xl sm:text-4xl font-bold leading-tight">{value}</p>
      <p className="text-[#606060] text-[10px] sm:text-xs font-semibold tracking-wider uppercase leading-tight">
        {label}
      </p>
      {sub && <p className="text-[#606060] text-[10px] sm:text-xs font-mono">{sub}</p>}
    </div>
  );
}

export default function OpenSource() {
  const { ref, isVisible } = useScrollAnimation();
  const featured = OSS_CONTRIBUTIONS.filter((c) => c.featured);

  return (
    <section id="opensource" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref}
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* Header */}
          <p className="section-label mb-3">Open Source</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            Contributing to the Ecosystem
          </h2>
          <p className="text-[#A0A0A0] mb-10 max-w-xl text-base">
            Real bug fixes and security improvements — not documentation typos.
            All merged into Bruno, a 25K+ stars API testing tool.
          </p>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatCard
              value={OSS_STATS.stars}
              label="Repository Stars"
              sub={OSS_STATS.starsRepo}
            />
            <StatCard value={OSS_STATS.totalPrs} label="Total PRs" />
            <StatCard value={OSS_STATS.merged} label="Open PRs" />
          </div>

          {/* PR List */}
          <div className="space-y-3">
            {featured.map((pr) => (
              <div
                key={pr.prNumber}
                className="card flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 group"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Status badge + date */}
                  <div className="flex-shrink-0 pt-0.5 space-y-1">
                    {pr.status === "merged" ? (
                      <span className="badge-merged">
                        <GitMerge size={10} />
                        Merged
                      </span>
                    ) : (
                      <span className="badge-open">
                        <GitPullRequest size={10} />
                        Open
                      </span>
                    )}
                    <p className="text-[#606060] text-xs font-mono text-center">
                      {pr.dates}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#606060] text-xs font-mono">
                        +{pr.additions} / -{pr.deletions}
                      </span>
                    </div>
                    <h3 className="text-white text-sm font-semibold leading-snug">
                      {pr.title}
                    </h3>
                    <p className="text-[#A0A0A0] text-sm leading-relaxed">
                      {pr.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pr.technologies.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 border border-[#2A2A2A] rounded text-[#A0A0A0] text-xs"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* External link */}
                <Link
                  href={pr.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#606060] hover:text-white transition-colors flex-shrink-0 mt-1"
                  aria-label="View PR"
                >
                  <ExternalLink size={15} />
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/open-source"
              className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm transition-colors"
            >
              View all contributions
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
