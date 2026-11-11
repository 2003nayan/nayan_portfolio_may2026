import Link from "next/link";

type Variant = "primary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-invert-bg text-invert-fg border border-invert-bg hover:bg-accent hover:border-accent hover:text-white",
  ghost:
    "border border-line-strong text-ink hover:bg-invert-bg hover:border-invert-bg hover:text-invert-fg",
};

export function buttonClasses(variant: Variant = "primary", className = "") {
  return `invert-block hud-label inline-flex h-11 items-center justify-center gap-2 px-5 ${VARIANTS[variant]} ${className}`;
}

export default function Button({
  href,
  children,
  variant = "primary",
  external = false,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  external?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={buttonClasses(variant, className)}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {children}
    </Link>
  );
}
