"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Box,
  Hand,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  ScanEye,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { TwinApi } from "@/components/twin/twin-controls";
import type { ViewPreset } from "@/components/twin/views";

// three.js and each twin are separate chunks, fetched only once the stage
// nears the viewport, so they never weigh on the rest of the page.
const MachineTwin = dynamic(() => import("@/components/twin/machine-twin"), { ssr: false });
const SoapLineTwin = dynamic(() => import("@/components/twin/soap-line-twin"), { ssr: false });

export type TwinKind = "sachet" | "soap-line";

type Connection = { saveData?: boolean; effectiveType?: string };

// Ask before a large download on data saver or a slow connection
function shouldAskFirst() {
  const conn = (navigator as Navigator & { connection?: Connection }).connection;
  return Boolean(conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? ""));
}

/** A failed fetch or a corrupt model throws during render; show a message instead. */
class TwinBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="hud-label absolute inset-0 grid place-items-center text-faint">
        The 3D model couldn&apos;t load.
      </p>
    ) : (
      this.props.children
    );
  }
}

const TOOL =
  "grid size-9 place-items-center border border-line bg-bg/80 text-muted backdrop-blur transition-colors hover:border-line-strong hover:text-ink aria-pressed:border-accent aria-pressed:text-accent-ink";

// An interactive twin. Idle: the model spins and dragging rotates it, while the
// wheel still scrolls the page. Clicking in makes it "live" (wheel zoom,
// right-drag pan) until a click outside or Esc. Fullscreen is always live.
export default function TwinStage({
  kind,
  label,
  sizeMb,
  presets,
}: {
  kind: TwinKind;
  label: string;
  sizeMb: number;
  presets?: ViewPreset[];
}) {
  const figureRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<TwinApi | null>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [askFirst, setAskFirst] = useState(false);
  const [approved, setApproved] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [coarse, setCoarse] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [xray, setXray] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);

  // Load when near the viewport; render only while on screen
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const nearObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        nearObserver.disconnect();
        // Read the device once, just before anything is shown or fetched
        setAskFirst(shouldAskFirst());
        setCoarse(window.matchMedia("(pointer: coarse)").matches);
        // Moving content must be pausable; start paused for reduced motion
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
        setNear(true);
      },
      { rootMargin: "800px 0px" },
    );
    const visibleObserver = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    nearObserver.observe(el);
    visibleObserver.observe(el);
    return () => {
      nearObserver.disconnect();
      visibleObserver.disconnect();
    };
  }, []);

  // Leave explore mode on a click outside or Esc; track fullscreen exits
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!figureRef.current?.contains(e.target as Node)) setEngaged(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEngaged(false);
    };
    const onFullscreen = () => {
      const on = document.fullscreenElement === figureRef.current;
      setFullscreen(on);
      if (!on) setEngaged(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else figureRef.current?.requestFullscreen?.().catch(() => {});
  };

  const mounted = near && (!askFirst || approved);
  const live = engaged || fullscreen;
  // Only read once mounted, which never happens during server render
  const canFullscreen = mounted && document.fullscreenEnabled;
  const active = visible && playing;

  const hint = coarse
    ? live
      ? "Drag to rotate · Pinch to zoom · Two fingers to pan"
      : "Tap Explore to rotate and zoom"
    : live
      ? "Scroll to zoom · Right-drag to pan · Esc to exit"
      : "Drag to rotate · Click to zoom and pan";

  return (
    <figure
      ref={figureRef}
      className="flex flex-col border border-line bg-bg-sunken [&:fullscreen]:border-0"
    >
      <div
        ref={stageRef}
        // Desktop: clicking into the model starts exploring
        onPointerDown={() => {
          if (!coarse && mounted) setEngaged(true);
        }}
        className={`relative h-[62svh] min-h-[380px] w-full bg-[radial-gradient(ellipse_at_50%_40%,var(--bg-raised),var(--bg-sunken)_70%)] outline outline-1 -outline-offset-1 transition-[outline-color] md:h-[76svh] md:max-h-[860px] [:fullscreen_&]:h-auto [:fullscreen_&]:max-h-none [:fullscreen_&]:flex-1 ${live ? "outline-accent" : "outline-transparent"}`}
      >
        {mounted ? (
          <>
            <TwinBoundary>
              {kind === "sachet" ? (
                <MachineTwin
                  active={active}
                  live={live}
                  coarse={coarse}
                  apiRef={apiRef}
                  fallback={null}
                />
              ) : (
                <SoapLineTwin
                  active={active}
                  live={live}
                  coarse={coarse}
                  apiRef={apiRef}
                  xray={xray}
                  wireframe={wireframe}
                />
              )}
            </TwinBoundary>

            {/* Jump-to views along the line */}
            {presets && presets.length > 0 && (
              <div className="absolute top-3 right-16 left-3 flex flex-wrap gap-1.5">
                {presets.map((view) => (
                  <button
                    key={view.id}
                    type="button"
                    aria-pressed={preset === view.id}
                    onClick={() => {
                      setPreset(view.id);
                      apiRef.current?.flyTo(view);
                    }}
                    className="hud-label border border-line bg-bg/80 px-2.5 py-1.5 text-muted backdrop-blur transition-colors hover:border-line-strong hover:text-ink aria-pressed:border-accent aria-pressed:text-accent-ink"
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
              <button type="button" aria-label="Zoom in" title="Zoom in" className={TOOL} onClick={() => apiRef.current?.zoomIn()}>
                <ZoomIn size={15} />
              </button>
              <button type="button" aria-label="Zoom out" title="Zoom out" className={TOOL} onClick={() => apiRef.current?.zoomOut()}>
                <ZoomOut size={15} />
              </button>
              <button
                type="button"
                aria-label="Reset view"
                title="Reset view"
                className={TOOL}
                onClick={() => {
                  setPreset(null);
                  apiRef.current?.reset();
                }}
              >
                <RotateCcw size={15} />
              </button>
              {kind === "soap-line" && (
                <>
                  <button
                    type="button"
                    aria-label="X-ray: see inside the machines"
                    title="X-ray"
                    aria-pressed={xray}
                    className={TOOL}
                    onClick={() => setXray((on) => !on)}
                  >
                    <ScanEye size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Wireframe"
                    title="Wireframe"
                    aria-pressed={wireframe}
                    className={TOOL}
                    onClick={() => setWireframe((on) => !on)}
                  >
                    <Box size={15} />
                  </button>
                </>
              )}
              {canFullscreen && (
                <button
                  type="button"
                  aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  className={TOOL}
                  onClick={toggleFullscreen}
                >
                  {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              )}
            </div>

            {/* Mode hint */}
            <p
              aria-live="polite"
              className={`hud-label pointer-events-none absolute bottom-3 left-1/2 w-max max-w-[calc(100%-1.5rem)] -translate-x-1/2 border px-3 py-1.5 text-center backdrop-blur transition-colors ${live ? "border-accent/50 bg-bg/80 text-accent-ink" : "border-line bg-bg/70 text-muted"}`}
            >
              {hint}
            </p>
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            {askFirst && near ? (
              <button
                type="button"
                onClick={() => setApproved(true)}
                className="invert-block hud-label border border-line-strong px-4 py-2.5 text-ink hover:bg-invert-bg hover:text-invert-fg"
              >
                Load 3D model · {sizeMb} MB
              </button>
            ) : (
              <span className="hud-label text-faint">Loading model…</span>
            )}
          </div>
        )}
      </div>

      <figcaption className="hud-label flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line px-4 py-3 text-faint sm:px-5">
        <span className="text-muted">{label}</span>
        <span className="flex items-center gap-4">
          {coarse && mounted && !fullscreen && (
            <button
              type="button"
              onClick={() => setEngaged((on) => !on)}
              aria-pressed={engaged}
              className={`inline-flex items-center gap-1.5 transition-colors ${engaged ? "text-accent-ink" : "hover:text-ink"}`}
            >
              <Hand size={12} /> {engaged ? "Done" : "Explore"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={!playing}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-ink"
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
            {playing ? "Pause" : "Play"}
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
