"use client";

import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { SKILLS_ROW_1, SKILLS_ROW_2 } from "@/data/skills";

function SkillPill({ label }: { label: string }) {
  return <span className="skill-pill">{label}</span>;
}

function MarqueeRow({
  skills,
  reverse = false,
}: {
  skills: string[];
  reverse?: boolean;
}) {
  // Duplicate for seamless loop
  const doubled = [...skills, ...skills];

  return (
    <div className="marquee-wrapper py-1">
      <div className={reverse ? "marquee-track-reverse" : "marquee-track"}>
        {doubled.map((skill, i) => (
          <SkillPill key={`${skill}-${i}`} label={skill} />
        ))}
      </div>
    </div>
  );
}

export default function Technologies() {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section id="technologies" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref}
          className={`transition-all duration-700 mb-12 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p className="section-label mb-3">Technologies</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Tools I Work With
          </h2>
          <p className="text-[#A0A0A0] mt-3 text-base">
            An honest stack — focused on what I actually use in production.
          </p>
        </div>
      </div>

      {/* Full-width marquee (breaks out of container) */}
      <div className="space-y-3">
        <MarqueeRow skills={SKILLS_ROW_1} />
        <MarqueeRow skills={SKILLS_ROW_2} reverse />
      </div>
    </section>
  );
}
