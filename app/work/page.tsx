import type { Metadata } from "next";
import { PageHeader, CONTAINER } from "@/components/ui/section";
import CaseStudyGrid from "@/components/case-study/case-study-grid";
import { CASE_STUDIES } from "@/data/case-studies";

export const metadata: Metadata = {
  title: "Case studies",
  description:
    "Client platforms for global FMCG and spirits manufacturers: shopfloor operations, digital twins and real-time quality systems.",
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
        intro="Platforms running on real factory floors for global FMCG and spirits manufacturers: the problem, my role, the architecture and the hard parts."
      />
      <div className={`${CONTAINER} py-16 md:py-24`}>
        <CaseStudyGrid studies={CASE_STUDIES} />
      </div>
    </>
  );
}
