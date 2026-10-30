"use client";

import { Copy, KeyRound, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createApiKey, revokeApiKey, type KeyResult } from "@/server/api/keys";

export function CreateKeyForm() {
  const t = useTranslations("apiKeys");
  const router = useRouter();
  const [state, action, pending] = useActionState<KeyResult, FormData>(async (p, f) => { const r = await createApiKey(p, f); if (r.ok) router.refresh(); return r; }, { ok: false });
  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><Label htmlFor="k-name">{t("name")}</Label><Input id="k-name" name="name" required minLength={2} maxLength={60} placeholder="Integração CRM" /></div>
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />}{t("create")}</Button>
      </form>
      {state.error && <p role="alert" className="text-sm text-down">{state.error === "limit" ? t("errorLimit") : state.error === "plan" ? t("errorPlan") : t("errorInvalid")}</p>}
      {state.ok && state.secret && (
        <div role="status" className="rounded-[14px] border border-warn/40 bg-warn-soft p-4 text-sm text-warn">
          <p className="font-semibold">{t("secretTitle")}</p>
          <p className="mt-1">{t("secretText")}</p>
          <code className="mt-2 block break-all rounded bg-surface px-2 py-1.5 font-mono text-xs text-fg" data-testid="api-secret">{state.secret}</code>
          <Button size="sm" variant="secondary" className="mt-2" onClick={async () => { try { await navigator.clipboard.writeText(state.secret!); toast.success(t("copied")); } catch { /* select manually */ } }}><Copy aria-hidden />{t("copy")}</Button>
        </div>
      )}
    </div>
  );
}

export function RevokeKeyButton({ id }: { id: string }) {
  const t = useTranslations("apiKeys");
  const router = useRouter();
  const [pending, start] = useTransition();
  return <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await revokeApiKey(id); router.refresh(); })}>{t("revoke")}</Button>;
}
