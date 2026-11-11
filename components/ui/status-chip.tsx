import { GitMerge, GitPullRequest } from "lucide-react";

export default function StatusChip({ status }: { status: string }) {
  const merged = status === "merged";
  const Icon = merged ? GitMerge : GitPullRequest;

  return (
    <span
      className={`hud-label inline-flex items-center gap-1.5 border px-2 py-1 ${
        merged
          ? "border-accent/50 bg-accent/10 text-accent-ink"
          : "border-line-strong text-muted"
      }`}
    >
      <Icon size={11} aria-hidden="true" />
      {status}
    </span>
  );
}
