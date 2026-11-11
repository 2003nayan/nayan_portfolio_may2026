import Reveal from "@/components/ui/reveal";
import Section, { SectionHeader } from "@/components/ui/section";
import { JOURNEY_MILESTONES } from "@/data/journey";
import { SITE } from "@/data/site";

export default function Journey() {
  return (
    <Section id="journey">
        <SectionHeader
          index="02"
          label="Journey"
          title={
            <>
              From intern to the{" "}
              <span className="serif-accent">factory floor</span>.
            </>
          }
          intro={`${SITE.stats.months} months of relentless execution, not just time served.`}
          aside={
            <span className="hud-label inline-flex items-center gap-2 border border-line px-3 py-2 text-muted">
              <span className="size-1.5 bg-accent" aria-hidden="true" />
              Currently @ Fortune Global 500 FMCG client
            </span>
          }
        />

        <Reveal as="ol" stagger className="border-t border-line">
          {JOURNEY_MILESTONES.map((milestone, i) => (
            <li
              key={milestone.title}
              className="grid gap-x-8 gap-y-4 border-b border-line py-8 transition-colors hover:bg-bg-raised md:grid-cols-12 md:py-10"
            >
              <div className="hud-label flex gap-4 text-faint md:col-span-3 md:flex-col md:gap-2">
                <span className="text-ink">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={milestone.current ? "text-accent-ink" : ""}>
                  {milestone.dates}
                </span>
                <span>{milestone.location}</span>
              </div>

              <div className="md:col-span-9">
                <h3 className="font-display text-2xl font-medium tracking-tight text-ink-strong md:text-3xl">
                  {milestone.title}
                </h3>
                <p className="mt-1 text-sm text-muted">{milestone.role}</p>
                <ul className="mt-5 max-w-3xl space-y-2.5">
                  {milestone.description.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 text-sm leading-relaxed text-muted md:text-base"
                    >
                      {/* Centred on the first line's lowercase letters (x-height),
                          measured: their middle sits 0.86em below the line top */}
                      <span
                        aria-hidden="true"
                        className="mt-[calc(0.86em-2px)] size-1 shrink-0 rounded-full bg-line-strong"
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </Reveal>
    </Section>
  );
}
