# nayankatiyara.in

Personal portfolio of Nayan Katiyara, Full Stack Delivery Engineer. It covers client case studies, projects, open-source work and writing.

Live at **[www.nayankatiyara.in](https://www.nayankatiyara.in)**.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) with React 19 and TypeScript
- Tailwind CSS v4 with `@tailwindcss/typography`
- MDX blog posts via `next-mdx-remote` and `gray-matter`
- [Resend](https://resend.com) for the contact form
- Hosted on Vercel, with Vercel Analytics

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

The contact form needs a Resend API key. Put it in `.env.local`:

```bash
RESEND_API_KEY=your_key_here
```

The rest of the site works without it.

| Script          | What it does                         |
| --------------- | ------------------------------------ |
| `npm run dev`   | Dev server (webpack, 4GB heap)       |
| `npm run build` | Production build and type check      |
| `npm run start` | Serve the production build           |
| `npm run lint`  | ESLint                               |

## Editing content

Most of the site's text lives in data files, not in components:

| What                         | Where                    |
| ---------------------------- | ------------------------ |
| Name, bio, stats, socials    | `data/site.ts`           |
| Case studies (`/work`)       | `data/case-studies.ts`   |
| Projects                     | `data/projects.ts`       |
| Career timeline              | `data/journey.ts`        |
| Open-source contributions    | `data/opensource.ts`     |
| Skills                       | `data/skills.ts`         |
| Blog posts (`/blog`)         | `content/*.mdx`          |

### Adding a blog post

Create `content/<slug>.mdx`. The filename becomes the URL (`/blog/<slug>`).

```mdx
---
title: "Post title"
summary: "One-line summary shown in lists and meta tags."
publishedAt: "2026-01-31"
readTime: "5 min read"
featured: false
tags: ["nextjs"]
---

Post body in MDX.
```

Posts are sorted newest first and added to the sitemap automatically.

## Project structure

```
app/                 Routes: /, /work, /projects, /open-source, /blog, /api/contact
components/sections  Home page sections, in the order set in app/page.tsx
components/ui        Shared layout pieces (Section, SectionHeader, CONTAINER) and small widgets
components/case-study Case study grid and architecture diagram
data/                Site content as typed TypeScript
content/             MDX blog posts
lib/blog.ts          Reads and parses the MDX posts
public/              Images, resume, OG image
```

Colours and theme are CSS variables in `app/globals.css`, with dark as the default and an optional light theme. They are exposed as Tailwind classes such as `bg-bg`, `text-ink` and `border-line`.

When adding a new top-level page, also add it to `app/sitemap.ts`.
