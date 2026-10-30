import { getTranslations } from "next-intl/server";
import { formatNumber } from "@/lib/format";
import type { HistBucket } from "@/server/observatory";

export async function Histogram({ buckets }: { buckets: HistBucket[] }) {
  const t = await getTranslations("market");
  const max = Math.max(...buckets.map((b) => b.count), 1);
  const W = 640, H = 200, pad = { l: 8, r: 8, t: 8, b: 28 };
  const bw = (W - pad.l - pad.r) / buckets.length;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("distTitle")} className="h-auto w-full">
        {buckets.map((b, i) => {
          const h = ((H - pad.t - pad.b) * b.count) / max;
          const x = pad.l + i * bw;
          return (
            <g key={i}>
              <rect x={x + 2} y={H - pad.b - h} width={bw - 4} height={Math.max(h, 0)} rx={4} fill="var(--d1)" opacity={0.85}>
                <title>{t("distBucket", { from: formatNumber(b.from), to: formatNumber(b.to), count: b.count })}</title>
              </rect>
              {b.count > 0 && h > 16 && (
                <text x={x + bw / 2} y={H - pad.b - h + 14} textAnchor="middle" fontSize="11" fill="var(--bg)" className="tnum">
                  {b.count}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--border-strong)" />
        {[0, 5, 10].map((i) => {
          const v = i === 10 ? buckets[9]!.to : buckets[i]!.from;
          return (
            <text key={i} x={pad.l + (i / 10) * (W - pad.l - pad.r)} y={H - 8} textAnchor={i === 0 ? "start" : i === 10 ? "end" : "middle"} fontSize="12" fill="var(--muted)" className="tnum">
              {formatNumber(v)} €/m²
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
