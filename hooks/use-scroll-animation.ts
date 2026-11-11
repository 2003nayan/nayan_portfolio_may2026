"use client";

import { useEffect, useRef, useState } from "react";

// One IntersectionObserver shared by every reveal on the page, instead of one
// per element. Each element fires once, then is unobserved.
const callbacks = new WeakMap<Element, () => void>();
let shared: IntersectionObserver | null = null;

function observe(el: Element, onEnter: () => void) {
  shared ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.();
        callbacks.delete(entry.target);
        shared?.unobserve(entry.target);
      }
    },
    // Trigger a little before the element is fully on screen
    { rootMargin: "0px 0px -12% 0px" },
  );
  callbacks.set(el, onEnter);
  shared.observe(el);
  return () => {
    callbacks.delete(el);
    shared?.unobserve(el);
  };
}

export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observe(el, () => setIsVisible(true));
  }, []);

  return { ref, isVisible };
}
