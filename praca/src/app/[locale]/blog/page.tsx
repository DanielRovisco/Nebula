import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { NewsletterForm } from "@/components/newsletter-form";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { listArticles } from "@/server/articles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return { title: t("title"), description: t("sub") };
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const f = await getFormatter();
  const items = await listArticles();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-12 sm:px-6">
      <h1 className="font-display text-4xl font-medium sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t("sub")}</p>
      {locale === "en" && <p className="mt-3 text-sm text-muted">{t("ptOnly")}</p>}
      <ul className="mt-10 divide-y divide-border border-y border-border">
        {items.length === 0 && <li className="py-8 text-muted">{t("empty")}</li>}
        {items.map((a) => (
          <li key={a.slug} className="py-6">
            <Link href={`/blog/${a.slug}`} className="group block">
              <p className="text-sm text-muted">{f.dateTime(new Date(a.publishedAt), { dateStyle: "long" })}</p>
              <h2 className="mt-1 text-2xl font-semibold group-hover:text-brand">{a.title}</h2>
              {a.excerpt && <p className="mt-2 max-w-[68ch] text-muted">{a.excerpt}</p>}
            </Link>
            <div className="mt-3 flex flex-wrap gap-1.5">{a.tags.map((tag) => <Badge key={tag} tone="outline">{tag}</Badge>)}</div>
          </li>
        ))}
      </ul>
      <section aria-labelledby="nl" className="mt-14 max-w-xl rounded-[20px] border border-border bg-surface p-6">
        <h2 id="nl" className="text-xl font-semibold">{t("newsletterTitle")}</h2>
        <p className="mb-4 mt-1 text-sm text-muted">{t("newsletterText")}</p>
        <NewsletterForm />
      </section>
    </div>
  );
}
