export interface JourneyMilestone {
  title: string;
  role: string;
  dates: string;
  location: string;
  image: string;
  description: string[];
  highlight: boolean;
  current?: boolean;
}

export const JOURNEY_MILESTONES: JourneyMilestone[] = [
  {
    title: "Fortune Global 500 FMCG — Shopfloor Operations Platform",
    role: "Full Stack Delivery Engineer — Only Full-Stack Developer",
    dates: "Aug 2026 – Present",
    location: "Haridwar, India",
    image: "/ai4m_logo.png",
    description: [
      "Back at the Haridwar plant to scale the platform I first worked on in 2025 — from 10 machines to 36 high-speed packaging machines across 6 production loops.",
      "Operators get live productivity, quality and breakdown data with guided actions, and can change machine parameters straight from the UI, with audit logging and role-based access control.",
      "Kept every screen fast as the platform expanded: one shared cache serves all open screens from a single database read every 2 seconds.",
    ],
    highlight: true,
    current: true,
  },
  {
    title: "Fortune Global 500 FMCG — Soap Line Digital Twin",
    role: "Full Stack Delivery Engineer — Only Full-Stack Developer",
    dates: "Jun 2026 – Present",
    location: "Khamgaon, India",
    image: "/ai4m_logo.png",
    description: [
      "Built two production apps: a live 3D digital twin that shows operators what every machine on the soap line is doing, and TwinSight, a factory monitoring portal for engineers.",
      "Delivered real-time penetration value (PV) estimation that helps operators keep product in the golden range.",
      "Moved both apps from the cloud (Azure and AWS) onto an on-premise plant server.",
    ],
    highlight: true,
    current: true,
  },
  {
    title: "Fortune Global 500 FMCG — Real-Time Quality System",
    role: "Full Stack Delivery Engineer",
    dates: "Apr 2026 – Jun 2026",
    location: "Cavite, Philippines",
    image: "/ai4m_logo.png",
    description: [
      "Selected for international onsite delivery of a quality monitoring system for 5 high-speed VFFS packaging machines running at 180+ units/min.",
      "Integrated PLC telemetry over EtherNet/IP and built operator dashboards with live telemetry, downtime tracking and 8-camera inspection streams.",
      "Debugged ingestion failures and optimised the backend for stable, continuous plant operation.",
    ],
    highlight: true,
  },
  {
    title: "Multinational Spirits Company — Distillery Digital Twin",
    role: "Full Stack Delivery Engineer",
    dates: "Jan 2026 – Mar 2026",
    location: "Remote · Nashik, India",
    image: "/ai4m_logo.png",
    description: [
      "Built a desktop application that lets engineers simulate and compare recipe changes before production.",
      "Integrated Physics-Informed Neural Network (PINN) models for real-time sensory quality prediction, with phase-aware dashboards and anomaly insights.",
    ],
    highlight: false,
  },
  {
    title: "Fortune Global 500 FMCG — Production Operations Platform",
    role: "Full Stack Developer — Only Fresher Onsite",
    dates: "Sept 2025 – Dec 2025",
    location: "Haridwar, India",
    image: "/ai4m_logo.png",
    description: [
      "Selected as the only fresher for onsite deployment at a global FMCG plant, on a live platform for 10 packaging machines.",
      "Took over the full stack as the team shrank: React frontend, Python/Flask backend, WebSockets & ZeroMQ messaging.",
      "Reduced deployment time from 2 hours to 15 minutes through an in-house CI/CD pipeline.",
    ],
    highlight: true,
  },
  {
    title: "Full-Time Conversion",
    role: "Full Stack Developer",
    dates: "July 2025",
    location: "AI4M Technology",
    image: "/ai4m_logo.png",
    description: [
      "Converted to full-time after proving consistent delivery.",
      "Built 7+ production dashboards for B2B clients across food, automotive (paint and body shops) and logistics.",
    ],
    highlight: false,
  },
  {
    title: "Trainee Promotion",
    role: "Full Stack Trainee",
    dates: "Oct 2024",
    location: "AI4M Technology",
    image: "/ai4m_logo.png",
    description: [
      "Promoted from Frontend Intern to Full Stack Trainee based on execution speed.",
      "Expanded into backend development, code reviews, and architectural decisions.",
    ],
    highlight: false,
  },
  {
    title: "First Tech Role",
    role: "Frontend Intern",
    dates: "June 2024",
    location: "AI4M Technology",
    image: "/ai4m_logo.png",
    description: [
      "Started professional journey — React, Next.js, version control, and collaborative workflows.",
    ],
    highlight: false,
  },
];
