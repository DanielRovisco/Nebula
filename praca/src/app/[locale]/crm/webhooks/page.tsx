import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { WebhookActions, WebhookForm } from "@/components/crm/webhook-controls";
import { UpgradeGate } from "@/components/crm/upgrade-gate";
import { Badge } from "@/components/ui/badge";
import { sql } from "@/db";
import { crmContext } from "@/server/crm-gate";
import { roleAtLeast } from "@/server/org";

export const dynamic = "force-dynamic";

export default async function WebhooksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ctx, allowed } = await crmContext();
  if (!allowed) return <UpgradeGate />;
  const t = await getTranslations("crm.webhooks");
  const f = await getFormatter();
  const admin = roleAtLeast(ctx.role, "admin");
  const hooks = await sql<{ id: string; url: string; events: string[]; active: boolean }[]>`SELECT id, url, events, active FROM webhooks WHERE organization_id = ${ctx.orgId} ORDER BY created_at DESC`;
  const logs = await sql<{ id: string; event: string; ok: boolean; status_code: number | null; duration_ms: number | null; error: string | null; created_at: Date; url: string }[]>`
    SELECT d.id, d.event, d.ok, d.status_code, d.duration_ms, d.error, d.created_at, w.url FROM webhook_deliveries d JOIN webhooks w ON w.id = d.webhook_id WHERE w.organization_id = ${ctx.orgId} ORDER BY d.created_at DESC LIMIT 20`;
  return (
    <div className="mx-auto max-w-4xl space-y-10 px-4 py-8 sm:px-6">
      <div><h1 className="font-display text-3xl font-medium">{t("title")}</h1><p className="mt-1 text-muted">{t("sub")}</p></div>
      {admin && <section><WebhookForm /></section>}
      <section aria-label={t("title")}>
        {hooks.length === 0 ? <p className="text-sm text-muted">{t("empty")}</p> : (
          <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
            {hooks.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0"><p className="truncate font-mono text-xs">{h.url}</p><p className="mt-1 flex flex-wrap gap-1.5"><Badge tone={h.active ? "up" : "outline"}>{h.active ? t("active") : t("paused")}</Badge>{h.events.map((e) => <Badge key={e} tone="neutral">{e}</Badge>)}</p></div>
                {admin && <WebhookActions id={h.id} active={h.active} />}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="dl"><h2 id="dl" className="mb-3 text-lg font-semibold">{t("deliveries")}</h2>
        {logs.length === 0 ? <p className="text-sm text-muted">{t("noDeliveries")}</p> : (
          <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface text-sm">
            {logs.map((l) => <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><span><Badge tone={l.ok ? "up" : "down"}>{l.ok ? t("ok") : t("failed")}</Badge> <code className="ml-1 text-xs">{l.event}</code> <span className="text-xs text-muted">{l.status_code ?? l.error ?? ""}{l.duration_ms != null ? ` · ${l.duration_ms} ms` : ""}</span></span><time className="tnum text-xs text-muted" dateTime={l.created_at.toISOString()}>{f.dateTime(l.created_at, { dateStyle: "short", timeStyle: "short" })}</time></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
