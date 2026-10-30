import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ReportActions } from "@/components/valuation/report-actions";
import { ReportView } from "@/components/valuation/report-view";
import { Button } from "@/components/ui/button";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { siteUrl } from "@/lib/env";
import { effectivePlan, getEntitlement } from "@/server/entitlements";
import { requireUser } from "@/server/session";
import { getValuationForUser } from "@/server/valuation-data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Relatório de avaliação", robots: { index: false } };

export default async function ValuationReportPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const rec = await getValuationForUser(id, u.id);
  if (!rec) notFound();
  const t = await getTranslations("valuation");
  const { plan } = await effectivePlan(u.id);
  const pdf = await getEntitlement(plan, "pdf_reports");
  const [sl] = await sql<{ slug: string }[]>`SELECT slug FROM smartlinks WHERE valuation_id = ${id} ORDER BY created_at DESC LIMIT 1`;
  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-10 sm:px-6">
      <div className="no-print mb-8 flex flex-wrap items-start justify-between gap-4">
        <ReportActions valuationId={id} slug={sl?.slug ?? null} pdfAllowed={pdf.enabled} origin={siteUrl} locale={locale} />
        <Button asChild variant="soft"><Link href="/avaliar"><Plus aria-hidden />{t("back")}</Link></Button>
      </div>
      <ReportView rec={rec} />
    </div>
  );
}
