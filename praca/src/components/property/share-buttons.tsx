"use client";

import { Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({ title, label, copiedLabel }: { title: string; label: string; copiedLabel: string }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            toast.success(copiedLabel);
          }
        } catch {
          /* user dismissed the share sheet */
        }
      }}
    >
      <Share2 aria-hidden />
      {label}
    </Button>
  );
}

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="secondary" size="sm" onClick={() => window.print()}>
      <Printer aria-hidden />
      {label}
    </Button>
  );
}
