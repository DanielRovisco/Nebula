import { cn } from "@/lib/utils";

/** Mark: four stones of a calçada portuguesa, the pavement of every Portuguese praça. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-brand" />
      <rect x="6" y="6" width="9" height="9" rx="2.5" fill="var(--brand-fg)" />
      <rect x="17" y="17" width="9" height="9" rx="2.5" fill="var(--brand-fg)" />
      <rect x="17" y="6" width="9" height="9" rx="2.5" fill="var(--brand-fg)" opacity=".38" />
      <rect x="6" y="17" width="9" height="9" rx="2.5" fill="var(--brand-fg)" opacity=".38" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[1.65rem] font-semibold leading-none tracking-tight">Praça</span>
    </span>
  );
}
