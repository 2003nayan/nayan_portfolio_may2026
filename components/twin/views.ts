// Camera views for the twins. Kept free of three.js imports so the stage UI
// can list them without pulling the 3D chunk into the main bundle.
import type { CameraView } from "@/components/twin/twin-controls";

export type ViewPreset = CameraView & { id: string; label: string };

/** Opening view, picked by hand on the original (fov 50). */
export const SOAP_LINE_VIEW: CameraView = {
  position: [-2.259, 2.308, -0.241],
  target: [0.779, 2.056, -0.374],
};

/** Hand-picked views along the line, from the original's camera presets. */
export const SOAP_LINE_PRESETS: ViewPreset[] = [
  { id: "upper", label: "Mixing floor", position: [1.117, 3.363, -2.244], target: [1.135, 2.644, 0.08] },
  { id: "lower", label: "Milling floor", position: [0.829, 2.746, 0.127], target: [0.918, 2.531, -0.403] },
  { id: "plodder", label: "Plodders", position: [0.156, 1.604, -0.387], target: [0.484, 1.499, -0.815] },
  { id: "stamper", label: "Stampers", position: [-0.321, 1.376, 1.1], target: [0.84, 1.228, 0.909] },
];

