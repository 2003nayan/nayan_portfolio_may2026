import Link from "next/link";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { GithubIcon } from "@/components/icons";
import { PROJECTS, CLIENT_PROJECTS } from "@/data/projects";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Production-grade projects with live demos and full source code.",
};

export default function ProjectsPage() {
  const all = [...PROJECTS, ...CLIENT_PROJECTS];

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
      <div className="mb-12">
        <p className="section-label mb-3">Projects</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          All Projects
        </h1>
        <p className="text-[#A0A0A0] text-base">
          Production-grade projects with live demos and full source code.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {all.map((project) => (
          <div
            key={project.title}
            className="card p-0 overflow-hidden group flex flex-col"
          >
            {/* Image */}
            <div className="relative h-52 bg-[#1C1C1C] overflow-hidden">
              {project.image ? (
                <Image
                  src={project.image}
                  alt={project.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#2A2A2A]">
                  <span className="text-4xl font-bold">{project.title[0]}</span>
                </div>
              )}
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#0A0A0A]/80 backdrop-blur-sm rounded text-[#A0A0A0] text-xs font-mono border border-[#2A2A2A]">
                {project.dates}
              </div>
            </div>

            <div className="p-5 flex flex-col flex-1 space-y-3">
              <h2 className="text-white font-semibold text-lg">
                {project.title}
              </h2>
              <p className="text-[#A0A0A0] text-sm leading-relaxed flex-1">
                {project.description}
              </p>
              <p className="text-[#FF6B35] text-xs">{project.highlight}</p>
              <div className="flex flex-wrap gap-1.5">
                {project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-0.5 border border-[#2A2A2A] rounded text-[#A0A0A0] text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4 pt-1">
                {project.links.map((link) => (
                  <Link
                    key={link.type}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#A0A0A0] hover:text-white text-sm transition-colors"
                  >
                    {link.type === "Source" ? (
                      <GithubIcon size={14} />
                    ) : (
                      <ExternalLink size={14} className="text-[#FF6B35]" />
                    )}
                    <span
                      className={
                        link.type === "Live Demo" ? "text-[#FF6B35]" : ""
                      }
                    >
                      {link.type}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
