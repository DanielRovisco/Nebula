import { sql } from "@/db";

export interface ArticleRow {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  tags: string[];
  publishedAt: string;
}

export async function listArticles(limit = 30): Promise<Omit<ArticleRow, "body">[]> {
  return sql<Omit<ArticleRow, "body">[]>`
    SELECT slug, title, excerpt, tags, published_at::text AS "publishedAt" FROM articles
    WHERE locale = 'pt' AND deleted_at IS NULL AND published_at IS NOT NULL AND published_at <= now()
    ORDER BY published_at DESC LIMIT ${limit}`;
}

export async function getArticle(slug: string): Promise<ArticleRow | null> {
  const [a] = await sql<ArticleRow[]>`
    SELECT slug, title, excerpt, body, tags, published_at::text AS "publishedAt" FROM articles
    WHERE slug = ${slug} AND locale = 'pt' AND deleted_at IS NULL AND published_at IS NOT NULL AND published_at <= now()`;
  return a ?? null;
}
