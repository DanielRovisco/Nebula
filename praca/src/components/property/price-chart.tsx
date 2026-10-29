"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "@/lib/format";

interface Point {
  at: string;
  price: number;
}

export function PriceChart({ data, rent }: { data: Point[]; rent: boolean }) {
  const t = useTranslations("property");
  const f = useFormatter();
  // Step data: carry the previous price to "now" so the last segment is visible.
  const series = [...data];
  if (series.length) series.push({ at: new Date().toISOString(), price: series[series.length - 1]!.price });
  const rows = series.map((p) => ({ ts: new Date(p.at).getTime(), price: p.price }));
  const min = Math.min(...rows.map((r) => r.price));
  const max = Math.max(...rows.map((r) => r.price));
  const pad = Math.max((max - min) * 0.2, max * 0.02);

  return (
    <div>
      <div className="h-56 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => f.dateTime(v, { month: "short", year: "2-digit" })}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={[Math.floor((min - pad) / 1000) * 1000, Math.ceil((max + pad) / 1000) * 1000]}
              tickFormatter={(v: number) => (rent ? `${v}` : `${Math.round(v / 1000)}k`)}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-md)" }}
              labelFormatter={(v) => f.dateTime(Number(v), { day: "2-digit", month: "2-digit", year: "numeric" })}
              formatter={(v) => [formatEur(Number(v)), ""]}
            />
            <Area type="stepAfter" dataKey="price" stroke="var(--d1)" strokeWidth={2.5} fill="var(--d1)" fillOpacity={0.12} dot={{ r: 3, fill: "var(--d1)" }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Accessible alternative to the chart */}
      <table className="sr-only">
        <caption>{t("priceHistory")}</caption>
        <tbody>
          {data.map((p) => (
            <tr key={p.at}>
              <td>{f.dateTime(new Date(p.at), "short")}</td>
              <td>{formatEur(p.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
