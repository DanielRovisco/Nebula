import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProsePage } from "@/components/prose-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.cookiesPage" });
  return { title: t("title") };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.cookiesPage");
  const draft = await getTranslations("pages");
  return (
    <ProsePage title={t("title")}>
      <p className="rounded-[14px] bg-warn-soft p-4 text-base text-warn">{draft("legalDraft")}</p>
      <p>{t("p1")}</p>
      <p>{t("p2")}</p>
    </ProsePage>
  );
}
