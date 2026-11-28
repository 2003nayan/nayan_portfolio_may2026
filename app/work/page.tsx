import type { Metadata } from "next";
import { PageHeader, CONTAINER } from "@/components/ui/section";
import CaseStudyGrid from "@/components/case-study/case-study-grid";
import { CASE_STUDIES } from "@/data/case-studies";

export const metadata: Metadata = {
  title: "Case studies",
  description:
    "Case studies on software for factory operations, machine monitoring, and quality control.",
};

export default function WorkPage() {
  return (
    <>
      <PageHeader
        crumb="Case studies"
        title={
          <>
            Client <span className="serif-accent">case studies</span>.
          </>
        }
        intro="Software built for consumer goods and spirits manufacturers. Each case study explains what the factory needed, what I built, and what changed."
      />
      <div className={`${CONTAINER} py-16 md:py-24`}>
        <CaseStudyGrid studies={CASE_STUDIES} />
      </div>
    </>
  );
}
