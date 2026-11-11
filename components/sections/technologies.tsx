import Marquee from "@/components/ui/marquee";
import { SKILLS_ROW_1, SKILLS_ROW_2 } from "@/data/skills";

export default function Technologies() {
  return (
    <section
      id="technologies"
      aria-label="Technologies I work with"
      className="border-t border-line bg-bg-raised py-5"
    >
      <Marquee items={[...SKILLS_ROW_1, ...SKILLS_ROW_2]} />
    </section>
  );
}
