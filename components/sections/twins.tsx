import Reveal from "@/components/ui/reveal";
import Section, { SectionHeader } from "@/components/ui/section";
import TwinStage, { type TwinKind } from "@/components/twin/twin-stage";
import { SOAP_LINE_PRESETS } from "@/components/twin/views";
import type { ViewPreset } from "@/components/twin/views";

// Generic on purpose: client work is under NDA, so only the models and their
// motion are shown, never client names, sites or data.
const TWINS: {
  kind: TwinKind;
  label: string;
  sizeMb: number;
  presets?: ViewPreset[];
  motion: { label: string; detail: string }[];
}[] = [
  {
    kind: "sachet",
    label: "Fig. 01 · Sachet packaging machine",
    sizeMb: 16,
    motion: [
      { label: "Sealers", detail: "Vertical and horizontal jaws close on the film every cycle." },
      { label: "Film feed", detail: "The packaging film advances one sachet length each cycle." },
      { label: "Filler pistons", detail: "Twelve pumps dispense product while the sealers are closed and refill when they open." },
      { label: "Output", detail: "Connected sheets of finished sachets fold and stack on the conveyor." },
    ],
  },
  {
    kind: "soap-line",
    label: "Fig. 02 · Soap finishing line",
    sizeMb: 34,
    presets: SOAP_LINE_PRESETS,
    motion: [
      { label: "Mixing", detail: "Blades mix the batch. A gate opens to empty the mixer before the next batch." },
      { label: "Milling", detail: "Screws feed the soap into rollers that press it into flakes." },
      { label: "Pressing", detail: "Two screws push the soap through a vacuum chamber and press it into a continuous bar." },
      { label: "Stamping", detail: "The machine cuts and stamps individual bars, then sends leftover soap back for reuse." },
    ],
  },
];

export default function Twins() {
  return (
    <Section id="twins">
      <SectionHeader
        index="04"
        label="3D Twins"
        title={
          <>
            Machines, <span className="serif-accent">in motion</span>.
          </>
        }
        intro="Explore animated 3D demos of two machines. The models show how the equipment moves at its normal operating speed. Open a model to rotate it, zoom in, and see how it works."
      />

      <div className="space-y-16 md:space-y-24">
        {TWINS.map((twin) => (
          <div key={twin.kind}>
            <Reveal>
              <TwinStage
                kind={twin.kind}
                label={twin.label}
                sizeMb={twin.sizeMb}
                presets={twin.presets}
              />
            </Reveal>
            <Reveal
              as="dl"
              stagger
              className="grid border-l border-line sm:grid-cols-2 lg:grid-cols-4"
            >
              {twin.motion.map((item, i) => (
                <div key={item.label} className="border-r border-b border-line p-5 md:p-6">
                  <dt className="hud-label text-faint">
                    {String.fromCharCode(65 + i)} / {item.label}
                  </dt>
                  <dd className="mt-3 text-sm leading-relaxed text-muted">{item.detail}</dd>
                </div>
              ))}
            </Reveal>
          </div>
        ))}
      </div>
    </Section>
  );
}
