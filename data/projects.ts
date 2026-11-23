export interface Project {
  title: string;
  href: string;
  dates: string;
  featured: boolean;
  active: boolean;
  description: string;
  highlight: string;
  technologies: string[];
  links: { type: "Source" | "Live Demo"; href: string }[];
  image: string;
  // Client work: slug of the /work case study, and the word shown on the image plate
  caseStudy?: string;
  plate?: string;
}

export const PROJECTS: Project[] = [
  {
    title: "CreatorsBrain",
    href: "https://creatorsbrain.vercel.app/",
    dates: "Apr 2025",
    featured: true,
    active: true,
    description:
      "A web app that uses AI to turn long videos into ready-to-post titles, scripts and thumbnails for content creators. Caching between pipeline stages cut AI costs 60%, with paid plans and usage limits.",
    highlight: "AI video-to-content pipeline — caching cut AI costs 60%",
    technologies: ["Next.js", "ConvexDB", "OpenAI", "Claude", "Clerk"],
    links: [
      { type: "Source", href: "https://github.com/2003nayan/creatorsbrain" },
      { type: "Live Demo", href: "https://creatorsbrain.vercel.app/" },
    ],
    image: "/creatorsbrain.png",
  },
  {
    title: "Collaborix",
    href: "https://www.collaborix.space/",
    dates: "Feb 2025",
    featured: true,
    active: true,
    description:
      "A Google-Docs-style editor where multiple people edit the same document at once — live cursors, built-in AI chat and translation, built serverless on Cloudflare Workers.",
    highlight: "Real-time collaboration with multi-user document editing",
    technologies: ["Next.js", "Cloudflare Workers", "Liveblocks", "Firestore"],
    links: [
      { type: "Source", href: "https://github.com/2003nayan/Collaborix" },
      { type: "Live Demo", href: "https://www.collaborix.space/" },
    ],
    image: "/collaborix-2.png",
  },
  {
    title: "AutoGitSafe",
    href: "https://github.com/2003nayan/automated-github-push",
    dates: "2024",
    featured: true,
    active: true,
    description:
      "Automated GitHub repository backup platform with real-time monitoring, scheduling, and recovery workflows. Manages backup operations reliably across multiple repositories.",
    highlight: "Real-time monitoring with scheduling and automated recovery",
    technologies: ["Flask", "React", "WebSockets", "Python"],
    links: [
      { type: "Source", href: "https://github.com/2003nayan/automated-github-push" },
    ],
    image: "",
  },
  {
    title: "MotionUI",
    href: "https://motion-ui-eight.vercel.app/",
    dates: "Jan 2025",
    featured: false,
    active: true,
    description:
      "A collection of beautifully designed, animated, and accessible UI components built with Next.js, Tailwind CSS, and Framer Motion. Designed to help developers ship modern UIs faster.",
    highlight: "Component library with 30+ production-ready animated components",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion", "Razorpay"],
    links: [
      { type: "Source", href: "https://github.com/2003nayan/MotionUI" },
      { type: "Live Demo", href: "https://motion-ui-eight.vercel.app/" },
    ],
    image: "/motionui.png",
  },
];

export const CLIENT_PROJECTS: Project[] = [
  {
    title: "Fortune Global 500 FMCG — Shopfloor Operations Platform",
    href: "#",
    dates: "Sept 2025 – Dec 2025, Aug 2026 – Present",
    featured: true,
    active: true,
    description:
      "Shopfloor operations platform for a global FMCG plant in Haridwar, scaled from 10 to 36 high-speed packaging machines across 6 loops, now run by 6 operators instead of 18. Operators get live productivity, quality and breakdown data with guided actions, and can change machine parameters from the UI.",
    highlight: "Only full-stack developer — scaled from 10 to 36 machines",
    technologies: ["React", "TypeScript", "FastAPI", "PostgreSQL", "TimescaleDB", "PLC Integration"],
    links: [],
    image: "",
    caseStudy: "haridwar",
    plate: "Haridwar",
  },
  {
    title: "Fortune Global 500 FMCG — Soap Line Digital Twin & TwinSight",
    href: "#",
    dates: "Jun 2026 – Present",
    featured: true,
    active: true,
    description:
      "Two production apps for a global FMCG soap line in Khamgaon: a live 3D digital twin showing operators what every machine is doing, and TwinSight, a factory monitoring portal for engineers. Includes real-time penetration value (PV) estimation.",
    highlight: "Live 3D digital twin, moved from Azure and AWS to an on-premise plant server",
    technologies: ["React", "TypeScript", "Three.js", "React Three Fiber", "FastAPI", "PostgreSQL"],
    links: [],
    image: "",
    caseStudy: "khamgaon",
    plate: "Khamgaon",
  },
  {
    title: "Fortune Global 500 FMCG — Real-Time Quality System",
    href: "#",
    dates: "Apr 2026 – Jun 2026",
    featured: true,
    active: false,
    description:
      "Real-time quality monitoring system deployed onsite in Cavite across 5 high-speed VFFS packaging machines at 180+ units/min. PLC telemetry over EtherNet/IP, 8-camera inspection streams, downtime tracking and system health dashboards.",
    highlight: "International onsite delivery",
    technologies: ["React", "TypeScript", "FastAPI", "PostgreSQL", "EtherNet/IP"],
    links: [],
    image: "",
    caseStudy: "cavite",
    plate: "Cavite",
  },
  {
    title: "Multinational Spirits Company — Distillery Digital Twin",
    href: "#",
    dates: "Jan 2026 – Mar 2026",
    featured: true,
    active: false,
    description:
      "Desktop digital twin application for a global spirits maker's distillery — engineers simulate and compare recipe changes before production, with Physics-Informed Neural Network (PINN) quality prediction and phase-aware analytics.",
    highlight: "Process simulation with Physics-Informed Neural Networks",
    technologies: ["Electron", "React", "FastAPI", "Python", "PostgreSQL", "PINN Models"],
    links: [],
    image: "",
    caseStudy: "distillery",
    plate: "Nashik",
  },
];
