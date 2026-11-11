import type { Metadata } from "next";
import { PageHeader, CONTAINER } from "@/components/ui/section";
import { PostList, WRITING_INTRO } from "@/components/sections/writing";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Thoughts on career growth, technical deep-dives, and lessons from building production systems.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <PageHeader
        crumb="Writing"
        title={
          <>
            All <span className="serif-accent">articles</span>.
          </>
        }
        intro={WRITING_INTRO}
      />
      <div className={`${CONTAINER} py-16 md:py-24`}>
        {posts.length === 0 ? (
          <p className="text-faint">No posts yet. Check back soon.</p>
        ) : (
          <PostList posts={posts} />
        )}
      </div>
    </>
  );
}
