"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CameraFlight,
  type CameraViewRequest,
} from "@/components/twin/soap-line/components/CameraFlight";

export type Vec3 = [number, number, number];

export interface CameraView {
  position: Vec3;
  target: Vec3;
}

/** Imperative handles for the stage's toolbar, outside the canvas. */
export interface TwinApi {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  flyTo: (view: CameraView) => void;
}

/** Idle time after the last interaction before the showcase spin resumes. */
const RESUME_AFTER_MS = 8000;
/** Zoom step for the toolbar buttons. */
const ZOOM_STEP = 1.3;
/** Long enough for CameraFlight's 2.4s glide to land before spinning again. */
const FLIGHT_MS = 2600;

/**
 * Orbit controls shared by every twin, plus the showcase spin. The model turns
 * slowly on its own; any drag, wheel, pinch, toolbar press or flight stops it,
 * and it resumes after RESUME_AFTER_MS of quiet. `live` unlocks zoom and pan
 * (wheel, pinch, right-drag); idle leaves the wheel to the page. On touch
 * screens idle also leaves touches to the page, so scrolling past never gets
 * trapped.
 *
 * The canvas must redraw every frame while `spin` is on (the twins' own
 * effects already do), since auto-rotate is applied in controls.update().
 */
export default function TwinControls({
  view,
  live,
  coarse,
  spin,
  apiRef,
  minDistance,
  maxDistance,
  spinSpeed = 0.6,
}: {
  view: CameraView;
  live: boolean;
  coarse: boolean;
  spin: boolean;
  apiRef?: MutableRefObject<TwinApi | null>;
  minDistance: number;
  maxDistance: number;
  spinSpeed?: number;
}) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  // Held still by the user; the spin resumes when this clears
  const [held, setHeld] = useState(false);
  const [flight, setFlight] = useState<CameraViewRequest | null>(null);
  const resumeTimer = useRef<number | undefined>(undefined);
  const flightId = useRef(0);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const stop = () => {
      window.clearTimeout(resumeTimer.current);
      setHeld(true);
    };
    const resumeLater = (after = RESUME_AFTER_MS) => {
      window.clearTimeout(resumeTimer.current);
      resumeTimer.current = window.setTimeout(() => setHeld(false), after);
    };
    const onEnd = () => resumeLater();
    c.addEventListener("start", stop);
    c.addEventListener("end", onEnd);

    const fly = (to: CameraView, resumeAfter: number) => {
      stop();
      flightId.current += 1;
      setFlight({ ...to, id: flightId.current });
      invalidate();
      resumeLater(resumeAfter);
    };

    if (apiRef) {
      // three-stdlib naming: dollyOut moves the camera in, dollyIn moves it out
      const step = (zoomIn: boolean) => {
        stop();
        if (zoomIn) c.dollyOut(ZOOM_STEP);
        else c.dollyIn(ZOOM_STEP);
        invalidate();
        resumeLater();
      };
      apiRef.current = {
        zoomIn: () => step(true),
        zoomOut: () => step(false),
        // Glide home, then spin again as soon as it lands
        reset: () => fly(view, FLIGHT_MS),
        // A chosen view is worth looking at: hold it for the full idle time
        flyTo: (to) => fly(to, FLIGHT_MS + RESUME_AFTER_MS),
      };
    }
    return () => {
      window.clearTimeout(resumeTimer.current);
      c.removeEventListener("start", stop);
      c.removeEventListener("end", onEnd);
      if (apiRef) apiRef.current = null;
    };
  }, [apiRef, invalidate, view]);

  // The controls force touch-action: none on connect, which would trap page
  // scrolling on phones; hand touches back to the page unless exploring.
  useEffect(() => {
    const el = controls.current?.domElement;
    // eslint-disable-next-line react-hooks/immutability -- a DOM style, not React state
    if (el) el.style.touchAction = coarse && !live ? "pan-y" : "none";
  }, [coarse, live]);

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        // Damping off: it needs a per-frame update, which a paused or
        // on-demand canvas does not run.
        enableDamping={false}
        enableRotate={!coarse || live}
        enableZoom={live}
        enablePan={live}
        autoRotate={spin && !held}
        autoRotateSpeed={spinSpeed}
        minDistance={minDistance}
        maxDistance={maxDistance}
        target={view.target}
      />
      <CameraFlight request={flight} controlsRef={controls} />
    </>
  );
}
