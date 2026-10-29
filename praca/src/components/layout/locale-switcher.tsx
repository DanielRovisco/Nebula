"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const target = locale === "pt" ? "en" : "pt";
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={`${t("language")}: ${target === "en" ? "English" : "Português"}`}
      onClick={() => {
        const qs = search.toString();
        // pathname from next-intl is locale-free; routing re-adds the right prefix.
        router.replace(qs ? `${pathname}?${qs}` : pathname, { locale: target });
      }}
    >
      <Languages aria-hidden />
      <span className="uppercase">{target}</span>
    </Button>
  );
}
