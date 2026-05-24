import Link from "next/link";
import { SITE } from "@/data/site";
import { GithubIcon, LinkedinIcon, XIcon } from "@/components/icons";

export default function Footer() {
  return (
    <footer className="border-t border-[#2A2A2A] py-8 mt-20">
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          href="/"
          className="text-white font-bold text-lg tracking-tight hover:text-[#FF6B35] transition-colors"
        >
          NK.
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={SITE.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#606060] hover:text-white transition-colors"
            aria-label="GitHub"
          >
            <GithubIcon size={18} />
          </Link>
          <Link
            href={SITE.social.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#606060] hover:text-white transition-colors"
            aria-label="LinkedIn"
          >
            <LinkedinIcon size={18} />
          </Link>
          <Link
            href={SITE.social.x}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#606060] hover:text-white transition-colors"
            aria-label="X / Twitter"
          >
            <XIcon size={18} />
          </Link>
        </div>
        <p className="text-[#606060] text-sm">
          Built with <span className="text-[#FF6B35]">♥</span> by {SITE.name}
        </p>
      </div>
    </footer>
  );
}
