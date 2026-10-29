"use client";

import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { submitInquiry, type InquiryState } from "@/server/inquiry";

interface Props {
  listingId: string;
  reference: string;
  whatsappPhone: string | null;
  demo: boolean;
}

const initial: InquiryState = { status: "idle" };

export function ContactForm({ listingId, reference, whatsappPhone, demo }: Props) {
  const t = useTranslations("property");
  const c = useTranslations("common");
  const [state, action, pending] = useActionState(submitInquiry, initial);
  const err = state.fieldErrors ?? {};

  if (state.status === "ok") {
    return (
      <div role="status" className="flex items-start gap-3 rounded-[12px] bg-up/10 p-4 text-sm text-up">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">{t("contactSent")}</p>
          {demo && <p className="mt-1 text-xs opacity-80">{t("contactDemoNote")}</p>}
        </div>
      </div>
    );
  }

  const wa = whatsappPhone ? `https://wa.me/${whatsappPhone.replace(/\D/g, "")}?text=${encodeURIComponent(t("contactDefault", { ref: reference }))}` : null;

  return (
    <form action={action} className="space-y-3" noValidate>
      <input type="hidden" name="listingId" value={listingId} />
      {/* Honeypot: hidden from people and assistive tech, bots fill it. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <Label htmlFor="c-name">{t("contactName")}</Label>
        <Input id="c-name" name="name" required autoComplete="name" aria-invalid={!!err.name} aria-describedby={err.name ? "c-name-err" : undefined} />
        {err.name && <p id="c-name-err" className="mt-1 text-xs text-down">{t("contactError")}</p>}
      </div>
      <div>
        <Label htmlFor="c-email">{t("contactEmail")}</Label>
        <Input id="c-email" name="email" type="email" required autoComplete="email" aria-invalid={!!err.email} />
        {err.email && <p className="mt-1 text-xs text-down">{t("contactError")}</p>}
      </div>
      <div>
        <Label htmlFor="c-phone">
          {t("contactPhone")} <span className="font-normal text-muted">({c("optional")})</span>
        </Label>
        <Input id="c-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" aria-invalid={!!err.phone} />
      </div>
      <div>
        <Label htmlFor="c-msg">{t("contactMessage")}</Label>
        <Textarea id="c-msg" name="message" required defaultValue={t("contactDefault", { ref: reference })} aria-invalid={!!err.message} />
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-xs text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]" aria-invalid={!!err.consent} />
        <span>
          {t.rich("contactConsent", {
            link: (chunks) => (
              <Link href="/privacidade" className="text-brand underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {(state.status === "error") && <p role="alert" className="text-sm text-down">{t("contactError")}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {t("contactSend")}
      </Button>
      {wa ? (
        <Button asChild variant="secondary" className="w-full">
          <a href={wa} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden />
            {t("whatsapp")}
          </a>
        </Button>
      ) : (
        <Button variant="secondary" className="w-full" disabled title={t("whatsappUnavailable")}>
          <MessageCircle aria-hidden />
          {t("whatsapp")}
        </Button>
      )}
      {demo && <p className="text-xs text-muted">{t("contactDemoNote")}</p>}
    </form>
  );
}
