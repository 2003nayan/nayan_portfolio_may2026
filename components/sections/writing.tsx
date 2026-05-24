import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatDate } from "@/lib/blog";

// This needs to be a client component for scroll animation wrapper
// But data fetching happens on server — we'll pass posts as prop

interface Post {
  slug: string;
  metadata: {
    title: string;
    summary: string;
    publishedAt: string;
    readTime: string;
    featured: boolean;
  };
}

export function WritingSection({ posts }: { posts: Post[] }) {
  return (
    <section id="writing" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <p className="section-label mb-3">Writing</p>
        <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          Recent Articles
        </h2>
        <p className="text-[#A0A0A0] mb-10 text-base">
          Thoughts on career growth, technical deep-dives, and lessons from the
          field.
        </p>

        <div className="divide-y divide-[#2A2A2A]">
          {posts.slice(0, 3).map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex items-start justify-between gap-4 py-6 group"
            >
              <div className="space-y-1.5 min-w-0">
                <h3 className="text-white font-semibold group-hover:text-[#FF6B35] transition-colors leading-snug">
                  {post.metadata.title}
                </h3>
                <p className="text-[#A0A0A0] text-sm leading-relaxed line-clamp-2">
                  {post.metadata.summary}
                </p>
                <div className="flex items-center gap-2 text-[#606060] text-xs">
                  <span>{formatDate(post.metadata.publishedAt)}</span>
                  <span>·</span>
                  <span>{post.metadata.readTime}</span>
                </div>
              </div>
              <ArrowUpRight
                size={18}
                className="text-[#606060] group-hover:text-[#FF6B35] transition-colors flex-shrink-0 mt-1"
              />
            </Link>
          ))}
        </div>

        {posts.length > 3 && (
          <div className="mt-6 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm transition-colors"
            >
              View all articles
              <ArrowUpRight size={13} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
