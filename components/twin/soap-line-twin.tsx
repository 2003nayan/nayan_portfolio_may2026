"use client";

// Animated 3D twin of a soap finishing line: mixer, noodler, mill, plodders,
// billet cutters and stampers, with the scrap recycle loop. Ported from the
// shopfloor platform's TwinScene. Only the models and their motion are kept;
// the plant runs in the original's "dummy" mode, on the modal running values
// it recorded, so nothing here reads live data. Callouts, the sidebar, SKU
// colours and the backend were left out on purpose.

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, useProgress } from "@react-three/drei";
import TwinControls, { type TwinApi } from "@/components/twin/twin-controls";
import { SOAP_LINE_VIEW } from "@/components/twin/views";
import { Model, type ModelBounds } from "./soap-line/components/Model";
import type { ShortBarRequest } from "./soap-line/components/BilletCutter";
import { StaticModel } from "./soap-line/components/StaticModel";
import { StamperSuction } from "./soap-line/components/StamperSuction";
import { Wireframe } from "./soap-line/components/Wireframe";
import type { GateHingeConfig } from "./soap-line/components/GateHinge";
import type { ConveyorBeltConfig } from "./soap-line/components/ConveyorBelt";
import type { LiftRoute, RecycleRoute } from "./soap-line/lib/recycleRoute";
import { dummyGateClosed } from "./soap-line/lib/mixerCycle";
import { ProductColorContext, resolveProductPalette } from "./soap-line/lib/productColor";
import {
  FP_SHAFT_2_PIVOT,
  FP_SHAFT_3_PIVOT,
  PP_SHAFT_A_PIVOT,
  PP_SHAFT_B_PIVOT,
} from "./soap-line/lib/plodderGeometry";

const LINE_URL = "/models/soap-line/line.glb";
const STAMPER_URL = "/models/soap-line/stamper.glb";
// Both large files download side by side as soon as this chunk loads
useGLTF.preload(LINE_URL);
useGLTF.preload(STAMPER_URL);

// The original's dummy-mode seeds: the modal running value of each drive
// from the plant's own history, not invented numbers.
const DEG_PER_SEC_PER_RPM = 6;
const MIXER_RPM = 50;
const NOODLER = { level: 37.5, rpm: 18 };
const MILL_RPM = 45;
const PRE_PLODDER = { rpm: 50, level: 45 };
const FINAL_PLODDER_RPM = 61.5;
const CONVEYOR_UV_SPEED = 0.5;
const ALL_LANES_RUNNING = [true, true, true, true] as const;
// Scrap riding the recycle loop, per minute, so the return route stays busy
const FRINGE_PER_MINUTE = 6;
const RECYCLED_SOAP_PER_MINUTE = 2;
// Short bars staged onto the reject conveyor, as the original's dummy mode did
const SHORT_BAR_DROP_TOTAL = 4;
const SHORT_BAR_INTERVAL_MS = 30_000;

// Mixer discharge gate: 0 is shut, -10 open. Panel and actuator hinge apart.
const GATE_OPEN_DEG = -10;
const GATE_PANEL_PIVOT: [number, number, number] = [0.319, 2.081, -1.024];
const GATE_ACTUATOR_PIVOT: [number, number, number] = [0.316, 2.064, -0.957];

// Rotating parts, pivots tuned on the original. Twin screws, mixer blades and
// mill rolls counter-rotate, so signs alternate within each set.
const spin = (
  axis: "x" | "z",
  pivot: [number, number, number],
  degPerSec: number,
): GateHingeConfig => ({ axis, pivot, angleDeg: 0, spinning: true, spinSpeedDegPerSec: degPerSec });

const ROTOR_1 = spin("x", [0.32, 1.944, -1.119], MIXER_RPM * DEG_PER_SEC_PER_RPM);
const ROTOR_2 = spin("x", [0.32, 1.944, -1.042], -MIXER_RPM * DEG_PER_SEC_PER_RPM);
const LEFT_SCREW = spin("z", [0.292, 1.338, -1.045], -NOODLER.rpm * DEG_PER_SEC_PER_RPM);
const RIGHT_SCREW = spin("z", [0.331, 1.338, -1.045], NOODLER.rpm * DEG_PER_SEC_PER_RPM);
const ROLL_1 = spin("x", [-0.075, 0.906, -0.907], -MILL_RPM * DEG_PER_SEC_PER_RPM);
const ROLL_2 = spin("x", [-0.075, 0.937, -0.976], MILL_RPM * DEG_PER_SEC_PER_RPM);
const ROLL_3 = spin("x", [-0.075, 1.011, -0.998], -MILL_RPM * DEG_PER_SEC_PER_RPM);
const PP_SHAFT_A = spin("x", PP_SHAFT_A_PIVOT, PRE_PLODDER.rpm * DEG_PER_SEC_PER_RPM);
const PP_SHAFT_B = spin("x", PP_SHAFT_B_PIVOT, -PRE_PLODDER.rpm * DEG_PER_SEC_PER_RPM);
const FP_SHAFT_2 = spin("z", FP_SHAFT_2_PIVOT, -FINAL_PLODDER_RPM * DEG_PER_SEC_PER_RPM);
const FP_SHAFT_3 = spin("z", FP_SHAFT_3_PIVOT, FINAL_PLODDER_RPM * DEG_PER_SEC_PER_RPM);
const CONVEYOR: ConveyorBeltConfig = { uvAxis: "x", speed: CONVEYOR_UV_SPEED, running: true };
// The second belt mesh is always hidden by Model, so it stays stopped
const CONVEYOR_2: ConveyorBeltConfig = { uvAxis: "x", speed: 0.5, running: false };

// The soap is drawn in the pink SKU's palette, as on the plant's own twin
const PRODUCT_PALETTE = resolveProductPalette("pink");

const NO_HIDDEN = new Set<string>();
const noop = () => {};
const WIREFRAME_COLOR = "#3a8fd0";

/** Housings made see-through by X-ray, so the screws and paste show. */
function opacities(xray: boolean) {
  const shell = xray ? 0.25 : 1;
  const inner = xray ? 0.2 : 0.4; // these start see-through, as on the original
  return {
    mixerOpacity: shell,
    noodlerOpacity: shell,
    hopperOpacity: shell,
    trmChuteOpacity: shell,
    recycleConveyorOpacity: shell,
    prePlodderOpacity: shell,
    prePlodderBodyOpacity: inner,
    vacuumChamberOpacity: inner,
    finalPlodderOpacity: inner,
    coneHeaterOpacity: inner,
  };
}

/** Download progress, over the canvas. */
function LoadOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/60">
      <p className="hud-label text-muted">Loading line · {Math.round(progress)}%</p>
      <div className="h-px w-40 overflow-hidden bg-line">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export default function SoapLineTwin({
  active,
  live,
  coarse,
  apiRef,
  xray,
  wireframe,
}: {
  active: boolean;
  live: boolean;
  coarse: boolean;
  apiRef?: MutableRefObject<TwinApi | null>;
  xray: boolean;
  wireframe: boolean;
}) {
  const [position, setPosition] = useState<[number, number, number] | null>(null);
  const recycleRouteRef = useRef<RecycleRoute | null>(null);
  const liftRouteRef = useRef<LiftRoute | null>(null);

  // Rest the line on the ground once measured (one model, so no layout gaps)
  const onMeasured = useCallback((bounds: ModelBounds) => {
    setPosition((prev) => prev ?? [-bounds.min.x, -bounds.min.y, 0]);
  }, []);

  // Mixer gate on the original's compressed batch loop, so discharge,
  // recharge and mixing all play in turn
  const [gateShut, setGateShut] = useState(true);
  useEffect(() => {
    const started = performance.now();
    const tick = window.setInterval(
      () => setGateShut(dummyGateClosed((performance.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(tick);
  }, []);
  const gateAngleDeg = gateShut ? 0 : GATE_OPEN_DEG;
  const gateConfig = useMemo<GateHingeConfig>(
    () => ({ axis: "x", pivot: GATE_PANEL_PIVOT, angleDeg: gateAngleDeg }),
    [gateAngleDeg],
  );
  const gateActuatorConfig = useMemo<GateHingeConfig>(
    () => ({ axis: "x", pivot: GATE_ACTUATOR_PIVOT, angleDeg: gateAngleDeg }),
    [gateAngleDeg],
  );

  // Short bars split randomly across the two cutters every 30s. Requests are
  // one-shot (keyed on id), so the second cutter's share goes a beat later.
  const [shortBarRequest, setShortBarRequest] = useState<ShortBarRequest | null>(null);
  const nextRequestId = useRef(0);
  useEffect(() => {
    let second: number | undefined;
    const dropOne = (cutter: number, count: number) => {
      if (count <= 0) return;
      nextRequestId.current += 1;
      setShortBarRequest({ cutter, count, id: nextRequestId.current });
    };
    const interval = window.setInterval(() => {
      const left = Math.floor(Math.random() * (SHORT_BAR_DROP_TOTAL + 1));
      dropOne(0, left);
      second = window.setTimeout(() => dropOne(1, SHORT_BAR_DROP_TOTAL - left), 150);
    }, SHORT_BAR_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(second);
    };
  }, []);

  const housing = opacities(xray);

  return (
    <div className="relative h-full w-full">
      <Canvas
        // The line animates continuously; stop drawing entirely when hidden
        frameloop={active ? "always" : "never"}
        dpr={[1, 1.5]}
        camera={{ position: SOAP_LINE_VIEW.position, fov: 50, near: 0.01, far: 100 }}
        shadows
        style={{ background: "transparent" }}
      >
        <hemisphereLight intensity={0.7} groundColor="#cfcfd4" />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 15, 10]} intensity={1.0} castShadow />
        <directionalLight position={[-10, 4, 0]} intensity={1.2} />

        {/* Provided inside the Canvas so it reaches the scene's components
            without relying on R3F's context bridging */}
        <ProductColorContext.Provider value={PRODUCT_PALETTE}>
        {/* Hidden until placed, so it never flashes up at the origin */}
        <group visible={position !== null}>
          <Suspense fallback={null}>
            <Model
              url={LINE_URL}
              position={position ?? [0, 0, 0]}
              onMeasured={onMeasured}
              selectionMode={false}
              hiddenUuids={NO_HIDDEN}
              onMeshSelect={noop}
              gateConfig={gateConfig}
              gateActuatorConfig={gateActuatorConfig}
              rotor1Config={ROTOR_1}
              rotor2Config={ROTOR_2}
              leftScrewConfig={LEFT_SCREW}
              rightScrewConfig={RIGHT_SCREW}
              conveyorConfig={CONVEYOR}
              conveyor2Config={CONVEYOR_2}
              roll1Config={ROLL_1}
              roll2Config={ROLL_2}
              roll3Config={ROLL_3}
              ppShaftAConfig={PP_SHAFT_A}
              ppShaftBConfig={PP_SHAFT_B}
              fpShaft2Config={FP_SHAFT_2}
              fpShaft3Config={FP_SHAFT_3}
              {...housing}
              gateOpen={!gateShut}
              hopperLevel={NOODLER.level}
              prePlodderLevel={PRE_PLODDER.level}
              beltSpeedFactor={1}
              shortBarRequest={shortBarRequest}
              onShortBarsPending={noop}
              recycleRouteRef={recycleRouteRef}
              shortBarsPerMinute={0}
              liftRouteRef={liftRouteRef}
            />
          </Suspense>
          {/* The stamper end shares the line's coordinates, so it takes the
              same offset and continues the line exactly */}
          {position && (
            <Suspense fallback={null}>
              <StaticModel
                url={STAMPER_URL}
                position={position}
                selectionMode={false}
                hiddenUuids={NO_HIDDEN}
                onMeshSelect={noop}
              >
                {(stamperScene) => (
                  <StamperSuction
                    scene={stamperScene}
                    lanes={ALL_LANES_RUNNING}
                    recycleRouteRef={recycleRouteRef}
                    fringePerMinute={FRINGE_PER_MINUTE}
                    recycledSoapPerMinute={RECYCLED_SOAP_PER_MINUTE}
                    liftRouteRef={liftRouteRef}
                  />
                )}
              </StaticModel>
            </Suspense>
          )}
          <Suspense fallback={null}>
            <Wireframe url={LINE_URL} enabled={wireframe} color={WIREFRAME_COLOR} />
            <Wireframe url={STAMPER_URL} enabled={wireframe} color={WIREFRAME_COLOR} />
          </Suspense>
        </group>
        </ProductColorContext.Provider>

        <TwinControls
          view={SOAP_LINE_VIEW}
          live={live}
          coarse={coarse}
          spin={active}
          apiRef={apiRef}
          minDistance={0.3}
          maxDistance={4}
          spinSpeed={0.4}
        />
      </Canvas>
      <LoadOverlay />
    </div>
  );
}
