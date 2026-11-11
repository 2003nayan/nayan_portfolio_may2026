import type { Metadata } from "next";
import { PageHeader, CONTAINER } from "@/components/ui/section";
import { ProjectGrid } from "@/components/sections/projects";
import { PROJECTS, CLIENT_PROJECTS } from "@/data/projects";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Production-grade projects with live demos and full source code.",
};

export default function ProjectsPage() {
  const all = [...PROJECTS, ...CLIENT_PROJECTS];

  return (
    <>
      <PageHeader
        crumb="Projects"
        title={
          <>
            All <span className="serif-accent">projects</span>.
          </>
        }
        intro="Production-grade projects with live demos and full source code, plus client platforms built under NDA."
      />
      <div className={`${CONTAINER} py-16 md:py-24`}>
        <ProjectGrid projects={all} />
      </div>
    </>
  );
}
