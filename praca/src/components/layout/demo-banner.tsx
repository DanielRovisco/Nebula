import { Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isProduction } from "@/lib/env";
import { hasSeedData } from "@/server/market";

/** Visible outside production whenever the database holds seed data (rule: demo data is never passed off as real). */
export async function DemoBanner() {
  if (isProduction) return null;
  let seed = false;
  try {
    seed = await hasSeedData();
  } catch {
    return null;
  }
  if (!seed) return null;
  const t = await getTranslations("common");
  return (
    <div role="note" className="border-b border-warn/30 bg-warn-soft text-warn">
      <div className="mx-auto flex max-w-[1400px] items-start gap-2 px-4 py-2 text-xs font-medium sm:px-6 sm:text-[13px]">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          {t("demoBanner")}{" "}
          <Link href="/sobre" className="underline underline-offset-2">
            {t("demoBannerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
