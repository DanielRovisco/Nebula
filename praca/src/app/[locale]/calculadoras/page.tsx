import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PtCalculators, type FiscalProps } from "@/components/calculators/pt-calculators";
import { getFiscalTable, getRate } from "@/server/fiscal";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calculators" });
  return { title: t("title"), description: t("sub") };
}

export default async function CalculatorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("calculators");
  const [hpp, secondary, other, jovem, stamp, rentIrs, euribor] = await Promise.all([
    getFiscalTable("imt", "hpp_mainland"),
    getFiscalTable("imt", "secondary_mainland"),
    getFiscalTable("imt", "other_urban"),
    getFiscalTable("imt_jovem", "mainland"),
    getFiscalTable("stamp_duty_purchase", "all"),
    getFiscalTable("rent_irs", "mainland"),
    getRate("euribor_12m"),
  ]);
  const meta = (x: Awaited<ReturnType<typeof getFiscalTable>>) => (x ? { brackets: x.brackets, validFrom: x.validFrom, verified: x.verified } : null);
  const fiscal: FiscalProps = {
    euribor: euribor ? { value: euribor.value, validFrom: euribor.validFrom } : null,
    hpp: meta(hpp),
    secondary: meta(secondary),
    other: meta(other),
    jovem: jovem && jovem.brackets.length >= 2 ? { limits: [jovem.brackets[0]!.upTo ?? 0, jovem.brackets[1]!.upTo ?? 0], validFrom: jovem.validFrom, verified: jovem.verified } : null,
    stamp: meta(stamp),
    rentIrs: meta(rentIrs),
  };
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
      <h1 className="font-display text-4xl font-medium sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t("sub")}</p>
      <div className="mt-8">
        <PtCalculators fiscal={fiscal} />
      </div>
      <p className="mt-8 max-w-3xl text-xs text-muted">{t("disclaimer")}</p>
    </div>
  );
}
