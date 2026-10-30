import { Download, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DeleteContactButton, ImportForm, NewContactForm } from "@/components/crm/crm-forms";
import { UpgradeGate } from "@/components/crm/upgrade-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { CONTACT_KINDS, listContacts } from "@/server/crm";
import { crmContext } from "@/server/crm-gate";

export const dynamic = "force-dynamic";

export default async function ContactsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; tipo?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ctx, allowed, canWrite } = await crmContext();
  if (!allowed) return <UpgradeGate />;
  const t = await getTranslations("crm");
  const sp = await searchParams;
  const rows = await listContacts(ctx.orgId, { q: sp.q, kind: (CONTACT_KINDS as readonly string[]).includes(sp.tipo ?? "") ? sp.tipo : undefined, limit: 200 });
  return (
    <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-medium">{t("contactsTitle")}</h1>
        <Button asChild variant="secondary" size="sm"><a href="/api/crm/export?type=contacts"><Download aria-hidden />{t("exportCsv")}</a></Button>
      </div>
      <form className="flex flex-wrap gap-3" role="search">
        <Input name="q" defaultValue={sp.q ?? ""} placeholder={t("search")} aria-label={t("search")} className="max-w-sm" />
        <Select name="tipo" defaultValue={sp.tipo ?? ""} aria-label={t("kind")} className="w-auto"><option value="">{t("allKinds")}</option>{CONTACT_KINDS.map((k) => <option key={k} value={k}>{t(`kinds.${k}`)}</option>)}</Select>
        <Button type="submit" variant="secondary">OK</Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState icon={<Users className="size-6" aria-hidden />} title={t("noContacts")} text={t("noContactsText")} />
      ) : (
        <div className="overflow-x-auto rounded-[16px] border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted"><th scope="col" className="p-3 font-medium">{t("name")}</th><th scope="col" className="p-3 font-medium">{t("email")}</th><th scope="col" className="p-3 font-medium">{t("phone")}</th><th scope="col" className="p-3 font-medium">{t("kind")}</th><th scope="col" className="p-3 font-medium">{t("source")}</th><th scope="col" className="p-3"><span className="sr-only">{t("delete")}</span></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <th scope="row" className="p-3 text-left font-medium">{c.name}{c.tags.length > 0 && <span className="ml-2 inline-flex gap-1">{c.tags.map((x) => <Badge key={x} tone="outline">{x}</Badge>)}</span>}</th>
                  <td className="p-3 text-muted">{c.email ?? "—"}</td><td className="p-3 text-muted">{c.phone ?? "—"}</td>
                  <td className="p-3"><Badge tone={c.kind === "fsbo" ? "brand" : "neutral"}>{t(`kinds.${c.kind as "lead"}`)}</Badge></td>
                  <td className="p-3 text-muted">{c.source ?? "—"}</td>
                  <td className="p-3 text-right">{canWrite && <DeleteContactButton id={c.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canWrite && (
        <>
          <section aria-labelledby="addc"><h2 id="addc" className="mb-3 text-lg font-semibold">{t("addContact")}</h2><NewContactForm /></section>
          <section aria-label={t("importCsv")}><ImportForm /></section>
        </>
      )}
    </div>
  );
}
