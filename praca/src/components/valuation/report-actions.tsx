"use client";

import { Copy, FileDown, Link2, Link2Off } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createSmartLink, revokeSmartLink } from "@/server/valuations";

interface Props {
  valuationId: string;
  slug: string | null;
  pdfAllowed: boolean;
  origin: string;
  locale: string;
}

export function ReportActions({ valuationId, slug: initial, pdfAllowed, origin, locale }: Props) {
  const t = useTranslations("valuation");
  const [slug, setSlug] = useState(initial);
  const [pending, start] = useTransition();
  const url = slug ? `${origin}${locale === "en" ? "/en" : ""}/s/${slug}` : null;
  return (
    <div className="no-print space-y-3">
      <div className="flex flex-wrap gap-2">
        {pdfAllowed ? (
          <Button asChild variant="secondary">
            <a href={`/api/valuations/${valuationId}/pdf`}>
              <FileDown aria-hidden />
              {t("pdf")}
            </a>
          </Button>
        ) : (
          <p className="text-sm text-muted">{t("pdfNeed")}</p>
        )}
        {!slug && (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await createSmartLink(valuationId, true);
                if (r.ok && r.slug) setSlug(r.slug);
              })
            }
          >
            <Link2 aria-hidden />
            {t("smartlink")}
          </Button>
        )}
      </div>
      {url && (
        <div className="rounded-[14px] border border-border bg-surface-2 p-3">
          <p className="text-sm font-medium">{t("smartlinkReady")}</p>
          <p className="mt-1 break-all font-mono text-xs text-muted" data-testid="smartlink-url">{url}</p>
          <p className="mt-1 text-xs text-muted">{t("smartlinkNote")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  toast.success(t("copied"));
                } catch {
                  toast(url);
                }
              }}
            >
              <Copy aria-hidden />
              {t("copy")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await revokeSmartLink(valuationId);
                  setSlug(null);
                })
              }
            >
              <Link2Off aria-hidden />
              {t("revoke")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
