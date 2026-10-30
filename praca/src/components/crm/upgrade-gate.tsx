import { Lock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export async function UpgradeGate() {
  const t = await getTranslations("crm");
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <div role="status" className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand"><Lock className="size-6" aria-hidden /></div>
        <h1 className="font-display text-3xl font-medium">{t("gateTitle")}</h1>
        <p className="max-w-md text-muted">{t("gateText")}</p>
        <Button asChild><Link href="/planos">{t("gateCta")}</Link></Button>
      </div>
    </div>
  );
}
