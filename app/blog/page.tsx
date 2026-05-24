import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getAllPosts, formatDate } from "@/lib/blog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Thoughts on career growth, technical deep-dives, and lessons from building production systems.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 pb-20">
      <div className="mb-12">
        <p className="section-label mb-3">Writing</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
          All Articles
        </h1>
        <p className="text-[#A0A0A0] text-base">
          Thoughts on career growth, technical deep-dives, and lessons from the
          field.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="text-[#606060]">No posts yet. Check back soon.</p>
      ) : (
        <div className="divide-y divide-[#2A2A2A]">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex items-start justify-between gap-4 py-6 group"
            >
              <div className="space-y-1.5 min-w-0">
                <h2 className="text-white font-semibold text-lg group-hover:text-[#FF6B35] transition-colors leading-snug">
                  {post.metadata.title}
                </h2>
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
      )}
    </div>
  );
}
