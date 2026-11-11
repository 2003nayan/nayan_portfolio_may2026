import type { Metadata } from "next";
import { PageHeader, CONTAINER } from "@/components/ui/section";
import { OssStats, PrList, OSS_INTRO } from "@/components/sections/opensource";
import { OSS_CONTRIBUTIONS } from "@/data/opensource";

export const metadata: Metadata = {
  title: "Open Source",
  description:
    "Real bug fixes and security improvements contributed to Bruno and Supabase — 100K+ stars repos.",
};

export default function OpenSourcePage() {
  return (
    <>
      <PageHeader
        crumb="Open Source"
        title={
          <>
            Contributing to the{" "}
            <span className="serif-accent">ecosystem</span>.
          </>
        }
        intro={OSS_INTRO}
      />
      <div className={`${CONTAINER} py-16 md:py-24`}>
        <OssStats />
        <div className="mt-12">
          <PrList prs={OSS_CONTRIBUTIONS} />
        </div>
      </div>
    </>
  );
}
