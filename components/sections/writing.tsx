import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/ui/reveal";
import Section, { SectionHeader } from "@/components/ui/section";
import { formatDate, type BlogPost } from "@/lib/blog";

type Post = Pick<BlogPost, "slug" | "metadata">;

export const WRITING_INTRO =
  "Thoughts on career growth, technical deep-dives, and lessons from the field.";

export function PostList({ posts }: { posts: Post[] }) {
  return (
    <ul className="border-t border-line">
      {posts.map((post) => (
        <li key={post.slug} className="border-b border-line">
          <Link
            href={`/blog/${post.slug}`}
            className="group grid gap-x-8 gap-y-2 py-7 transition-colors hover:bg-bg-raised md:grid-cols-12 md:py-9"
          >
            <p className="hud-label text-faint md:col-span-3 md:pt-1.5">
              {formatDate(post.metadata.publishedAt)}
            </p>
            <div className="md:col-span-7">
              <h3 className="font-display text-xl font-medium tracking-tight text-ink-strong transition-colors group-hover:text-accent-ink md:text-2xl">
                {post.metadata.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                {post.metadata.summary}
              </p>
            </div>
            <div className="hud-label flex items-start gap-3 text-faint md:col-span-2 md:justify-end md:pt-1.5">
              {post.metadata.readTime}
              <ArrowUpRight
                size={14}
                aria-hidden="true"
                className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function WritingSection({ posts }: { posts: Post[] }) {
  return (
    <Section id="writing">
      <SectionHeader
        index="06"
        label="Writing"
        title={
          <>
            Notes from the <span className="serif-accent">field</span>.
          </>
        }
        intro={WRITING_INTRO}
        action={{ href: "/blog", label: "All articles" }}
      />
      <Reveal>
        <PostList posts={posts.slice(0, 3)} />
      </Reveal>
    </Section>
  );
}
