import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProsePage } from "@/components/prose-page";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.methodology" });
  return { title: t("title") };
}

export default async function MethodologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.methodology");
  const sections = ["median", "sample", "asking", "dedupe", "estimate", "yield", "fiscal"] as const;
  return (
    <ProsePage title={t("title")} intro={t("intro")}>
      {sections.map((s) => (
        <section key={s} id={s}>
          <h2>{t(`${s}Title`)}</h2>
          <p>{t(`${s}Text`)}</p>
        </section>
      ))}
    </ProsePage>
  );
}
