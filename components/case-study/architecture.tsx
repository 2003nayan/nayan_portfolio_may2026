import { ArrowDown } from "lucide-react";
import type { ArchitectureTier } from "@/data/case-studies";

// Layered architecture diagram: one bordered tier per layer, top to bottom,
// with the data flow between tiers labelled on the connector.
export default function Architecture({ tiers }: { tiers: ArchitectureTier[] }) {
  return (
    <figure
      className="bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:32px_32px] border border-line p-4 sm:p-6"
      aria-label="System architecture"
    >
      {tiers.map((tier, i) => (
        <div key={tier.label}>
          <div className="border border-line-strong bg-bg-raised">
            <p className="hud-label border-b border-line px-4 py-2 text-muted">
              <span className="text-ink">{String(i + 1).padStart(2, "0")}</span>
              <span className="mx-2 text-faint">/</span>
              {tier.label}
            </p>
            <ul className="flex flex-wrap gap-2 p-4">
              {tier.nodes.map((node) => (
                <li
                  key={node}
                  className="border border-line bg-bg px-3 py-2 text-sm text-ink"
                >
                  {node}
                </li>
              ))}
            </ul>
          </div>

          {i < tiers.length - 1 && (
            <div className="flex items-center gap-3 py-3 pl-6">
              <ArrowDown size={16} className="shrink-0 text-accent" aria-hidden="true" />
              {tier.flow && (
                <span className="hud-label text-faint">{tier.flow}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </figure>
  );
}
