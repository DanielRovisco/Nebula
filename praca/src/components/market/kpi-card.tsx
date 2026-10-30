import { HelpCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  how: string;
  anchor: string;
  meta: string;
  tone?: "up" | "down";
  className?: string;
}

/** Every indicator carries its own "how it is calculated" disclosure with source, date and sample (radical transparency). */
export async function KpiCard({ label, value, sub, how, anchor, meta, tone, className }: Props) {
  const t = await getTranslations("market");
  return (
    <div className={cn("rounded-[16px] border border-border bg-surface p-4", className)}>
      <p className="text-sm text-muted">{label}</p>
      <p className={cn("tnum mt-1 text-2xl font-semibold tracking-tight", tone === "up" && "text-up", tone === "down" && "text-down")}>{value}</p>
      {sub && <p className="tnum mt-0.5 text-xs text-muted">{sub}</p>}
      <details className="group mt-3">
        <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-brand [&::-webkit-details-marker]:hidden">
          <HelpCircle className="size-3.5" aria-hidden />
          {t("how")}
        </summary>
        <div className="mt-2 space-y-2 rounded-[10px] bg-surface-2 p-3 text-xs text-muted">
          <p>{how}</p>
          <p className="tnum">{meta}</p>
          <Link href={`/metodologia#${anchor}`} className="text-brand underline underline-offset-2">
            {t("howLink")}
          </Link>
        </div>
      </details>
    </div>
  );
}
