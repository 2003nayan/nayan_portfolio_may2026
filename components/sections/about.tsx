"use client";

import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { Terminal, Rocket, Code2, Coffee } from "lucide-react";

export default function About() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="about" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref}
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          {/* Label */}
          <p className="section-label mb-3">About</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-12">
            A little context
          </h2>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Short Bio — spans 1 full row on md */}
            <div className="card md:col-span-1 space-y-3">
              <div className="flex items-center gap-2 text-[#A0A0A0] text-xs font-semibold tracking-widest uppercase">
                <Terminal size={13} className="text-[#FF6B35]" />
                The Short Version
              </div>
              <p className="text-white text-md leading-relaxed">
                I&apos;m a Full Stack Engineer at AI4M Technology, Pune.
                Started as the only fresher deployed to a Fortune 500 client
                site — then became the solo technical owner. Since then: three
                client deployments across India and the Philippines. React,
                FastAPI, WebSockets, PostgreSQL, CI/CD — 24 months of
                non-stop execution.
              </p>
            </div>

            {/* Fortune 500 */}
            <div className="card flex flex-col justify-between space-y-4">
              <Rocket size={20} className="text-[#FF6B35]" />
              <div>
                <p className="text-white text-4xl font-bold">Fortune 500</p>
                <p className="text-[#606060] text-xs font-semibold tracking-widest uppercase mt-1">
                  Client Deployment
                </p>
                <p className="text-[#A0A0A0] text-sm mt-3">
                  3 client deployments — including international onsite
                </p>
              </div>
            </div>

            {/* 7+ Projects */}
            <div className="card flex flex-col justify-between space-y-4">
              <Code2 size={20} className="text-[#FF6B35]" />
              <div>
                <p className="text-white text-4xl font-bold">7+</p>
                <p className="text-[#606060] text-xs font-semibold tracking-widest uppercase mt-1">
                  B2B Solutions Shipped
                </p>
                <p className="text-[#A0A0A0] text-sm mt-3">
                  Next.js, PostgreSQL, authentication systems
                </p>
              </div>
            </div>

            {/* Day to Day — Stack breakdown */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 text-[#A0A0A0] text-xs font-semibold tracking-widest uppercase">
                <Code2 size={13} className="text-[#FF6B35]" />
                Day to Day
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Frontend", detail: "React, Next.js, Tailwind" },
                  { label: "Backend", detail: "Python, Flask, Node.js" },
                  { label: "Data", detail: "PostgreSQL, MongoDB, Redis" },
                  { label: "DevOps", detail: "Docker, CI/CD, Nginx" },
                ].map((item) => (
                  <div key={item.label} className="bg-[#1C1C1C] rounded-lg p-3">
                    <p className="text-white text-sm font-semibold">
                      {item.label}
                    </p>
                    <p className="text-[#606060] text-xs mt-0.5">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 6 PRs */}
            <div className="card flex flex-col justify-between space-y-4">
              <svg
                className="text-[#FF6B35] w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <path d="M6 9v12" />
              </svg>
              <div>
                <p className="text-white text-4xl font-bold">6 PRs</p>
                <p className="text-[#606060] text-xs font-semibold tracking-widest uppercase mt-1">
                  Merged to Bruno
                </p>
                <p className="text-[#A0A0A0] text-sm mt-3">
                  25K+ stars repo — real bug fixes &amp; security
                </p>
              </div>
            </div>

            {/* Fun / caffeine */}
            <div className="card flex flex-col justify-between space-y-4 bg-[#1A1008] border-[#3A2A1A]">
              <Coffee size={20} className="text-[#FF6B35]" />
              <p className="text-[#A0A0A0] text-sm leading-relaxed">
                Fueled by caffeine and the satisfaction of watching green CI
                builds. When I&apos;m not shipping code, I&apos;m probably
                reading about system design.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
