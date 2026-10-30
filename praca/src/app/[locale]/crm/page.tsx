import { Download } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Kanban } from "@/components/crm/kanban";
import { NewDealForm } from "@/components/crm/crm-forms";
import { UpgradeGate } from "@/components/crm/upgrade-gate";
import { Button } from "@/components/ui/button";
import { listContacts, listDeals, STAGES } from "@/server/crm";
import { crmContext } from "@/server/crm-gate";

export const dynamic = "force-dynamic";

export default async function CrmPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ctx, allowed, canWrite } = await crmContext();
  if (!allowed) return <UpgradeGate />;
  const t = await getTranslations("crm");
  const [deals, contacts] = await Promise.all([listDeals(ctx.orgId), listContacts(ctx.orgId, { limit: 500 })]);
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-medium">{ctx.orgName}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm"><a href="/api/crm/export?type=deals"><Download aria-hidden />{t("exportDeals")}</a></Button>
        </div>
      </div>
      {canWrite ? <NewDealForm contacts={contacts.map((c) => ({ id: c.id, name: c.name }))} /> : <p className="text-sm text-muted">{t("readOnly")}</p>}
      <Kanban deals={deals} stages={STAGES} canWrite={canWrite} />
    </div>
  );
}
