import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPostBySlug, getAllPosts, formatDate } from "@/lib/blog";
import { MDXRemote } from "next-mdx-remote/rsc";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.metadata.title,
    description: post.metadata.summary,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) notFound();

  return (
    <div className="max-w-3xl mx-auto px-6 pt-28 pb-20">
      {/* Back */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-[#606060] hover:text-white text-sm transition-colors mb-10"
      >
        <ArrowLeft size={14} />
        All articles
      </Link>

      {/* Header */}
      <header className="mb-10 space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          {post.metadata.title}
        </h1>
        <p className="text-[#A0A0A0] text-base">{post.metadata.summary}</p>
        <div className="flex items-center gap-3 text-[#606060] text-sm">
          <span>{formatDate(post.metadata.publishedAt)}</span>
          <span>·</span>
          <span>{post.metadata.readTime}</span>
        </div>
        <hr className="border-[#2A2A2A]" />
      </header>

      {/* Content */}
      <article className="prose prose-invert max-w-none">
        <MDXRemote source={post.content} />
      </article>

      {/* Back to blog */}
      <div className="mt-16 pt-8 border-t border-[#2A2A2A]">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-[#A0A0A0] hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={14} />
          Back to all articles
        </Link>
      </div>
    </div>
  );
}
