import { Calculator } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";
import { requireUser } from "@/server/session";
import { listValuations } from "@/server/valuation-data";

export const dynamic = "force-dynamic";

export default async function ValuationsListPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("valuation");
  const f = await getFormatter();
  const rows = await listValuations(u.id);
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-medium">{t("listTitle")}</h1>
        <Button asChild><Link href="/avaliar">{t("listEmptyCta")}</Link></Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<Calculator className="size-6" aria-hidden />} title={t("listEmptyTitle")} text={t("listEmptyText")} action={<Button asChild><Link href="/avaliar">{t("listEmptyCta")}</Link></Button>} />
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-[16px] border border-border bg-surface">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate font-medium">{r.title ?? "—"}</p>
                <p className="text-xs text-muted">{f.dateTime(r.created_at, "short")}{r.slug ? " · SmartLink" : ""}</p>
              </div>
              <p className="tnum text-sm">{r.low ? `${formatEur(r.low)} – ${formatEur(r.high ?? 0)}` : ""}</p>
              <p className="tnum text-lg font-semibold">{r.estimate ? formatEur(r.estimate) : "—"}</p>
              <Button asChild size="sm" variant="soft"><Link href={`/avaliar/${r.id}`}>{t("open")}</Link></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
