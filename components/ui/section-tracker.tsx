"use client";

import { useEffect, useState } from "react";
import ScrambleText from "@/components/ui/scramble-text";
import { HOME_SECTIONS } from "@/data/sections";
import { SITE } from "@/data/site";

// Sections at or above this fraction of the viewport count as "entered"
const ACTIVATION_LINE = 0.35;

const ITEMS = [{ id: "hero", label: SITE.name }, ...HOME_SECTIONS];

const SMALL =
  "block font-display text-[0.9375rem] leading-[1.15] font-bold tracking-tight uppercase [font-stretch:115%] transition-colors";

// Fixed right rail on the home page (xl+). Sections you've passed stack at the
// top, the current one is spelled out large beneath them, and the ones still
// ahead wait at the bottom. Items remount when they change group, which
// replays their entrance animation.
export default function SectionTracker() {
  // Index into ITEMS; 0 is the hero
  const [active, setActive] = useState(0);

  useEffect(() => {
    const targets = ITEMS.map((item) => document.getElementById(item.id));
    let frame = 0;

    const update = () => {
      frame = 0;
      const line = window.innerHeight * ACTIVATION_LINE;
      let next = 0;
      targets.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) next = i;
      });
      setActive(next); // bails out of re-rendering when unchanged
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const passed = active > 0 ? ITEMS.slice(0, active) : [];
  const current = active > 0 ? ITEMS[active] : null;
  const upcoming = ITEMS.slice(active + 1);

  return (
    <nav
      aria-label="Sections"
      className="pointer-events-none fixed top-16 right-14 bottom-8 z-40 hidden w-[calc(var(--rail)-5.5rem)] flex-col justify-between text-right xl:flex"
    >
      <div>
        <ul>
          {passed.map((item) => (
            <li key={`passed-${item.id}`} className="tracker-in">
              <a
                href={`#${item.id}`}
                className={`${SMALL} pointer-events-auto text-faint hover:text-ink-strong`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        {current && (
          <a
            key={`current-${current.id}`}
            href={`#${current.id}`}
            aria-current="location"
            aria-label={current.label}
            className="pointer-events-auto mt-3 block font-display text-[1.75rem] leading-[0.95] font-extrabold tracking-tight text-ink-strong uppercase [font-stretch:115%]"
          >
            <ScrambleText text={current.label} />
          </a>
        )}
      </div>

      <ul>
        {upcoming.map((item) => (
          <li key={`upcoming-${item.id}`} className="tracker-in">
            <a
              href={`#${item.id}`}
              className={`${SMALL} pointer-events-auto text-faint hover:text-ink-strong`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
