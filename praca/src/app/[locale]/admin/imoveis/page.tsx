import { getTranslations, setRequestLocale } from "next-intl/server";
import { HideButton, ListingStatusSelect } from "@/components/admin/admin-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminProperties({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const { q } = await searchParams;
  const like = q?.trim() ? `%${q.trim().replace(/[%_\\]/g, "\\$&")}%` : null;
  const rows = await sql<{ id: string; property_id: string; reference: string; title: string; price: number; status: string; source: string; hidden: boolean; business: string }[]>`
    SELECT l.id, p.id AS property_id, p.reference, l.title, l.price::float8 AS price, l.status::text AS status, s.name AS source, (p.deleted_at IS NOT NULL) AS hidden, l.business::text AS business
    FROM listings l JOIN properties p ON p.id = l.property_id JOIN sources s ON s.id = l.source_id
    WHERE l.deleted_at IS NULL ${like ? sql`AND (p.reference ILIKE ${like} OR l.title ILIKE ${like} OR l.external_id ILIKE ${like})` : sql``}
    ORDER BY l.updated_at DESC LIMIT 100`;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-medium">{t("tabs.properties")}</h1>
      <form role="search" className="flex gap-3"><Input name="q" defaultValue={q ?? ""} placeholder={t("search")} aria-label={t("search")} className="max-w-sm" /><Button type="submit" variant="secondary">OK</Button></form>
      <div className="overflow-x-auto rounded-[16px] border border-border bg-surface">
        <table className="w-full min-w-[860px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-muted"><th scope="col" className="p-3 font-medium">{t("colRef")}</th><th scope="col" className="p-3 font-medium">{t("colTitle")}</th><th scope="col" className="p-3 font-medium">{t("colSource")}</th><th scope="col" className="p-3 text-right font-medium">{t("colPrice")}</th><th scope="col" className="p-3 font-medium">{t("colStatus")}</th><th scope="col" className="p-3"><span className="sr-only">{t("colActions")}</span></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <th scope="row" className="p-3 text-left font-medium"><Link href={`/imovel/${r.reference.toLowerCase()}`} className="hover:underline">{r.reference}</Link>{r.hidden && <Badge tone="down" className="ml-2">{t("hidden")}</Badge>}</th>
                <td className="max-w-72 truncate p-3">{r.title}</td><td className="p-3 text-muted">{r.source}</td>
                <td className="tnum p-3 text-right">{formatEur(r.price)}{r.business === "rent" ? "/mês" : ""}</td>
                <td className="p-3"><ListingStatusSelect id={r.id} status={r.status} /></td>
                <td className="p-3 text-right"><HideButton id={r.property_id} hidden={r.hidden} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
