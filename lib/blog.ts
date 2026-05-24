import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");

export interface BlogPost {
  slug: string;
  metadata: {
    title: string;
    summary: string;
    publishedAt: string;
    readTime: string;
    featured: boolean;
    tags?: string[];
  };
  content: string;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const posts = files.map((filename) => {
    const slug = filename.replace(/\.(mdx|md)$/, "");
    const filePath = path.join(CONTENT_DIR, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    return {
      slug,
      metadata: {
        title: data.title ?? "Untitled",
        summary: data.summary ?? "",
        publishedAt: data.publishedAt ?? "",
        readTime: data.readTime ?? "5 min read",
        featured: data.featured ?? false,
        tags: data.tags ?? [],
      },
      content,
    };
  });

  return posts.sort(
    (a, b) =>
      new Date(b.metadata.publishedAt).getTime() -
      new Date(a.metadata.publishedAt).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | null {
  const extensions = [".mdx", ".md"];
  for (const ext of extensions) {
    const filePath = path.join(CONTENT_DIR, `${slug}${ext}`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const { data, content } = matter(raw);
      return {
        slug,
        metadata: {
          title: data.title ?? "Untitled",
          summary: data.summary ?? "",
          publishedAt: data.publishedAt ?? "",
          readTime: data.readTime ?? "5 min read",
          featured: data.featured ?? false,
          tags: data.tags ?? [],
        },
        content,
      };
    }
  }
  return null;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    day: "numeric",
  });
}
