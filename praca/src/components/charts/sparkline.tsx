interface Props {
  values: number[];
  className?: string;
  label: string;
  width?: number;
  height?: number;
}

/** Tiny dependency-free sparkline. The text label carries the information for assistive tech. */
export function Sparkline({ values, className, label, width = 120, height = 36 }: Props) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 3;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), height - pad - ((v - min) / span) * (height - pad * 2)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} role="img" aria-label={label}>
      <path d={`${d} L${last[0]} ${height} L${pts[0]![0]} ${height}Z`} fill="var(--d1)" opacity=".1" />
      <path d={d} fill="none" stroke="var(--d1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="var(--d1)" />
    </svg>
  );
}
