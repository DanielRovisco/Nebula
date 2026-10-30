"use client";

import { Copy, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { WEBHOOK_EVENTS } from "@/server/webhooks";
import { createWebhook, deleteWebhook, testWebhook, toggleWebhook, type WebhookResult } from "@/server/webhook-actions";

export function WebhookForm() {
  const t = useTranslations("crm.webhooks");
  const router = useRouter();
  const [state, action, pending] = useActionState<WebhookResult, FormData>(async (p, f) => {
    const r = await createWebhook(p, f);
    if (r.ok) router.refresh();
    return r;
  }, { ok: false });
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <div><Label htmlFor="w-url">{t("url")}</Label><Input id="w-url" name="url" type="url" required placeholder="https://" /></div>
        <fieldset><legend className="mb-1.5 text-sm font-medium">{t("events")}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">{WEBHOOK_EVENTS.map((e) => <label key={e} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" name="events" value={e} defaultChecked className="size-5 accent-[var(--brand)]" />{t(`events_.${e}`)}</label>)}</div></fieldset>
        <Button type="submit" disabled={pending}>{pending && <Loader2 className="animate-spin" aria-hidden />}{t("create")}</Button>
        {state.error && <p role="alert" className="text-sm text-down">{state.error === "url" ? t("errorUrl") : t("errorInvalid")}</p>}
      </form>
      {state.ok && state.secret && (
        <div role="status" className="rounded-[14px] border border-warn/40 bg-warn-soft p-4 text-sm text-warn">
          <p className="font-semibold">{t("secretTitle")}</p>
          <p className="mt-1">{t("secretText")}</p>
          <code className="mt-2 block break-all rounded bg-surface px-2 py-1.5 font-mono text-xs text-fg" data-testid="webhook-secret">{state.secret}</code>
          <Button size="sm" variant="secondary" className="mt-2" onClick={async () => { try { await navigator.clipboard.writeText(state.secret!); toast.success("OK"); } catch { /* select manually */ } }}><Copy aria-hidden />Copy</Button>
        </div>
      )}
    </div>
  );
}

export function WebhookActions({ id, active }: { id: string; active: boolean }) {
  const t = useTranslations("crm.webhooks");
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => testWebhook(id))}>{t("test")}</Button>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => toggleWebhook(id))}>{active ? t("pause") : t("resume")}</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteWebhook(id))}>{t("delete")}</Button>
    </div>
  );
}
