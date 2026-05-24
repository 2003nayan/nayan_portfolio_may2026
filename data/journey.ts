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
    title: "Fortune 500 FMCG — AI Monitoring Platform",
    role: "Full Stack Engineer",
    dates: "Apr 2026 – Present",
    location: "Cavite, Philippines",
    image: "/ai4m_logo.png",
    description: [
      "Selected for international onsite deployment — building a real-time AI-assisted monitoring platform across 5 high-speed VFFS packaging machines operating at 180+ units/min.",
      "Built React, TypeScript, FastAPI, and PostgreSQL stack for high-frequency telemetry acquisition and live analytics dashboards.",
      "Developed dashboards integrating 8-camera inspection streams, live telemetry, downtime tracking, and operational health monitoring.",
      "Optimized backend ingestion pipelines for low-latency processing under continuous production load.",
    ],
    highlight: true,
    current: true,
  },
  {
    title: "Global Spirits — AI Digital Twin Platform",
    role: "Full Stack Engineer",
    dates: "Jan 2026 – Mar 2026",
    location: "Remote",
    image: "/ai4m_logo.png",
    description: [
      "Developed a full-stack AI-powered digital twin platform enabling process simulation, operational analytics, and predictive quality monitoring for a global spirits manufacturer.",
      "Integrated Physics-Informed Neural Network (PINN) prediction systems delivering real-time sensory quality insights through interactive visualization dashboards.",
      "Built phase-aware telemetry dashboards with automated process-stage detection, anomaly insights, and multi-version comparison workflows.",
    ],
    highlight: false,
  },
  {
    title: "Fortune 500 FMCG — Production Operations Platform",
    role: "Full Stack Engineer — Solo Owner",
    dates: "Sept 2025 – Dec 2025",
    location: "Haridwar, India",
    image: "/ai4m_logo.png",
    description: [
      "Selected as the ONLY fresher for critical onsite client deployment — full technical ownership from day one.",
      "Built React frontend, Python/Flask backend, WebSockets & ZeroMQ messaging, in-house CI/CD pipeline.",
      "Reduced deployment time from 2 hours to 15 minutes through internal CI/CD automation.",
    ],
    highlight: true,
    current: false,
  },
  {
    title: "Full-Time Conversion",
    role: "Full Stack Developer",
    dates: "July 2025",
    location: "AI4M Technology",
    image: "/ai4m_logo.png",
    description: [
      "Converted to full-time after proving consistent delivery.",
      "Built 7+ production-ready B2B solutions with Next.js, PostgreSQL, and authentication systems.",
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
