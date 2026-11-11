"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

// x / y: card centre as % of the hero. w: width in px at a 1440px viewport.
// depth 0..1: far cards are smaller, dimmer, softer and move less.
// mobile: kept on small screens, where only the top and bottom bands are free.
// Layout keeps clear of the wordmark band (y 22–40%) and the section index
// (bottom-right). Photos in /hero are from Unsplash (Unsplash License);
// the rest are project screenshots. label: shown on hover (pointer devices).
const CARDS = [
  // top band
  { src: "/hero/factory-robots.webp", label: "Factory floor", x: 6, y: 12, w: 200, depth: 0.55 }, // Simon Kadula
  { src: "/creatorsbrain.png", label: "CreatorsBrain", x: 23, y: 9, w: 220, depth: 0.5, mobile: true },
  { src: "/hero/robot-arm-lab.webp", label: "Automation", x: 40, y: 8, w: 150, depth: 0.3 }, // Testalize.me
  { src: "/hero/silicon-wafer.webp", label: "Hardware", x: 57, y: 9, w: 130, depth: 0.25, mobile: true }, // Laura Ockel
  { src: "/hero/server-fans.webp", label: "On-prem servers", x: 74, y: 11, w: 220, depth: 0.6, mobile: true }, // Winston Chen
  { src: "/BayzCrypt.png", label: "BayzCrypt", x: 92, y: 9, w: 170, depth: 0.4 },
  { src: "/hero/server-rack.webp", label: "Infrastructure", x: 98, y: 30, w: 130, depth: 0.35 }, // Domaintechnik
  // left flank
  { src: "/hero/code-monitor.webp", label: "Full stack", x: 11, y: 52, w: 230, depth: 0.85 }, // Harshit Katiyar
  { src: "/hero/metrics-screen.webp", label: "Live metrics", x: 30, y: 60, w: 120, depth: 0.2 }, // Stephen Dawson
  { src: "/hero/circuit-board.webp", label: "PLC integration", x: 2, y: 74, w: 150, depth: 0.4 }, // Alexandre Debiève
  { src: "/motionui.png", label: "MotionUI", x: 19, y: 77, w: 250, depth: 0.95 },
  { src: "/hero/conveyor-line.webp", label: "Packaging line", x: 9, y: 95, w: 220, depth: 0.65, mobile: true }, // Salvador Escalante
  // right flank
  { src: "/collaborix-2.png", label: "Collaborix", x: 87, y: 52, w: 280, depth: 0.9 },
  { src: "/hero/analytics-laptop.webp", label: "Analytics", x: 70, y: 60, w: 125, depth: 0.2 }, // Luke Chesser
  { src: "/hero/robot-arm-line.webp", label: "Digital twins", x: 79, y: 79, w: 220, depth: 0.8 }, // Homa Appliances
  // bottom band
  { src: "/assets/projects/tss.png", label: "Terra Vault", x: 48, y: 96, w: 150, depth: 0.45, mobile: true },
  { src: "/hero/conveyor-robot.webp", label: "Shopfloor", x: 66, y: 97, w: 190, depth: 0.6, mobile: true }, // Salvador Escalante
];

// Partial arcs around the hero centre: [radius, dash length, rotation, colour, spin seconds]
const ORBITS = [
  { r: 560, dash: 1100, rotate: 150, color: "var(--accent)", spin: 220 },
  { r: 610, dash: 700, rotate: 250, color: "#8b5cf6", spin: 260 },
  { r: 470, dash: 520, rotate: 330, color: "#22c55e", spin: 180 },
  { r: 520, dash: 620, rotate: 30, color: "#ef4444", spin: 240 },
];

export default function HeroScene() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Pointer parallax + scroll drift, eased in a rAF loop and fed to CSS vars
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const tick = () => {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      root.style.setProperty("--px", current.x.toFixed(4));
      root.style.setProperty("--py", current.y.toFixed(4));
      root.style.setProperty("--sy", String(Math.min(window.scrollY, 1200)));
      const settled =
        Math.abs(target.x - current.x) < 0.001 &&
        Math.abs(target.y - current.y) < 0.001;
      frame = settled ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
      wake();
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", wake, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", wake);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Orbit arcs */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="-800 -500 1600 1000"
        preserveAspectRatio="xMidYMid slice"
      >
        <circle r="330" fill="none" stroke="var(--line)" strokeDasharray="2 14" />
        <circle r="760" fill="none" stroke="var(--line)" strokeDasharray="1 22" />
        {ORBITS.map((o) => (
          <g key={o.r} transform={`rotate(${o.rotate})`}>
            <g className="orbit" style={{ "--spin": `${o.spin}s` } as React.CSSProperties}>
              <circle
                r={o.r}
                fill="none"
                stroke={o.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={`${o.dash} ${2 * Math.PI * o.r}`}
                opacity="0.75"
              />
            </g>
          </g>
        ))}
      </svg>

      {/* Floating cards */}
      {CARDS.map((card, i) => {
        const tilt = (50 - card.x) * 0.45;
        const width = `clamp(${Math.round(card.w * 0.5)}px, ${(card.w / 14.4).toFixed(2)}vw, ${Math.round(card.w * 1.15)}px)`;
        return (
          <div
            key={card.src}
            className={`scene-hit pointer-events-auto absolute ${card.mobile ? "" : "hidden md:block"}`}
            style={{
              left: `${card.x}%`,
              top: `${card.y}%`,
              width,
              zIndex: Math.round(card.depth * 10),
              transform: `translate(-50%, -50%) translate3d(calc(var(--px, 0) * ${(-34 * card.depth).toFixed(1)}px), calc(var(--py, 0) * ${(-24 * card.depth).toFixed(1)}px + var(--sy, 0) * ${(-0.35 * card.depth).toFixed(3)}px), 0)`,
            }}
          >
            <div
              className="scene-card"
              style={
                {
                  "--delay": `${200 + i * 70}ms`,
                  "--float-duration": `${7 + (i % 5) * 1.3}s`,
                  opacity: 0.3 + card.depth * 0.7,
                  filter: card.depth < 0.35 ? "blur(1.5px)" : undefined,
                  transform: `perspective(900px) rotateY(${tilt.toFixed(1)}deg)`,
                } as React.CSSProperties
              }
            >
              <div
                className="scene-frame relative aspect-video overflow-hidden rounded-[14px] border border-white/15 bg-bg-sunken shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]"
              >
                <Image
                  src={card.src}
                  alt=""
                  fill
                  sizes={`${Math.round(card.w * 1.15)}px`}
                  quality={60}
                  className="object-cover"
                />
              </div>
            </div>
            {/* Outside .scene-card so depth dimming and blur don't touch it.
                Cards along the bottom edge put it above, clear of the clip. */}
            <span
              className={`scene-label hud-label bg-invert-bg px-2 py-1 text-[10px] text-invert-fg ${card.y > 85 ? "is-above" : ""}`}
            >
              {card.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
