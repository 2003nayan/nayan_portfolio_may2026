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
      { label: "Film feed", detail: "The web steps one sachet per stroke, in sync with the jaws." },
      { label: "Filler pistons", detail: "Twelve pumps dose while the jaws are shut, refill while open." },
      { label: "Output", detail: "Finished sachet mats fold and stack onto the conveyor." },
    ],
  },
  {
    kind: "soap-line",
    label: "Fig. 02 · Soap finishing line",
    sizeMb: 34,
    presets: SOAP_LINE_PRESETS,
    motion: [
      { label: "Mixing", detail: "Sigma blades turn the batch; the gate opens to discharge and recharge." },
      { label: "Milling", detail: "Noodler screws and counter-rotating mill rolls work the mass into flakes." },
      { label: "Plodding", detail: "Twin screws compact it through the vacuum chamber into a continuous bar." },
      { label: "Stamping", detail: "Billets are cut, stamped and lifted out; scrap rides the loop back." },
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
        intro="Digital twins I built for live production lines. Every stroke, turn and drop is driven in code against the real machine models, at their real running speeds. Click in to zoom and look around."
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
