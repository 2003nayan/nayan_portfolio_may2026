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
    title: "DocuMind",
    href: "https://documind-ebon-one.vercel.app/",
    dates: "Nov 2026",
    featured: true,
    active: true,
    description:
      "A document Q&A app for technical manuals, scanned reports, and PDFs with complex tables. It verifies each citation against the retrieved text and highlights the cited passage in the PDF viewer.",
    highlight: "Matched the expected facts on 24 of 26 answerable questions in a hand-labeled evaluation",
    technologies: ["Next.js", "FastAPI", "Docling", "Qdrant", "Gemini"],
    links: [
      { type: "Source", href: "https://github.com/2003nayan/documind" },
      { type: "Live Demo", href: "https://documind-ebon-one.vercel.app/" },
    ],
    image: "/documind.png",
  },
  {
    title: "CreatorsBrain",
    href: "https://creatorsbrain.vercel.app/",
    dates: "Apr 2025",
    featured: true,
    active: true,
    description:
      "A web app that uses AI to turn long videos into ready-to-post titles, scripts and thumbnails for content creators. Reusing AI results between steps cut AI costs by 60%, with paid plans and usage limits.",
    highlight: "Cut AI costs by 60% by reusing results between steps",
    technologies: ["Next.js", "ConvexDB", "OpenAI", "Claude", "Clerk"],
    links: [
      { type: "Source", href: "https://github.com/2003nayan/creatorsbrain" },
      { type: "Live Demo", href: "https://creatorsbrain.vercel.app/" },
    ],
    image: "/creatorsbrain-preview.png",
  },
  {
    title: "Collaborix",
    href: "https://collaborix.vercel.app/",
    dates: "Feb 2025",
    featured: true,
    active: true,
    description:
      "A Google-Docs-style editor where multiple people edit the same document at once — live cursors, built-in AI chat and translation, hosted on Cloudflare Workers.",
    highlight: "Real-time collaboration with multi-user document editing",
    technologies: ["Next.js", "Cloudflare Workers", "Liveblocks", "Firestore"],
    links: [
      { type: "Source", href: "https://github.com/2003nayan/Collaborix" },
      { type: "Live Demo", href: "https://collaborix.vercel.app/" },
    ],
    image: "/collaborix-preview.png",
  },
  {
    title: "AutoGitSafe",
    href: "https://github.com/2003nayan/automated-github-push",
    dates: "2024",
    featured: true,
    active: true,
    description:
      "Schedules backups for multiple GitHub repositories, shows their status, and helps restore them when needed.",
    highlight: "Scheduled backups with live status and automated recovery",
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
    title: "Fortune Global 500 consumer goods company — Shopfloor Operations Platform",
    href: "#",
    dates: "Sept 2025 – Dec 2025, Aug 2026 – Present",
    featured: true,
    active: true,
    description:
      "Shopfloor operations platform for a global consumer goods plant in Haridwar, scaled from 10 to 36 high-speed packaging machines across 6 groups of machines, now run by 6 operators instead of 18. Operators get live productivity, quality and breakdown data with guided actions, and can change machine parameters from the UI.",
    highlight: "Only full-stack developer — scaled from 10 to 36 machines",
    technologies: ["React", "TypeScript", "FastAPI", "PostgreSQL", "TimescaleDB", "PLC Integration"],
    links: [],
    image: "",
    caseStudy: "haridwar",
    plate: "Haridwar",
  },
  {
    title: "Fortune Global 500 consumer goods company — Soap Line Digital Twin & TwinSight",
    href: "#",
    dates: "Jun 2026 – Present",
    featured: true,
    active: true,
    description:
      "Two production apps for a global consumer goods soap line in Khamgaon: a live 3D digital twin showing operators what every machine is doing, and TwinSight, a factory monitoring portal for engineers. Includes live soap hardness estimates.",
    highlight: "Live 3D digital twin, moved from Azure and AWS to an on-premise plant server",
    technologies: ["React", "TypeScript", "Three.js", "React Three Fiber", "FastAPI", "PostgreSQL"],
    links: [],
    image: "",
    caseStudy: "khamgaon",
    plate: "Khamgaon",
  },
  {
    title: "Fortune Global 500 consumer goods company — Real-Time Quality System",
    href: "#",
    dates: "Apr 2026 – Jun 2026",
    featured: true,
    active: false,
    description:
      "Real-time quality monitoring system deployed onsite in Cavite across five high-speed sachet-packaging machines. Operators see live machine readings, downtime, and feeds from eight inspection cameras.",
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
      "Desktop digital twin application for a global spirits maker's distillery — engineers simulate and compare recipe changes before production, with predicted flavour quality and charts for each stage.",
    highlight: "Process simulation with Physics-Informed Neural Networks",
    technologies: ["Electron", "React", "FastAPI", "Python", "PostgreSQL", "PINN Models"],
    links: [],
    image: "",
    caseStudy: "distillery",
    plate: "Nashik",
  },
];
