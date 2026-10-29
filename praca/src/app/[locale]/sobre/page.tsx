import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProsePage } from "@/components/prose-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.about" });
  return { title: t("title") };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.about");
  return (
    <ProsePage title={t("title")} intro={t("intro")}>
      <p>{t("p1")}</p>
      <p>{t("p2")}</p>
      <p className="rounded-[14px] bg-warn-soft p-4 text-base text-warn">{t("demo")}</p>
    </ProsePage>
  );
}
