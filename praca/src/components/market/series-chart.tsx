"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatEur } from "@/lib/format";

interface Point {
  period: string;
  ppm: number;
  p25: number | null;
  p75: number | null;
}

export function SeriesChart({ data, label, unit, height = 240 }: { data: Point[]; label: string; unit: string; height?: number }) {
  const t = useTranslations("market");
  const f = useFormatter();
  if (data.length < 3) return <p className="text-sm text-muted">{t("seriesNoData")}</p>;
  const rows = data.map((d) => ({ ts: new Date(d.period + "T00:00:00Z").getTime(), ppm: d.ppm, range: [d.p25 ?? d.ppm, d.p75 ?? d.ppm] as [number, number] }));
  const vals = data.flatMap((d) => [d.ppm, d.p25 ?? d.ppm, d.p75 ?? d.ppm]);
  const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * 0.1 || hi * 0.05;
  const rent = unit === "rent";
  return (
    <div>
      <div className="w-full" style={{ height }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart accessibilityLayer={false} data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(v: number) => f.dateTime(v, { month: "short", year: "2-digit" })} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={36} />
            <YAxis allowDataOverflow domain={[Math.floor((lo - pad) / (rent ? 0.5 : 50)) * (rent ? 0.5 : 50), Math.ceil((hi + pad) / (rent ? 0.5 : 50)) * (rent ? 0.5 : 50)]} tickFormatter={(v: number) => (rent ? v.toFixed(1).replace(".", ",") : String(Math.round(v)))} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-md)" }}
              labelFormatter={(v) => f.dateTime(Number(v), { month: "long", year: "numeric" })}
              formatter={(v, name) => (name === "ppm" ? [rent ? `${Number(v).toFixed(2).replace(".", ",")} €` : formatEur(Number(v)), label] : [null, null]) as never}
            />
            {/* A range area (low/high pair) keeps the y-domain tight; stacked areas would force it down to 0. */}
            <Area dataKey="range" stroke="none" fill="var(--d1)" fillOpacity={0.14} isAnimationActive={false} />
            <Line dataKey="ppm" stroke="var(--d1)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{t("seriesTable")}: {label}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.period}><td>{d.period}</td><td>{d.ppm}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
