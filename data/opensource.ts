export interface OSSContribution {
  project: string;
  projectUrl: string;
  prNumber: number;
  title: string;
  description: string;
  href: string;
  status: "merged" | "open" | "closed";
  dates: string;
  additions: number;
  deletions: number;
  technologies: string[];
  featured: boolean;
}

export const OSS_STATS = {
  stars: "100K+",
  starsLabel: "Stars Across Repos",
  starsRepo: "Bruno · Supabase",
  totalPrs: 7,
  merged: 7,
};

export const OSS_CONTRIBUTIONS: OSSContribution[] = [
  {
    project: "Supabase",
    projectUrl: "https://github.com/supabase/supabase",
    prNumber: 41596,
    title: "Proactive validation for misconfigured invitation-based auth flows",
    description:
      "Improved authentication onboarding reliability by implementing validation systems that prevent broken invitation-based login flows inside Supabase Studio. Added contextual warnings for misconfigured magic-link authentication during user invitations.",
    href: "https://github.com/supabase/supabase/pull/41596",
    status: "merged",
    dates: "2025",
    additions: 0,
    deletions: 0,
    technologies: ["Authentication", "Validation", "Studio"],
    featured: true,
  },
  {
    project: "Bruno",
    projectUrl: "https://github.com/usebruno/bruno",
    prNumber: 3891,
    title: "Fixed multipart form block strings with @contentType persistence",
    description:
      "Fixed critical bug where multipart form fields with block strings and @contentType annotations would disappear after saving. Added 169 passing tests.",
    href: "https://github.com/usebruno/bruno/pull/3891",
    status: "merged",
    dates: "Jan 2025",
    additions: 99,
    deletions: 3,
    technologies: ["Parser", "Grammar", "Testing"],
    featured: true,
  },
  {
    project: "Bruno",
    projectUrl: "https://github.com/usebruno/bruno",
    prNumber: 3542,
    title: "Handle date values in Insomnia v5 YAML imports",
    description:
      "Fixed import crash when js-yaml auto-converts date-like strings. Hardened with defensive type checks. 13 new tests, zero regressions.",
    href: "https://github.com/usebruno/bruno/pull/3542",
    status: "merged",
    dates: "Nov 2025",
    additions: 352,
    deletions: 3,
    technologies: ["YAML", "Parsing", "Testing"],
    featured: true,
  },
  {
    project: "Bruno",
    projectUrl: "https://github.com/usebruno/bruno",
    prNumber: 3211,
    title: "Fixed filesystem path handling for Windows Standalone panel",
    description:
      "Resolved critical bug preventing 'Switch File Editor' on Windows. Three-layer fix: backend normalization, frontend checks, comprehensive tests.",
    href: "https://github.com/usebruno/bruno/pull/3211",
    status: "merged",
    dates: "Dec 2024",
    additions: 123,
    deletions: 2,
    technologies: ["Electron", "Windows", "Cross-platform"],
    featured: true,
  },
  {
    project: "Bruno",
    projectUrl: "https://github.com/usebruno/bruno",
    prNumber: 2987,
    title: "Cross-domain redirect security to prevent credential leakage",
    description:
      "RFC 7231 compliant security — strips sensitive headers from cross-domain redirects while preserving same-origin. Added security logging.",
    href: "https://github.com/usebruno/bruno/pull/2987",
    status: "merged",
    dates: "Oct 2024",
    additions: 549,
    deletions: 116,
    technologies: ["Security", "HTTP", "RFC 7231"],
    featured: true,
  },
  {
    project: "Bruno",
    projectUrl: "https://github.com/usebruno/bruno",
    prNumber: 2750,
    title: "Fixed OAuth2 token refresh race condition",
    description:
      "Resolved a race condition in OAuth2 token refresh logic that caused intermittent authentication failures under concurrent requests.",
    href: "https://github.com/usebruno/bruno/pull/2750",
    status: "merged",
    dates: "Aug 2024",
    additions: 87,
    deletions: 23,
    technologies: ["OAuth2", "Async", "Auth"],
    featured: false,
  },
  {
    project: "Bruno",
    projectUrl: "https://github.com/usebruno/bruno",
    prNumber: 2601,
    title: "Improved error handling for malformed JSON responses",
    description:
      "Added graceful error handling for malformed JSON in response body, preventing UI crashes and providing clear user feedback.",
    href: "https://github.com/usebruno/bruno/pull/2601",
    status: "merged",
    dates: "Jul 2024",
    additions: 45,
    deletions: 8,
    technologies: ["JSON", "Error Handling", "UX"],
    featured: false,
  },
];
