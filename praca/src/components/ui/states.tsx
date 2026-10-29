import { AlertTriangle, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StateProps {
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}

/** Empty states always offer a next step. */
export function EmptyState({ title, text, action, className, icon }: StateProps) {
  return (
    <div role="status" className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-muted">{icon ?? <SearchX className="size-6" aria-hidden />}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, text, action, className }: StateProps) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-full bg-down/12 text-down">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
