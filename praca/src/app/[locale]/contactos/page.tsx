import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProsePage } from "@/components/prose-page";
import { entity } from "@/lib/env";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages.contacts" });
  return { title: t("title") };
}

export default async function ContactsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages.contacts");
  const f = await getTranslations("footer");
  return (
    <ProsePage title={t("title")}>
      <p>
        {t.rich("p1", {
          email: entity.email,
          mail: (c) => (
            <a className="text-brand underline underline-offset-4" href={`mailto:${entity.email}`}>
              {c}
            </a>
          ),
        })}
      </p>
      <section>
        <h2>{f("entity")}</h2>
        <p>
          {entity.name}
          {entity.nif && <> · NIF {entity.nif}</>}
          {entity.ami && <> · {f("ami")} {entity.ami}</>}
          {entity.address && <> · {entity.address}</>}
        </p>
      </section>
      <p>
        <a className="text-brand underline underline-offset-4" href="https://www.livroreclamacoes.pt" target="_blank" rel="noopener noreferrer">
          {t("complaints")}
        </a>
      </p>
    </ProsePage>
  );
}
