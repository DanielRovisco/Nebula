"use client";

import { Check, Copy, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { PROSPECT_STATUS, addProspect, setProspectStatus } from "@/server/prospects";

export function AddProspectButton({ propertyId, added }: { propertyId: string; added: boolean }) {
  const t = useTranslations("crm.prospects");
  const router = useRouter();
  const [pending, start] = useTransition();
  if (added) return <span className="inline-flex items-center gap-1.5 text-sm text-up"><Check className="size-4" aria-hidden />{t("added")}</span>;
  return <Button size="sm" disabled={pending} onClick={() => start(async () => { await addProspect(propertyId); router.refresh(); })}><Plus aria-hidden />{t("add")}</Button>;
}

export function ProspectRow({ id, status, note, canWrite }: { id: string; status: string; note: string | null; canWrite: boolean }) {
  const t = useTranslations("crm.prospects");
  const router = useRouter();
  const [text, setText] = useState(note ?? "");
  const [pending, start] = useTransition();
  if (!canWrite) return <span>{t(`status.${status as "new"}`)}</span>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`ps-${id}`} className="sr-only">{t("status.new")}</label>
      <Select id={`ps-${id}`} className="h-9 w-auto text-sm" defaultValue={status} disabled={pending} onChange={(e) => start(async () => { await setProspectStatus(id, e.target.value); router.refresh(); })}>
        {PROSPECT_STATUS.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
      </Select>
      <form className="flex min-w-40 flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { await setProspectStatus(id, status, text); router.refresh(); }); }}>
        <Input aria-label={t("note")} className="h-9 text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("note")} maxLength={500} />
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>{t("saveNote")}</Button>
      </form>
    </div>
  );
}

export function CopyTemplate({ text }: { text: string }) {
  const t = useTranslations("crm.prospects");
  return (
    <div>
      <pre className="whitespace-pre-wrap rounded-[12px] border border-border bg-surface-2 p-4 font-sans text-sm leading-relaxed" data-testid="approach-template">{text}</pre>
      <Button size="sm" variant="secondary" className="mt-2" onClick={async () => { try { await navigator.clipboard.writeText(text); toast.success(t("copied")); } catch { toast(text.slice(0, 80) + "…"); } }}>
        <Copy aria-hidden />{t("copy")}
      </Button>
    </div>
  );
}
