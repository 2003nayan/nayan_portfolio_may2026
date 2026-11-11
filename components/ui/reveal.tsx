"use client";

import { useScrollAnimation } from "@/hooks/use-scroll-animation";

type Tag = "div" | "ul" | "ol" | "dl";

// Blurs its content in once it scrolls into view. With `stagger`, each direct
// child animates in turn instead of the block as a whole, so render it `as`
// the grid or list element itself. Kept as the only client boundary so the
// sections around it can stay server components.
export default function Reveal({
  children,
  className = "",
  as: Component = "div",
  stagger = false,
}: {
  children: React.ReactNode;
  className?: string;
  as?: Tag;
  stagger?: boolean;
}) {
  const { ref, isVisible } = useScrollAnimation<HTMLElement>();

  return (
    <Component
      // One ref type covers every tag in the union
      ref={ref as React.Ref<never>}
      className={`${stagger ? "reveal-stagger" : "reveal"} ${isVisible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </Component>
  );
}
