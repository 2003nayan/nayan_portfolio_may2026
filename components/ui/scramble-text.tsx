"use client";

import { useLayoutEffect, useRef } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&/<>[]{}=+*";

// Resolves `text` left to right through random glyphs. Remount (change the
// key) to replay. Writes straight to the DOM so it never re-renders React.
export default function ScrambleText({
  text,
  duration = 650,
  className = "",
}: {
  text: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  // Layout effect: blank the text before first paint so it never flashes whole
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = text;
      return;
    }

    el.textContent = "";
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // Each letter locks in once progress passes its slot; until then it
      // shows a random glyph, or nothing if the scramble hasn't reached it.
      const locked = Math.floor(progress * text.length);
      const front = Math.min(text.length, locked + 4);
      let out = text.slice(0, locked);
      for (let i = locked; i < front; i++) {
        out += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, duration]);

  // Server render and no-JS show the final text
  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
