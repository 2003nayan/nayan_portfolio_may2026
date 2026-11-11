"use client";

import { useEffect } from "react";
import { SITE } from "@/data/site";

// Total length of the intro sequence in globals.css: overlay, then the hero
// copy and cards blurring in behind it.
const INTRO_MS = 3200;

// Full-screen mark shown before the hero on the first load of the session.
// Hidden by default; the head script in app/layout.tsx sets
// data-intro="play" on <html> when it should run, so there's no flash and
// nothing is hidden without JavaScript.
export default function Intro() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "play") return;
    // Retire the flag once done, so client-side visits to / don't replay it
    const timer = window.setTimeout(() => {
      root.dataset.intro = "done";
    }, INTRO_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="intro" aria-hidden="true">
      <div className="flex flex-col items-center">
        <span className="intro-mark font-display text-6xl font-extrabold tracking-tight text-ink-strong [font-stretch:125%] md:text-7xl">
          {SITE.initials}
          <span className="text-accent">.</span>
        </span>
        <span className="mt-6 block h-px w-24 bg-line">
          <span className="intro-bar block h-full w-full bg-accent" />
        </span>
      </div>
    </div>
  );
}
