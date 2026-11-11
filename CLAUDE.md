# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

Next.js 16 (App Router) + React 19 + Tailwind CSS v4. The bundled docs at `node_modules/next/dist/docs/` (`01-app/`, `03-architecture/`, …) are the source of truth for Next APIs — e.g. route `params` are a `Promise` and must be awaited.

## Commands

```bash
npm run dev     # dev server on :3000 (uses webpack via --webpack, with a 4GB heap)
npm run build   # production build — also the main type-check gate
npm run lint    # eslint (flat config, eslint-config-next)
```

There is no test suite. Verify changes with `npm run build` and `npm run lint`.

## Architecture

Personal portfolio site, deployed on Vercel (`@vercel/analytics` in the root layout). Almost everything is a server component rendered from static data; there is no database.

**Content lives in data, not in components.** Edit text here rather than in JSX:
- `data/site.ts` — the `SITE` constant: name, URL, bio, stats, social links, contact. Used by metadata, sitemap, navbar, footer and sections.
- `data/case-studies.ts` — `CASE_STUDIES` drives `/work` and `/work/[slug]` (static params + sitemap). Client work is under NDA: no screenshots, code, hostnames, DB or tag names.
- `data/projects.ts`, `journey.ts`, `opensource.ts`, `skills.ts` — feed the matching sections and pages.
- `content/*.mdx` — blog posts. `lib/blog.ts` reads them from disk with `gray-matter` (frontmatter: `title`, `summary`, `publishedAt`, `readTime`, `featured`, `tags`); the filename is the slug. Rendered with `next-mdx-remote/rsc` in `app/blog/[slug]/page.tsx`.

**Routes:** `/` composes `components/sections/*` in order (`app/page.tsx`); `/work`, `/projects`, `/open-source`, `/blog` are standalone pages; `app/sitemap.ts` must be updated when adding a top-level route. `app/api/contact/route.ts` sends the contact form via Resend (needs `RESEND_API_KEY`).

**Layout primitives:** `components/ui/section.tsx` exports `CONTAINER` (the shared max-width/gutter class string), `Section`, and `SectionHeader` (the "01 / Label" index row + display headline). Pages and sections build on these for consistent rhythm.

**Styling / theming:** design tokens are CSS variables in `app/globals.css`, defined for dark (default) and `[data-theme="light"]`, then exposed to Tailwind via `@theme inline` — use the semantic utilities (`bg-bg`, `text-ink`, `text-muted`, `text-faint`, `border-line`, `text-accent-ink`, …), not raw colors. Custom classes in `globals.css`: `hud-label`, `display-1`, `display-2`, `wordmark`, `serif-accent`, `invert-block`, `reveal`, `marquee`, `prose` overrides. The theme toggle persists to `localStorage`; an inline script in `app/layout.tsx` applies it before first paint. Fonts (Archivo, Inter, Geist Mono, Instrument Serif) are loaded via `next/font` as CSS variables in the layout.

**Home page motion:** `data/sections.ts` (`HOME_SECTIONS`) is the single list of home sections; the fixed right-rail `SectionTracker`, the hero's section index and the rotated `RailLabel`s all read it, so a new home section must be added there and its `<section id>` must match. Sections after the hero sit inside `.home-shell`, which reserves the rail (`--rail`, xl+). Scroll reveals go through `Reveal` (`stagger` animates direct children, so render it `as` the grid/list itself); `SectionHeader` reveals itself. The intro overlay only plays when the head script in `app/layout.tsx` sets `data-intro="play"`.

**3D twins** (home "3D Twins" section, `components/sections/twins.tsx`): two ported client twins, animated by node name against models in `public/models/`.
- `components/twin/machine-twin.tsx`: sachet packaging machine (part lists in `sealer-parts.ts` / `piston-parts.ts`, tuned constants in `controls.ts`).
- `components/twin/soap-line-twin.tsx`: soap finishing line, built on the ported `components/twin/soap-line/` folder; runs the original's "dummy" mode on fixed modal values, no live data.
- Ported code keeps its original style and has React Compiler lint rules relaxed (file comment / `eslint.config.mjs` override), because R3F mutates three.js objects in `useFrame`.
- `twin-controls.tsx` is shared: auto-rotate that stops on interaction and resumes after idle, `live` mode for wheel zoom/pan, and the `TwinApi` (zoom, reset, `flyTo`) the stage toolbar calls.
- `twin-stage.tsx` lazy-loads each twin with `next/dynamic` (`ssr: false`) near the viewport and pauses rendering off screen. Anything it imports statically (e.g. `views.ts`) must stay free of three.js imports.
- Show only the models and their motion; no client names, sites or data.

**Client components** are the exception and are marked `"use client"`: navbar, contact form, theme toggle, scroll ruler, reveal-on-scroll, local time, hero scene. Animations respect `prefers-reduced-motion` in `globals.css`.

Path alias: `@/*` → repo root.
