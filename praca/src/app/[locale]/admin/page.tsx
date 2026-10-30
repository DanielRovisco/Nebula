import { getTranslations, setRequestLocale } from "next-intl/server";
import { sql } from "@/db";

export const dynamic = "force-dynamic";

export default async function AdminOverview({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");
  const [s] = await sql<Record<string, number>[]>`
    SELECT (SELECT count(*)::int FROM users WHERE deleted_at IS NULL) AS users,
           (SELECT count(*)::int FROM organizations WHERE deleted_at IS NULL) AS orgs,
           (SELECT count(*)::int FROM properties WHERE deleted_at IS NULL) AS properties,
           (SELECT count(*)::int FROM listings WHERE status = 'active' AND deleted_at IS NULL) AS listings,
           (SELECT count(*)::int FROM listings WHERE status = 'pending_review' AND deleted_at IS NULL) AS review,
           (SELECT count(*)::int FROM dedupe_candidates WHERE status = 'pending') AS dedupe,
           (SELECT count(*)::int FROM sources WHERE enabled) AS sources,
           (SELECT count(*)::int FROM ingestion_runs WHERE started_at > now() - interval '24 hours') AS runs24,
           (SELECT count(*)::int FROM ingestion_errors WHERE created_at > now() - interval '24 hours') AS errors24`;
  const keys = ["users", "orgs", "properties", "listings", "review", "dedupe", "sources", "runs24", "errors24"] as const;
  return (
    <div>
      <h1 className="font-display text-3xl font-medium">{t("title")}</h1>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((k) => (
          <div key={k} className="rounded-[16px] border border-border bg-surface p-5">
            <dt className="text-sm text-muted">{t(`stat.${k}`)}</dt>
            <dd className="tnum mt-1 text-3xl font-semibold">{new Intl.NumberFormat("pt-PT").format(s?.[k] ?? 0)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
