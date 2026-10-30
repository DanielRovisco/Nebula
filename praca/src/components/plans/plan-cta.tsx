"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { startCheckout, type CheckoutState } from "@/server/checkout";

export function PlanCta({ plan, interval, label, perSeat, signedIn }: { plan: "pro" | "agency"; interval: "month" | "year"; label: string; perSeat: boolean; signedIn: boolean }) {
  const t = useTranslations("plans");
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});
  if (!signedIn)
    return (
      <Button asChild size="lg" className="w-full">
        <Link href="/entrar">{t("signIn")}</Link>
      </Button>
    );
  const msg = {
    org: (
      <>
        {t("errorOrg")}{" "}
        <Link href="/equipa" className="font-medium underline">
          {t("errorOrgCta")}
        </Link>
      </>
    ),
    not_configured: t("errorNotConfigured"),
    failed: t("errorFailed"),
    already: t("errorAlready"),
    invalid: t("errorInvalid"),
    auth: t("signIn"),
  } as const;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="interval" value={interval} />
      {perSeat && (
        <div>
          <Label htmlFor={`seats-${plan}`}>{t("seats")}</Label>
          <Input id={`seats-${plan}`} name="seats" type="number" min={1} max={50} defaultValue={1} inputMode="numeric" />
        </div>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {label}
      </Button>
      {state.error && (
        <p role="alert" className="text-sm text-down">
          {msg[state.error]}
        </p>
      )}
    </form>
  );
}
