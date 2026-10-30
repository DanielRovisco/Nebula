import { ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ModerationButtons } from "@/components/admin/admin-controls";
import { EmptyState } from "@/components/ui/states";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminModeration({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const rows = await sql<{ id: string; reference: string; title: string; price: number; advertiser: string | null; fraud: number; source: string }[]>`
    SELECT l.id, p.reference, l.title, l.price::float8 AS price, l.advertiser_name AS advertiser, l.fraud_score AS fraud, s.name AS source
    FROM listings l JOIN properties p ON p.id = l.property_id JOIN sources s ON s.id = l.source_id WHERE l.status = 'pending_review' AND l.deleted_at IS NULL ORDER BY l.created_at DESC LIMIT 100`;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-medium">{t("modTitle")}</h1>
      {rows.length === 0 ? <EmptyState icon={<ShieldCheck className="size-6" aria-hidden />} title={t("modEmpty")} text={t("modEmptyText")} /> : (
        <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
          {rows.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><div className="min-w-0"><Link href={`/imovel/${r.reference.toLowerCase()}`} className="font-medium hover:underline">{r.reference} · {r.title}</Link><p className="tnum text-xs text-muted">{formatEur(r.price)} · {r.advertiser ?? "—"} · {r.source}</p></div><ModerationButtons id={r.id} /></li>)}
        </ul>
      )}
    </div>
  );
}
