import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Reveal from "@/components/ui/reveal";
import Section, { SectionHeader, cardAccent } from "@/components/ui/section";
import CaseStudyGrid from "@/components/case-study/case-study-grid";
import { CASE_STUDIES } from "@/data/case-studies";
import { PROJECTS, type Project } from "@/data/projects";

function ProjectCard({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const number = String(index + 1).padStart(2, "0");

  return (
    <article
      className="card-accent group flex flex-col border-r border-b border-line"
      style={cardAccent(index)}
    >
      <div className="hud-label flex items-center justify-between border-b border-line px-5 py-3 text-faint sm:px-6">
        <span className="text-ink">{number}</span>
        <span>{project.dates}</span>
      </div>

      <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-bg-sunken">
        {project.image ? (
          <Image
            src={project.image}
            alt={`${project.title} screenshot`}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-500 group-hover:scale-[1.02] md:grayscale md:group-hover:grayscale-0"
          />
        ) : (
          // Client work has no public screenshots: show a typographic plate
          <div className="flex h-full flex-col justify-between bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:32px_32px] p-6">
            <span className="hud-label text-faint">
              {project.links.length === 0 ? "Client work · NDA" : "Preview"}
            </span>
            <span className="font-display text-5xl font-medium tracking-tight text-ink-strong md:text-6xl">
              {project.plate ?? project.title.split(" ")[0]}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="font-display text-2xl font-medium tracking-tight text-ink-strong">
          {project.title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
          {project.description}
        </p>
        <p className="mt-4 text-sm text-accent-ink">↳ {project.highlight}</p>
        <p className="hud-label mt-5 leading-relaxed text-faint">
          {project.technologies.join(" / ")}
        </p>

        {project.caseStudy && (
          <div className="mt-6 flex gap-6 border-t border-line pt-4">
            <Link
              href={`/work/${project.caseStudy}`}
              className="hud-label group/link inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink"
            >
              Read case study
              <ArrowRight
                size={12}
                className="transition-transform group-hover/link:translate-x-0.5"
              />
            </Link>
          </div>
        )}

        {project.links.length > 0 && (
          <div className="mt-6 flex gap-6 border-t border-line pt-4">
            {project.links.map((link) => (
              <Link
                key={link.type}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hud-label inline-flex items-center gap-1.5 text-muted transition-colors hover:text-ink"
              >
                {link.type}
                <ArrowUpRight size={12} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

// `reveal`: stagger the cards in on scroll (home page only)
export function ProjectGrid({
  projects,
  reveal = false,
}: {
  projects: Project[];
  reveal?: boolean;
}) {
  const className = "grid border-t border-l border-line md:grid-cols-2";
  const cards = projects.map((project, i) => (
    <ProjectCard key={project.title} project={project} index={i} />
  ));
  return reveal ? (
    <Reveal stagger className={className}>
      {cards}
    </Reveal>
  ) : (
    <div className={className}>{cards}</div>
  );
}

export default function Projects() {
  const featured = PROJECTS.filter((p) => p.featured);

  return (
    <Section id="projects">
      <SectionHeader
        index="03"
        label="Projects"
        title={
          <>
            Selected <span className="serif-accent">work</span>.
          </>
        }
        intro="Factory software I built for clients and personal projects you can explore."
        action={{ href: "/projects", label: "All projects" }}
      />
      <p className="hud-label mb-4 text-muted">Client case studies</p>
      <CaseStudyGrid studies={CASE_STUDIES} reveal />
      <p className="hud-label mt-16 mb-4 text-muted">Personal projects</p>
      <ProjectGrid projects={featured} reveal />
    </Section>
  );
}
