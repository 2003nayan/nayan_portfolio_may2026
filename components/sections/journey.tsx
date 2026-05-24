"use client";

import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { JOURNEY_MILESTONES } from "@/data/journey";
import { Rocket, Star, TrendingUp, User } from "lucide-react";

const ICONS = [Rocket, Star, TrendingUp, User];

export default function Journey() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="journey" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref}
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-12">
            <div>
              <p className="section-label mb-3">Career Timeline</p>
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
                From Intern to Fortune 500
              </h2>
              <p className="text-[#A0A0A0] mt-3 text-base">
                15 months of relentless execution, not just time served.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2A2A2A] bg-[#141414] text-xs text-[#A0A0A0] font-mono">
                <span className="w-2 h-2 rounded-full bg-[#FF6B35] animate-pulse" />
                Currently @ Fortune 500 Client
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative ml-4">
            {/* Vertical line */}
            <div className="absolute left-0 top-0 bottom-0 w-px bg-[#2A2A2A]" />

            <ul className="space-y-0">
              {JOURNEY_MILESTONES.map((milestone, i) => {
                const Icon = ICONS[i] ?? User;
                return (
                  <li
                    key={milestone.title}
                    className="relative pl-10 pb-6 last:pb-0"
                  >
                    {/* Dot */}
                    <div
                      className={`absolute left-[-5px] top-5 w-3 h-3 rounded-full border-2 ${
                        milestone.current
                          ? "border-[#FF6B35] bg-[#FF6B35]"
                          : "border-[#2A2A2A] bg-[#0A0A0A]"
                      }`}
                    />
                    {/* Active gradient line overlay */}
                    {milestone.current && (
                      <div className="absolute left-[-0.5px] top-5 w-px h-full bg-gradient-to-b from-[#FF6B35] to-transparent" />
                    )}

                    {/* Card */}
                    <div className="card">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                            <Icon size={16} className="text-[#A0A0A0]" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">
                              {milestone.title}
                            </h3>
                            <p className="text-[#606060] text-sm">
                              {milestone.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="px-2 py-0.5 bg-[#1C1C1C] border border-[#2A2A2A] rounded text-[#A0A0A0] text-xs font-mono">
                            {milestone.dates}
                          </span>
                          <span className="text-[#ffffff] text-xs">
                            {milestone.location}
                          </span>
                        </div>
                      </div>

                      <ul className="mt-4 space-y-2">
                        {milestone.description.map((point, pi) => (
                          <li
                            key={pi}
                            className="flex items-start gap-2 text-[#A0A0A0] text-sm"
                          >
                            <span className="text-[#FF6B35] mt-0.5 flex-shrink-0">
                              ›
                            </span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
