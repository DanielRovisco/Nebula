import { KeyRound, Lock } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { CreateKeyForm, RevokeKeyButton } from "@/components/account/api-key-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { effectivePlan, getEntitlement, getUsage } from "@/server/entitlements";
import { requireUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await requireUser();
  const t = await getTranslations("apiKeys");
  const f = await getFormatter();
  const plan = await effectivePlan(u.id);
  const ent = await getEntitlement(plan.plan, "api_calls");
  if (!ent.enabled || ent.limit === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <EmptyState icon={<Lock className="size-6" aria-hidden />} title={t("gateTitle")} text={t("gateText")} action={<Button asChild><Link href="/planos">{t("gateCta")}</Link></Button>} />
      </div>
    );
  }
  const keys = await sql<{ id: string; name: string; prefix: string; created_at: Date; last_used_at: Date | null; revoked_at: Date | null }[]>`
    SELECT id, name, prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE user_id = ${u.id} ORDER BY created_at DESC LIMIT 50`;
  const scope = plan.source === "org" && plan.orgId ? ("org" as const) : ("user" as const);
  const used = await getUsage(scope, scope === "org" ? plan.orgId! : u.id, "api_calls");
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-4xl font-medium">{t("title")}</h1><p className="mt-1 text-muted">{t("sub")}</p></div>
        <Button asChild variant="secondary"><Link href="/developers">{t("docs")}</Link></Button>
      </div>
      <p className="tnum text-sm text-muted">{ent.limit == null ? t("usageUnlimited", { used }) : t("usage", { used, limit: ent.limit })}</p>
      <CreateKeyForm />
      {keys.length === 0 ? (
        <EmptyState icon={<KeyRound className="size-6" aria-hidden />} title={t("empty")} text={t("emptyText")} />
      ) : (
        <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
          {keys.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0"><p className="font-medium">{k.name} {k.revoked_at && <Badge tone="down">{t("revoked")}</Badge>}</p><p className="text-xs text-muted"><code>{k.prefix}…</code> · {t("created")} {f.dateTime(k.created_at, "short")} · {t("lastUsed")}: {k.last_used_at ? f.dateTime(k.last_used_at, "short") : t("never")}</p></div>
              {!k.revoked_at && <RevokeKeyButton id={k.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
