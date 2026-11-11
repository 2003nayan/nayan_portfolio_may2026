import { Fragment } from "react";

// A stat like "10 → 36" or "2h → 15m". Archivo draws "→" at text-size
// height, so beside display-size digits it sits low; .stat-arrow lifts it
// onto the digits' centre line.
export default function StatValue({ value }: { value: string }) {
  const parts = value.split("→");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 && <span className="stat-arrow">→</span>}
      {part}
    </Fragment>
  ));
}
