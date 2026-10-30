"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cancelShare, closeShare, createShare, respondShare, type ShareResult } from "@/server/shares";

export function ShareForm() {
  const t = useTranslations("crm.shares");
  const router = useRouter();
  const [state, action, pending] = useActionState<ShareResult, FormData>(async (p, f) => {
    const r = await createShare(p, f);
    if (r.ok) router.refresh();
    return r;
  }, { ok: false });
  const err = state.error === "not_found" ? t("errorNotFound") : state.error === "self" ? t("errorSelf") : state.error ? t("errorInvalid") : null;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <div><Label htmlFor="s-ref">{t("propertyRef")}</Label><Input id="s-ref" name="propertyRef" placeholder="PR-000123" pattern="[Pp][Rr]-\d{6}" required /></div>
      <div className="sm:col-span-2"><Label htmlFor="s-mail">{t("partnerEmail")}</Label><Input id="s-mail" name="partnerEmail" type="email" required /></div>
      <div><Label htmlFor="s-split">{t("split")}</Label><Input id="s-split" name="splitPct" type="number" min={1} max={99} step="0.5" defaultValue={50} required /></div>
      <div className="flex items-center gap-3 sm:col-span-4"><Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" aria-hidden />}{t("send")}</Button>{state.ok && <span role="status" className="text-sm text-up">{t("sent")}</span>}{err && <span role="alert" className="text-sm text-down">{err}</span>}</div>
    </form>
  );
}

export function ShareActions({ id, mode, status }: { id: string; mode: "owner" | "partner"; status: string }) {
  const t = useTranslations("crm.shares");
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });
  if (mode === "partner" && status === "invited")
    return <div className="flex gap-2"><Button size="sm" disabled={pending} onClick={() => run(() => respondShare(id, true))}>{t("accept")}</Button><Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => respondShare(id, false))}>{t("decline")}</Button></div>;
  if (mode === "owner" && status === "invited") return <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => cancelShare(id))}>{t("cancel")}</Button>;
  if (mode === "owner" && status === "accepted") return <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => closeShare(id))}>{t("close")}</Button>;
  return null;
}
