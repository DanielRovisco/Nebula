import { Bell } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { AlertControls } from "@/components/account/alert-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { parseFilters } from "@/lib/filters";
import { buildSearchHref } from "@/lib/search-url";
import { effectivePlan, getEntitlement } from "@/server/entitlements";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function SavedSearchesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("alerts");
  const f = await getFormatter();
  const rows = await sql<{ id: string; name: string; filters: { business: "sale" | "rent"; qs: string; geoSlugs?: Record<string, string> }; alert_id: string; frequency: "instant" | "daily" | "weekly"; active: boolean; triggers: string[]; last_run_at: Date | null }[]>`
    SELECT s.id, s.name, s.filters, a.id AS alert_id, a.frequency, a.active, a.triggers::text[] AS triggers, a.last_run_at
    FROM saved_searches s JOIN alerts a ON a.saved_search_id = s.id WHERE s.user_id = ${u.id} AND s.deleted_at IS NULL ORDER BY s.created_at DESC`;
  const { plan } = await effectivePlan(u.id);
  const ent = await getEntitlement(plan, "alerts");
  const used = rows.filter((r) => r.active).length;
  const trigLabel: Record<string, string> = { new_listing: t("trigNew"), price_drop: t("trigDrop"), back_on_market: t("trigBack"), sold_or_withdrawn: t("trigSold") };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-medium">{t("pageTitle")}</h1>
        <p className="text-sm text-muted">{ent.limit == null ? t("usageUnlimited", { used }) : t("usage", { used, limit: ent.limit })}</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<Bell className="size-6" aria-hidden />} title={t("pageEmptyTitle")} text={t("pageEmptyText")} action={<Button asChild><Link href="/comprar">{t("pageEmptyCta")}</Link></Button>} />
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((r) => {
            const href = buildSearchHref(parseFilters(r.filters.business, new URLSearchParams(r.filters.qs)), r.filters.geoSlugs ?? {});
            return (
              <li key={r.id} className="rounded-[16px] border border-border bg-surface p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{r.name}</h2>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone={r.active ? "up" : "outline"}>{r.active ? t("active") : t("paused")}</Badge>
                      {r.triggers.map((x) => <Badge key={x} tone="neutral">{trigLabel[x]}</Badge>)}
                    </p>
                    <p className="mt-2 text-xs text-muted">{r.last_run_at ? t("lastSent", { date: f.dateTime(r.last_run_at, "short") }) : t("never")}</p>
                  </div>
                  <Button asChild size="sm" variant="soft"><Link href={href}>{t("open")}</Link></Button>
                </div>
                <div className="mt-4 border-t border-border pt-4">
                  <AlertControls alertId={r.alert_id} searchId={r.id} frequency={r.frequency} active={r.active} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
