import { BadgeCheck, Download, LogOut, Trash2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteAccount, signOutAction } from "@/server/account";
import { openBillingPortal } from "@/server/checkout";
import { effectivePlan, getEntitlement, getUsage, type Feature } from "@/server/entitlements";
import { getOrgContext } from "@/server/org";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function AccountPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ plano?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect("/entrar");
  const [u] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!u?.onboardedAt) redirect("/conta/boas-vindas");
  const t = await getTranslations("account");
  const a = await getTranslations("auth");
  const pl = await getTranslations("plans");
  const plan = await effectivePlan(u.id);
  const org = await getOrgContext();
  const scope = plan.source === "org" && plan.orgId ? ("org" as const) : ("user" as const);
  const meters: [Feature, string][] = [["valuations", t("meterValuations")], ["pdf_reports", t("meterPdf")], ["exports", t("meterExports")]];
  const usage = await Promise.all(
    meters.map(async ([f, label]) => ({ label, used: await getUsage(scope, scope === "org" ? plan.orgId! : u.id, f), ent: await getEntitlement(plan.plan, f) })),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-medium">{a("welcome", { name: u.name ?? "" })}</h1>
      <p className="mt-1 text-muted">{u.email}</p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label={t("title")}>
        <div className="rounded-[16px] border border-border bg-surface p-5">
          <h2 className="text-sm text-muted">{t("profile")}</h2>
          <p className="mt-1 text-lg font-semibold">{a(`profile.${u.profileType}`)}</p>
          {(u.profileType === "agent" || u.profileType === "agency") && (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <BadgeCheck className="size-4 text-brand" aria-hidden />
              {t(`amiStatus.${u.amiStatus}`)}
              {u.amiNumber && <Badge tone="outline">AMI {u.amiNumber}</Badge>}
            </p>
          )}
        </div>
        <div className="rounded-[16px] border border-border bg-surface p-5">
          <h2 className="text-sm text-muted">{t("plan")}</h2>
          <p className="mt-1 text-lg font-semibold">{plan.plan === "free" ? t("planFree") : pl(`${plan.plan}.name`)}</p>
          {plan.trialEndsAt && <p className="mt-1 text-sm text-muted">{t("trialUntil", { date: plan.trialEndsAt.toLocaleDateString("pt-PT") })}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {plan.source === "free" ? (
              <Button asChild size="sm"><Link href="/planos">{t("upgrade")}</Link></Button>
            ) : (
              <form action={openBillingPortal}><Button type="submit" size="sm" variant="secondary">{pl("manage")}</Button></form>
            )}
          </div>
        </div>
      </section>

      {sp.plano === "ativo" && <p role="status" className="mt-6 rounded-[12px] bg-up/10 p-3 text-sm text-up">{t("planActive")}</p>}

      <section className="mt-6 rounded-[16px] border border-border bg-surface p-5" aria-label={t("usage")}>
        <h2 className="font-semibold">{t("usage")}</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {usage.map((m) => (
            <li key={m.label}>
              <div className="flex justify-between"><span>{m.label}</span><span className="tnum text-muted">{m.ent.enabled ? (m.ent.limit == null ? `${m.used}` : `${m.used} / ${m.ent.limit}`) : t("notIncluded")}</span></div>
              {m.ent.enabled && m.ent.limit != null && <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (m.used / Math.max(1, m.ent.limit)) * 100)}%` }} /></div>}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-[16px] border border-border bg-surface p-5">
        <h2 className="font-semibold">{t("workspace")}</h2>
        <p className="mt-1 text-sm text-muted">{org ? t("workspaceIn", { name: org.orgName }) : t("workspaceNone")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="secondary"><Link href="/equipa">{t("team")}</Link></Button>
          {org && <Button asChild size="sm" variant="secondary"><Link href="/crm">CRM</Link></Button>}
        </div>
      </section>

      <section className="mt-10 flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <a href="/api/account/export" download>
            <Download aria-hidden />
            {t("export")}
          </a>
        </Button>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            <LogOut aria-hidden />
            {t("signOut")}
          </Button>
        </form>
      </section>

      <details className="mt-10 rounded-[16px] border border-border p-5">
        <summary className="cursor-pointer font-medium text-down">{t("delete")}</summary>
        <form action={deleteAccount} className="mt-4 space-y-3">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="confirm" required className="mt-0.5 size-5 accent-[var(--down)]" />
            <span>{t("deleteConfirm")}</span>
          </label>
          <Button type="submit" variant="danger">
            <Trash2 aria-hidden />
            {t("delete")}
          </Button>
        </form>
      </details>
    </div>
  );
}
