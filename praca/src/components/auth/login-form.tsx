"use client";

import { Loader2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { requestMagicLink, signInWithGoogle, type SignInState } from "@/server/account";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<SignInState, FormData>(requestMagicLink, {});
  return (
    <div className="mt-8 space-y-5">
      <form action={action} className="space-y-3" noValidate>
        <div>
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" inputMode="email" placeholder={t("emailPlaceholder")} aria-invalid={!!state.error} />
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-down">
            {t("errorGeneric")}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Mail aria-hidden />}
          {pending ? t("sending") : t("sendLink")}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        {t("orContinue")}
        <span className="h-px flex-1 bg-border" />
      </div>

      {googleEnabled ? (
        <form action={signInWithGoogle}>
          <Button type="submit" variant="secondary" size="lg" className="w-full">
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
              <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
              <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l4-3.1Z" />
              <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
            </svg>
            {t("google")}
          </Button>
        </form>
      ) : (
        <p className="text-center text-xs text-muted">{t("googleUnavailable")}</p>
      )}

      <p className="text-xs text-muted">
        {t.rich("terms", {
          terms: (c) => <Link href="/termos" className="underline underline-offset-2">{c}</Link>,
          privacy: (c) => <Link href="/privacidade" className="underline underline-offset-2">{c}</Link>,
        })}
      </p>
    </div>
  );
}
