import { Handshake } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShareActions, ShareForm } from "@/components/crm/share-controls";
import { UpgradeGate } from "@/components/crm/upgrade-gate";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { sql } from "@/db";
import { formatEur } from "@/lib/format";
import { crmContext } from "@/server/crm-gate";

export const dynamic = "force-dynamic";

type Row = { id: string; status: string; split_pct: number; partner_email: string | null; ref: string; title: string; price: number; owner_name: string; partner_name: string | null };

export default async function SharesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ctx, allowed, canWrite } = await crmContext();
  if (!allowed) return <UpgradeGate />;
  const t = await getTranslations("crm.shares");
  const base = sql`
    SELECT s.id, s.status, s.split_pct::float8 AS split_pct, s.partner_email, p.reference AS ref, l.title, l.price::float8 AS price, oo.name AS owner_name, po.name AS partner_name
    FROM commission_shares s JOIN listings l ON l.id = s.listing_id JOIN properties p ON p.id = l.property_id
    JOIN organizations oo ON oo.id = s.owner_org_id LEFT JOIN organizations po ON po.id = s.partner_org_id`;
  const outgoing = await sql<Row[]>`${base} WHERE s.owner_org_id = ${ctx.orgId} ORDER BY s.created_at DESC`;
  const incoming = await sql<Row[]>`${base} WHERE s.owner_org_id <> ${ctx.orgId} AND (s.partner_org_id = ${ctx.orgId} OR lower(s.partner_email) = ${ctx.user.email.toLowerCase()}) ORDER BY s.created_at DESC`;
  const table = (rows: Row[], mode: "owner" | "partner") => (
    <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div className="min-w-0"><p className="font-medium">{r.ref} · <span className="font-normal">{r.title}</span></p><p className="tnum text-xs text-muted">{formatEur(r.price)} · {mode === "owner" ? `${t("with")}: ${r.partner_name ?? r.partner_email}` : `${t("from")}: ${r.owner_name}`} · {t("splitLabel", { pct: r.split_pct, own: Math.round((100 - r.split_pct) * 10) / 10 })}</p></div>
          <div className="flex items-center gap-3"><Badge tone={r.status === "accepted" ? "up" : r.status === "declined" ? "down" : r.status === "closed" ? "brand" : "outline"}>{t(`status.${r.status as "invited"}`)}</Badge>{canWrite && <ShareActions id={r.id} mode={mode} status={r.status} />}</div>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
      <div><h1 className="font-display text-3xl font-medium">{t("title")}</h1><p className="mt-1 text-muted">{t("sub")}</p></div>
      {canWrite && <section aria-labelledby="ns"><h2 id="ns" className="mb-3 text-lg font-semibold">{t("new")}</h2><ShareForm /></section>}
      <section aria-labelledby="in"><h2 id="in" className="mb-3 text-lg font-semibold">{t("incoming")}</h2>{incoming.length ? table(incoming, "partner") : <EmptyState icon={<Handshake className="size-6" aria-hidden />} title={t("empty")} text={t("emptyText")} />}</section>
      <section aria-labelledby="out"><h2 id="out" className="mb-3 text-lg font-semibold">{t("outgoing")}</h2>{outgoing.length ? table(outgoing, "owner") : <p className="text-sm text-muted">{t("empty")}</p>}</section>
    </div>
  );
}
