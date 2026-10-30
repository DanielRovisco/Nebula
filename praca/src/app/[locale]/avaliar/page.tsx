import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { ValuationForm, type Prefill } from "@/components/valuation/valuation-form";
import { Link } from "@/i18n/navigation";
import { getComparablesPrefill } from "@/server/valuation-prefill";
import { effectivePlan, getEntitlement } from "@/server/entitlements";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Avaliar imóvel", robots: { index: false } };

export default async function ValuationPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ref?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("valuation");
  const u = await currentUser();
  const plan = u ? (await effectivePlan(u.id)).plan : "free";
  const ent = await getEntitlement(plan, "valuations");

  if (!u || !ent.enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <div role="status" className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand"><Lock className="size-6" aria-hidden /></div>
          <h1 className="font-display text-3xl font-medium">{t("gateTitle")}</h1>
          <p className="max-w-md text-muted">{u ? t("gateText") : t("needLogin")}</p>
          <Button asChild><Link href={u ? "/planos" : "/entrar"}>{u ? t("gateCta") : t("signIn")}</Link></Button>
        </div>
      </div>
    );
  }

  const { ref } = await searchParams;
  const prefill: Prefill = ref ? ((await getComparablesPrefill(ref)) ?? {}) : {};
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <h1 className="font-display text-4xl font-medium">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t("sub")}</p>
      <ValuationForm prefill={prefill} />
    </div>
  );
}
