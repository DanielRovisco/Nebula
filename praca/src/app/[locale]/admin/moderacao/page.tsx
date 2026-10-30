import { ShieldCheck } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FraudScanButton, ModerationButtons, RevokeVerificationButton, VerifyForm } from "@/components/admin/admin-controls";
import { EmptyState } from "@/components/ui/states";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";
import { listVerifications } from "@/server/verification";

export const dynamic = "force-dynamic";

export default async function AdminModeration({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const rows = await sql<{ id: string; reference: string; title: string; price: number; advertiser: string | null; fraud: number; source: string }[]>`
    SELECT l.id, p.reference, l.title, l.price::float8 AS price, l.advertiser_name AS advertiser, l.fraud_score AS fraud, s.name AS source
    FROM listings l JOIN properties p ON p.id = l.property_id JOIN sources s ON s.id = l.source_id WHERE l.status = 'pending_review' AND l.deleted_at IS NULL ORDER BY l.created_at DESC LIMIT 100`;
  const signals = rows.length ? await sql<{ listing_id: string; code: string; severity: number }[]>`SELECT listing_id, code, severity FROM fraud_signals WHERE listing_id = ANY(${sql.array(rows.map((r) => r.id))}::uuid[]) ORDER BY severity DESC` : [];
  const verifications = await listVerifications();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-medium">{t("modTitle")}</h1>
      <FraudScanButton />
      {rows.length === 0 ? <EmptyState icon={<ShieldCheck className="size-6" aria-hidden />} title={t("modEmpty")} text={t("modEmptyText")} /> : (
        <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
          {rows.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><div className="min-w-0"><Link href={`/imovel/${r.reference.toLowerCase()}`} className="font-medium hover:underline">{r.reference} · {r.title}</Link><p className="tnum text-xs text-muted">{formatEur(r.price)} · {r.advertiser ?? "—"} · {r.source} · {t("fraudScore")} {r.fraud}</p>{signals.filter((x) => x.listing_id === r.id).length > 0 && <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">{signals.filter((x) => x.listing_id === r.id).map((x) => <li key={x.code} className={x.severity === 3 ? "rounded-full bg-down/10 px-2 py-0.5 text-down" : "rounded-full bg-warn-soft px-2 py-0.5 text-warn"}>{t(`fraudCodes.${x.code}`)}</li>)}</ul>}</div><ModerationButtons id={r.id} /></li>)}
        </ul>
      )}
      <section aria-labelledby="verif" className="space-y-4 rounded-[16px] border border-border bg-surface p-5">
        <h2 id="verif" className="text-lg font-semibold">{t("verifyTitle")}</h2>
        <p className="text-sm text-muted">{t("verifyHelp")}</p>
        <VerifyForm />
        {verifications.length > 0 && (
          <ul className="divide-y divide-border text-sm">
            {verifications.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><Link href={`/imovel/${v.reference.toLowerCase()}`} className="font-medium hover:underline">{v.reference}</Link> · {t(`verifyMethods.${v.method as "licence_ami"}`)} · {v.ref} · {v.at.slice(0, 10)}</span>
                <RevokeVerificationButton id={v.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
