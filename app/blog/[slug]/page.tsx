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
    <article>
      <header className="border-b border-line">
        <div className="mx-auto max-w-3xl px-5 pt-16 pb-12 sm:px-8 md:pt-24">
          <p className="hud-label text-muted">
            <Link href="/" className="transition-colors hover:text-ink">
              Home
            </Link>
            <span className="mx-2 text-faint">/</span>
            <Link href="/blog" className="transition-colors hover:text-ink">
              Writing
            </Link>
          </p>
          <h1 className="display-2 mt-8">{post.metadata.title}</h1>
          <p className="mt-6 text-lg text-muted">{post.metadata.summary}</p>
          <div className="hud-label mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-faint">
            <span>{formatDate(post.metadata.publishedAt)}</span>
            <span>{post.metadata.readTime}</span>
            {post.metadata.tags?.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 md:py-20">
        <div className="prose">
          <MDXRemote source={post.content} />
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-8 sm:px-8">
          <Link
            href="/blog"
            className="hud-label inline-flex items-center gap-2 text-muted transition-colors hover:text-ink"
          >
            <ArrowLeft size={13} />
            Back to all articles
          </Link>
        </div>
      </div>
    </article>
  );
}
