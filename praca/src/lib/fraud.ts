/**
 * Rule-based, explainable fraud signals. A signal is a reason to look closer, never a verdict: the UI words it neutrally
 * and moderation decides. Severity 1 = information, 2 = warning, 3 = high.
 */
export interface FraudFacts {
  business: "sale" | "rent";
  pricePerM2: number | null;
  /** Municipality median €/m² for the same business, with the sample size behind it. */
  zoneMedianPpm: number | null;
  zoneN: number;
  title: string;
  description: string | null;
  advertiserType: "private" | "professional";
  /** Active listings of the same advertiser name on the same source. */
  advertiserActiveListings: number;
  /** Distinct advertisers publishing the same property, and the spread between their prices. */
  duplicateAdvertisers: number;
  duplicatePriceSpread: number;
}

export interface FraudSignal {
  code: string;
  severity: 1 | 2 | 3;
  detail: Record<string, unknown>;
}

export const MIN_ZONE_N = 10;

const ADVANCE_PAYMENT = [
  /western\s*union/i,
  /moneygram/i,
  /(transfer[eê]ncia|pagamento|sinal|dep[oó]sito|adiantamento)[^.]{0,40}antes\s+(da|de)\s+(visita|ver|conhecer)/i,
  /(pay|deposit|transfer)[^.]{0,40}before\s+(viewing|visit|seeing)/i,
  /reservar?\s+(j[aá]|agora)[^.]{0,30}(transfer|pagamento|sinal)/i,
];
const ABSENT_OWNER = [/estou\s+(no\s+)?estrangeiro/i, /propriet[aá]rio\s+(est[aá]\s+)?no\s+estrangeiro/i, /chaves?\s+(por|enviad\w+\s+por)\s+(correio|ctt|transportadora)/i, /owner\s+(is\s+)?abroad/i, /keys?\s+(sent\s+)?by\s+(post|courier|mail)/i];

export function fraudSignals(f: FraudFacts): FraudSignal[] {
  const out: FraudSignal[] = [];
  const text = `${f.title}\n${f.description ?? ""}`;

  if (f.pricePerM2 && f.zoneMedianPpm && f.zoneN >= MIN_ZONE_N) {
    const ratio = f.pricePerM2 / f.zoneMedianPpm;
    const detail = { pricePerM2: f.pricePerM2, zoneMedianPpm: f.zoneMedianPpm, ratio: Math.round(ratio * 100) / 100, zoneN: f.zoneN };
    if (ratio < 0.5) out.push({ code: "price_far_below_market", severity: 3, detail });
    else if (ratio < 0.7) out.push({ code: "price_below_market", severity: 2, detail });
  }
  if (ADVANCE_PAYMENT.some((re) => re.test(text))) out.push({ code: "advance_payment_request", severity: 3, detail: {} });
  if (ABSENT_OWNER.some((re) => re.test(text))) out.push({ code: "absent_owner", severity: 2, detail: {} });
  if (f.advertiserType === "private" && f.advertiserActiveListings >= 6) out.push({ code: "private_with_many_listings", severity: 2, detail: { listings: f.advertiserActiveListings } });
  if (f.duplicateAdvertisers >= 3 && f.duplicatePriceSpread >= 0.3) out.push({ code: "conflicting_prices", severity: 1, detail: { advertisers: f.duplicateAdvertisers, spread: Math.round(f.duplicatePriceSpread * 100) / 100 } });
  return out;
}

/** 0–100: each signal weighs 8 / 20 / 40 by severity. */
export function fraudScore(signals: FraudSignal[]): number {
  const w = { 1: 8, 2: 20, 3: 40 } as const;
  return Math.min(100, signals.reduce((t, s) => t + w[s.severity], 0));
}

/** Listings at or above this score go to moderation instead of the public market (unless they are verified). */
export const QUARANTINE_SCORE = 60;
