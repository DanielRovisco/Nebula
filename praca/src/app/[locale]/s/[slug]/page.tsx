import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/valuation/report-view";
import { getValuationBySlug } from "@/server/valuation-data";

export const dynamic = "force-dynamic";
// Private by design: SmartLinks are for the people they were shared with, not for search engines.
export const metadata: Metadata = { title: "Relatório de avaliação", robots: { index: false, follow: false } };

export default async function SmartLinkPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const rec = await getValuationBySlug(slug);
  if (!rec) notFound();
  const t = await getTranslations("valuation");
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
      <ReportView rec={rec} publicView />
      <p className="mt-10 text-xs text-muted">{t("refreshed")} · {t("poweredBy")}</p>
    </div>
  );
}
