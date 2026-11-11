"use client";

import { useEffect, useRef } from "react";

const TICKS = 41;

// Measuring-tape ruler pinned to the right edge; the marker tracks scroll.
export default function ScrollRuler() {
  const markerRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      markerRef.current?.style.setProperty("top", `${(progress * 100).toFixed(2)}%`);
      if (readoutRef.current)
        readoutRef.current.textContent = `${String(Math.round(progress * 100)).padStart(2, "0")}%`;
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

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-16 right-0 bottom-4 z-40 hidden w-9 xl:block"
    >
      <div className="relative flex h-full flex-col justify-between">
        {Array.from({ length: TICKS }, (_, i) => {
          const major = i % 5 === 0;
          return (
            <div key={i} className="relative flex items-center justify-end">
              {major && (
                <span className="absolute right-5 -translate-y-px font-mono text-[9px] text-faint">
                  {i / 5}
                </span>
              )}
              <span
                className={`block h-px ${major ? "w-3 bg-line-strong" : "w-1.5 bg-line"}`}
              />
            </div>
          );
        })}
        <div
          ref={markerRef}
          className="absolute right-0 h-px w-6 -translate-y-1/2 bg-accent transition-[top] duration-150 ease-out"
        >
          <span
            ref={readoutRef}
            className="absolute top-1.5 right-0 font-mono text-[9px] text-accent-ink tabular-nums"
          >
            00%
          </span>
        </div>
      </div>
    </div>
  );
}
