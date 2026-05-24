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
}

export const PROJECTS: Project[] = [
  {
    title: "CreatorsBrain",
    href: "https://creatorsbrain.vercel.app/",
    dates: "Apr 2025",
    featured: true,
    active: true,
    description:
      "A SaaS platform empowering YouTube creators with AI-powered tools — video analysis, title generation, and content optimization. Boosted creator CTR through intelligent suggestions.",
    highlight: "AI-powered SaaS with integrated payments and real-time video analysis",
    technologies: ["Next.js", "Clerk", "Convex DB", "Stripe", "YouTube API", "Claude 3.7"],
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
      "Real-time collaborative document editing with live cursors, presence awareness, and instant sync. Think Google Docs, built from scratch.",
    highlight: "Real-time collaboration with multi-user document editing",
    technologies: ["Next.js", "Clerk", "Liveblocks", "Firestore", "Cloudflare Workers"],
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
    title: "Fortune 500 FMCG — Philippines Monitoring Platform",
    href: "#",
    dates: "Apr 2026 – Present",
    featured: true,
    active: true,
    description:
      "Real-time AI-assisted industrial monitoring platform deployed onsite for a Fortune 500 FMCG client across 5 high-speed VFFS packaging machines. Live telemetry, 8-camera inspection streams, downtime analytics, and operational health dashboards.",
    highlight: "International onsite deployment — current active project",
    technologies: ["React", "TypeScript", "FastAPI", "PostgreSQL", "WebSockets"],
    links: [],
    image: "",
  },
  {
    title: "Global Spirits — AI Digital Twin Platform",
    href: "#",
    dates: "Jan 2026 – Mar 2026",
    featured: true,
    active: false,
    description:
      "Full-stack AI digital twin for a global spirits manufacturer — process simulation, Physics-Informed Neural Network (PINN) quality prediction, phase-aware telemetry dashboards, and multi-version process comparison.",
    highlight: "AI-powered process simulation with Physics-Informed Neural Networks",
    technologies: ["React", "FastAPI", "PostgreSQL", "Python", "AI/ML"],
    links: [],
    image: "",
  },
  {
    title: "Fortune 500 FMCG — Haridwar Production App",
    href: "#",
    dates: "Sept 2025 – Dec 2025",
    featured: true,
    active: false,
    description:
      "Industrial monitoring and control system deployed onsite at a Fortune 500 FMCG client in Haridwar. Built complete full-stack solution as sole technical owner — sole fresher selected for the deployment.",
    highlight: "Sole technical owner — only fresher selected for this critical deployment",
    technologies: ["React", "Python", "Flask", "WebSockets", "ZeroMQ", "CI/CD"],
    links: [],
    image: "",
  },
];
