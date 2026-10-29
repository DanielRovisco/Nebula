"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { completeOnboarding, type OnboardingState } from "@/server/account";
import { cn } from "@/lib/utils";

const PROFILES = ["private", "agent", "agency", "investor", "developer"] as const;

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, {});
  const [profile, setProfile] = useState<(typeof PROFILES)[number]>("private");
  const professional = profile === "agent" || profile === "agency";
  return (
    <form action={action} className="mt-8 space-y-6">
      <div>
        <Label htmlFor="name">{t("nameLabel")}</Label>
        <Input id="name" name="name" required minLength={2} maxLength={120} defaultValue={defaultName} autoComplete="name" />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("profileLabel")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROFILES.map((p) => (
            <label
              key={p}
              className={cn(
                "flex min-h-16 cursor-pointer items-start gap-3 rounded-[14px] border p-3.5 transition-colors",
                profile === p ? "border-brand bg-brand-soft" : "border-border-strong bg-surface hover:bg-surface-2",
              )}
            >
              <input type="radio" name="profileType" value={p} checked={profile === p} onChange={() => setProfile(p)} className="mt-1 size-4 accent-[var(--brand)]" />
              <span>
                <span className="block text-sm font-semibold">{t(`profile.${p}`)}</span>
                <span className="block text-xs text-muted">{t(`profileHint.${p}`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {professional && (
        <div>
          <Label htmlFor="ami">{t("amiLabel")}</Label>
          <Input id="ami" name="amiNumber" inputMode="numeric" pattern="\d{3,6}" maxLength={6} aria-describedby="ami-hint" />
          <p id="ami-hint" className="mt-1.5 text-xs text-muted">
            {t("amiHint")}
          </p>
        </div>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-down">
          {t("errorGeneric")}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {t("continue")}
      </Button>
    </form>
  );
}
