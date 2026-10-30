"use client";

import { useFormatter } from "next-intl";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface CompareSeries {
  name: string;
  points: { period: string; v: number }[];
}

export function CompareChart({ series, mode }: { series: CompareSeries[]; mode: "index" | "abs" }) {
  const f = useFormatter();
  const periods = [...new Set(series.flatMap((s) => s.points.map((p) => p.period)))].sort();
  const base = series.map((s) => s.points[0]?.v ?? 1);
  const rows = periods.map((per) => {
    const row: Record<string, number | undefined> = { ts: new Date(per + "T00:00:00Z").getTime() };
    series.forEach((s, i) => {
      const v = s.points.find((p) => p.period === per)?.v;
      row[`s${i}`] = v == null ? undefined : mode === "index" ? (v / base[i]!) * 100 : v;
    });
    return row;
  });
  return (
    <div>
      <div className="h-72 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart accessibilityLayer={false} data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ts" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(v: number) => f.dateTime(v, { month: "short", year: "2-digit" })} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={36} />
            <YAxis domain={["auto", "auto"]} tickFormatter={(v: number) => String(Math.round(v))} tick={{ fill: "var(--muted)", fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} labelFormatter={(v) => f.dateTime(Number(v), { month: "long", year: "numeric" })} formatter={(v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v) as never} />
            <Legend />
            {series.map((s, i) => (
              <Line key={s.name} name={s.name} dataKey={`s${i}`} stroke={`var(--d${i + 1})`} strokeWidth={2.5} dot={false} isAnimationActive={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{series.map((s) => s.name).join(", ")}</caption>
        <tbody>
          {periods.map((p) => (
            <tr key={p}>
              <td>{p}</td>
              {series.map((s) => (
                <td key={s.name}>{s.points.find((x) => x.period === p)?.v ?? ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
