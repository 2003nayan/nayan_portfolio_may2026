import Link from "next/link";
import { ExternalLink, GitMerge, GitPullRequest } from "lucide-react";
import { OSS_CONTRIBUTIONS, OSS_STATS } from "@/data/opensource";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Source",
  description:
    "Real bug fixes and security improvements contributed to Bruno and Supabase — 100K+ stars repos.",
};

export default function OpenSourcePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
      <div className="mb-12">
        <p className="section-label mb-3">Open Source</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          Contributing to the Ecosystem
        </h1>
        <p className="text-[#A0A0A0] text-base max-w-xl">
          Real bug fixes and security improvements — not documentation typos.
          Active PRs open in Bruno and Supabase, 100K+ stars repos.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          {
            value: OSS_STATS.stars,
            label: "Repository Stars",
            sub: OSS_STATS.starsRepo,
          },
          { value: OSS_STATS.totalPrs, label: "Total PRs" },
          { value: OSS_STATS.merged, label: "Open PRs" },
        ].map((s) => (
          <div key={s.label} className="card text-center space-y-1">
            <p className="text-white text-2xl sm:text-4xl font-bold leading-tight">{s.value}</p>
            <p className="text-[#606060] text-[10px] sm:text-xs font-semibold tracking-wider uppercase leading-tight">
              {s.label}
            </p>
            {s.sub && (
              <p className="text-[#606060] text-[10px] sm:text-xs font-mono">{s.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* All PRs */}
      <div className="space-y-3">
        {OSS_CONTRIBUTIONS.map((pr) => (
          <div
            key={pr.prNumber}
            className="card flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
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
              <div className="min-w-0 space-y-1.5">
                <span className="text-[#606060] text-xs font-mono">
                  +{pr.additions} / -{pr.deletions}
                </span>
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
            <Link
              href={pr.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#606060] hover:text-white transition-colors flex-shrink-0"
              aria-label="View PR on GitHub"
            >
              <ExternalLink size={15} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
