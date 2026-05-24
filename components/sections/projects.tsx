"use client";

import Link from "next/link";
import Image from "next/image";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import { PROJECTS } from "@/data/projects";
import { ExternalLink } from "lucide-react";
import { GithubIcon } from "@/components/icons";

function ProjectCard({ project }: { project: (typeof PROJECTS)[number] }) {
  return (
    <div className="card p-0 overflow-hidden group flex flex-col">
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
        {/* Date badge */}
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#0A0A0A]/80 backdrop-blur-sm rounded text-[#A0A0A0] text-xs font-mono border border-[#2A2A2A]">
          {project.dates}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 space-y-3">
        <h3 className="text-white font-semibold text-lg">{project.title}</h3>
        <p className="text-[#A0A0A0] text-sm leading-relaxed flex-1">
          {project.description}
        </p>
        {/* Highlight */}
        <p className="text-[#FF6B35] text-xs">{project.highlight}</p>

        {/* Tech pills */}
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

        {/* Links */}
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
                className={link.type === "Live Demo" ? "text-[#FF6B35]" : ""}
              >
                {link.type}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { ref, isVisible } = useScrollAnimation();
  const featured = PROJECTS.filter((p) => p.featured);

  return (
    <section id="projects" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div
          ref={ref}
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <p className="section-label mb-3">Projects</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            Selected Work
          </h2>
          <p className="text-[#A0A0A0] mb-10 text-base">
            Production-grade projects with live demos and full source code.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featured.map((project) => (
              <ProjectCard key={project.title} project={project} />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm transition-colors"
            >
              View all projects
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
