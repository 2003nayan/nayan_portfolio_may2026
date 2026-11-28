import type { Metadata } from "next";
import { PageHeader, CONTAINER } from "@/components/ui/section";
import { ProjectGrid } from "@/components/sections/projects";
import { PROJECTS, CLIENT_PROJECTS } from "@/data/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Explore personal projects and factory software case studies.",
};

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        crumb="Projects"
        title={
          <>
            All <span className="serif-accent">projects</span>.
          </>
        }
        intro="Explore personal projects with source code and available demos, plus case studies about software I built for factory teams."
      />
      <div className={`${CONTAINER} py-16 md:py-24`}>
        <h2 className="hud-label mb-4 text-muted">Personal projects</h2>
        <ProjectGrid projects={PROJECTS} />
        <h2 className="hud-label mt-16 mb-4 text-muted">Client case studies</h2>
        <ProjectGrid projects={CLIENT_PROJECTS} />
      </div>
    </>
  );
}
