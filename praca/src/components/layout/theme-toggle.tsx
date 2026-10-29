"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const order = ["system", "light", "dark"] as const;

export function ThemeToggle() {
  const t = useTranslations("nav");
  const { theme = "system", setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = (mounted ? theme : "system") as (typeof order)[number];
  const next = order[(order.indexOf(current) + 1) % order.length]!;
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;
  const label = { system: t("themeSystem"), light: t("themeLight"), dark: t("themeDark") }[current];
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label={`${t("theme")}: ${label}`} title={`${t("theme")}: ${label}`}>
      <Icon aria-hidden />
    </Button>
  );
}
