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
};

export const OSS_CONTRIBUTIONS: OSSContribution[] = [
  {
    project: "Supabase",
    projectUrl: "https://github.com/supabase/supabase",
    prNumber: 41596,
    title: "Warn admins when login settings would break user invitations",
    description:
      "Supabase Studio warns admins when their settings would prevent invited users from signing in with an email link.",
    href: "https://github.com/supabase/supabase/pull/41596",
    status: "open",
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
    title: "Fixed form fields disappearing after saving",
    description:
      "Fixed critical bug where multipart form fields with block strings and @contentType annotations would disappear after saving. Added 169 passing tests.",
    href: "https://github.com/usebruno/bruno/pull/3891",
    status: "open",
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
    title: "Fixed a crash when importing dates from Insomnia",
    description:
      "Fixed import crash when js-yaml auto-converts date-like strings. Hardened with defensive type checks. 13 new tests, zero regressions.",
    href: "https://github.com/usebruno/bruno/pull/3542",
    status: "open",
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
    title: "Fixed opening files in an external editor on Windows",
    description:
      "Resolved critical bug preventing 'Switch File Editor' on Windows. Three-layer fix: backend normalization, frontend checks, comprehensive tests.",
    href: "https://github.com/usebruno/bruno/pull/3211",
    status: "open",
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
    title: "Prevent credentials from being sent to another domain during redirects",
    description:
      "Remove sensitive headers when a request redirects to a different domain and log those events.",
    href: "https://github.com/usebruno/bruno/pull/2987",
    status: "open",
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
    title: "Fixed sign-in failures during simultaneous requests",
    description:
      "Resolved a race condition in OAuth2 token refresh logic that caused intermittent authentication failures under concurrent requests.",
    href: "https://github.com/usebruno/bruno/pull/2750",
    status: "open",
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
    title: "Show a clear error when an API returns invalid JSON",
    description:
      "Added graceful error handling for malformed JSON in response body, preventing UI crashes and providing clear user feedback.",
    href: "https://github.com/usebruno/bruno/pull/2601",
    status: "open",
    dates: "Jul 2024",
    additions: 45,
    deletions: 8,
    technologies: ["JSON", "Error Handling", "UX"],
    featured: false,
  },
];
