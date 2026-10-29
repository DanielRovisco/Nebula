import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-surface-2 text-fg",
      brand: "bg-brand-soft text-brand",
      up: "bg-up/12 text-up",
      down: "bg-down/12 text-down",
      warn: "bg-warn-soft text-warn",
      outline: "border border-border-strong text-muted",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
