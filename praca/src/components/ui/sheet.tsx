"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof Dialog.Content> {
  side?: "right" | "bottom";
  closeLabel: string;
  title: string;
  description?: string;
}

/** Right-side drawer on desktop, bottom sheet on mobile. */
export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, side = "right", closeLabel, title, description, ...props }, ref) => (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] data-[state=open]:animate-[fade_150ms_ease-out]" />
      <Dialog.Content
        ref={ref}
        className={cn(
          "fixed z-50 flex flex-col bg-surface shadow-[var(--shadow-lg)] outline-none",
          side === "right"
            ? "inset-y-0 right-0 w-full max-w-md border-l border-border max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[88dvh] max-md:max-w-none max-md:rounded-t-[20px] max-md:border-l-0 max-md:border-t md:data-[state=open]:animate-[slide-in-right_200ms_var(--ease-out)] max-md:data-[state=open]:animate-[slide-in-bottom_220ms_var(--ease-out)]"
            : "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[20px] border-t border-border data-[state=open]:animate-[slide-in-bottom_220ms_var(--ease-out)]",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
          <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
          <Dialog.Close
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
            aria-label={closeLabel}
          >
            <X className="size-5" aria-hidden />
          </Dialog.Close>
        </div>
        {description ? <Dialog.Description className="sr-only">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
        {children}
      </Dialog.Content>
      <style>{`
        @keyframes fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slide-in-right { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes slide-in-bottom { from { transform: translateY(32px); opacity: 0 } to { transform: none; opacity: 1 } }
      `}</style>
    </Dialog.Portal>
  ),
);
SheetContent.displayName = "SheetContent";
