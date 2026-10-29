"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");
  const c = useTranslations("common");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-24">
      <ErrorState title={t("title")} text={t("text")} action={<Button onClick={reset}>{c("retry")}</Button>} />
      {error.digest && <p className="mt-2 text-center text-xs text-muted">ref. {error.digest}</p>}
    </div>
  );
}
