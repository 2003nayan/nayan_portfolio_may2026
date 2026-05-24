"use client";

import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/icons";
import { SITE } from "@/data/site";

export default function Hero() {
  return (
    <section id="hero" className="min-h-screen flex items-center pt-16">
      <div className="max-w-7xl mx-auto px-6 w-full py-20">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-12">
          {/* Left Content */}
          <div className="flex flex-col space-y-6">
            {/* Available Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#FF6B35] w-fit bg-[#141414] text-xs font-semibold tracking-widest uppercase text-[#A0A0A0]">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[#FF6B35]">
                Available for Opportunities
              </span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
                I build &amp; own
                <br />
                <span className="text-[#FF6B35]">production systems</span>
              </h1>
            </div>

            {/* Sub-description */}
            <p className="text-[#A0A0A0] text-base sm:text-lg max-w-xl leading-relaxed">
              {SITE.shortBio}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-3 text-sm text-[#A0A0A0]">
              <span>📍 {SITE.location}</span>
              <span className="text-[#2A2A2A]">·</span>
              <Link
                href={SITE.companyUrl}
                target="_blank"
                className="text-[#FF6B35] hover:underline"
              >
                {SITE.company}
              </Link>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                href="#projects"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B35] text-white text-sm font-semibold rounded-xl hover:bg-[#E0E0E0] hover:text-black transition-colors"
              >
                <ExternalLink size={14} />
                View Projects
              </Link>
              <Link
                href={SITE.resume}
                target="_blank"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#2A2A2A] text-white text-sm font-semibold rounded-xl hover:border-[#3A3A3A] hover:bg-[#141414] transition-colors"
              >
                <FileText size={14} />
                Resume
              </Link>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-1">
              {[
                {
                  href: SITE.social.github,
                  icon: <GithubIcon size={16} />,
                  label: "GitHub",
                },
                {
                  href: SITE.social.linkedin,
                  icon: <LinkedinIcon size={16} />,
                  label: "LinkedIn",
                },
                { href: SITE.social.x, icon: <XIcon size={16} />, label: "X" },
              ].map(({ href, icon, label }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-xl border border-[#2A2A2A] flex items-center justify-center text-[#A0A0A0] hover:border-[#FF6B35] hover:text-white transition-all"
                >
                  {icon}
                </Link>
              ))}
            </div>
          </div>

          {/* Right — Profile Card */}
          <div className="w-full lg:w-auto flex-1">
            <div className="bg-[#141414] border border-[#2A2A2A] mx-auto rounded-2xl p-8 w-full lg:w-72 space-y-6">
              {/* Avatar */}
              <div className="w-32 h-32 rounded-2xl bg-[#FF6B35] flex items-center justify-center mx-auto">
                <span className="text-white text-4xl font-bold">
                  {SITE.initials}
                </span>
              </div>

              {/* Name & Role */}
              <div className="flex flex-col items-center">
                <p className="text-white font-semibold text-lg">
                  {SITE.description}
                </p>
                <p className="text-[#606060] text-sm mt-1">
                  React · FastAPI · Python
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-0">
                {[
                  { value: SITE.stats.months, label: "MONTHS" },
                  { value: SITE.stats.projects, label: "PROJECTS" },
                  { value: SITE.stats.ossPrs, label: "OSS PRS" },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className={`text-center ${i < 2 ? "border-r border-[#2A2A2A]" : ""}`}
                  >
                    <p className="text-white text-xl font-bold">{stat.value}</p>
                    <p className="text-[#606060] text-[10px] font-semibold tracking-widest mt-0.5">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="flex justify-center mt-16">
          <div className="w-6 h-10 border-2 border-[#2A2A2A] rounded-full flex justify-center pt-2">
            <div className="w-1 h-2 bg-[#FF6B35] rounded-full animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}
