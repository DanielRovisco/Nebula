import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { siteUrl } from "@/lib/env";
import { Markdown } from "@/lib/markdown";
import { getArticle } from "@/server/articles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  return a ? { title: a.title, description: a.excerpt ?? undefined, openGraph: { type: "article", title: a.title, description: a.excerpt ?? undefined } } : { title: "Artigo" };
}

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const a = await getArticle(slug);
  if (!a) notFound();
  const t = await getTranslations("blog");
  const f = await getFormatter();
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: a.title, datePublished: a.publishedAt, description: a.excerpt, url: `${siteUrl}/blog/${a.slug}`, publisher: { "@type": "Organization", name: "Praça" } }} />
      <Link href="/blog" className="text-sm text-brand underline">{t("back")}</Link>
      <p className="mt-6 text-sm text-muted">{f.dateTime(new Date(a.publishedAt), { dateStyle: "long" })}</p>
      <h1 className="mt-1 text-balance font-display text-4xl font-medium sm:text-5xl">{a.title}</h1>
      <div className="mt-4 flex flex-wrap gap-1.5">{a.tags.map((tag) => <Badge key={tag} tone="outline">{tag}</Badge>)}</div>
      <div className="mt-10 space-y-5 text-[17px] leading-relaxed [&_p]:max-w-[68ch]">
        <Markdown source={a.body} />
      </div>
    </article>
  );
}
