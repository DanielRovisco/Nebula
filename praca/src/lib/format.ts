const LOCALE = "pt-PT";

const eur0 = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const num0 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const pct1 = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const pct1Plain = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 1 });

/** 1 234 € — thin separators follow pt-PT (non-breaking space). */
export const formatEur = (v: number) => eur0.format(v);
export const formatEur2 = (v: number) => eur2.format(v);
export const formatNumber = (v: number) => num0.format(v);
export const formatDecimal = (v: number) => num1.format(v);
export const formatArea = (v: number) => `${num0.format(v)} m²`;
export const formatPricePerM2 = (v: number) => `${eur0.format(v)}/m²`;
/** Fractional change: 0.052 → "+5,2 %" */
export const formatChange = (v: number) => pct1.format(v);
export const formatPercent = (v: number) => pct1Plain.format(v);

/** Compact price for map pins: 285 000 → "285 mil", 1 250 000 → "1,25 M". Rents stay exact. */
export function formatPinPrice(price: number, business: "sale" | "rent"): string {
  if (business === "rent") return `${num0.format(price)} €`;
  if (price >= 1_000_000) return `${new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 }).format(price / 1_000_000)} M`;
  if (price >= 1000) return `${num0.format(Math.round(price / 1000))} mil`;
  return `${num0.format(price)} €`;
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric" });
/** dd/MM/yyyy */
export const formatDate = (d: Date | string | number) => dateFmt.format(new Date(d));

const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
export function formatRelative(d: Date | string | number, now = Date.now()): string {
  const diffSec = Math.round((new Date(d).getTime() - now) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(diffSec / (86400 * 30)), "month");
  return rtf.format(Math.round(diffSec / (86400 * 365)), "year");
}

export const formatMonth = (d: Date | string) =>
  new Intl.DateTimeFormat(LOCALE, { month: "short", year: "2-digit" }).format(new Date(d));
