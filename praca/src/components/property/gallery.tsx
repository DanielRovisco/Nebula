"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { PropertyImage } from "@/components/property-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Img {
  url: string;
  alt: string | null;
  illustrative: boolean;
}

export function Gallery({ images, title }: { images: Img[]; title: string }) {
  const t = useTranslations("property");
  const c = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const n = images.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  if (!n) return <div className="aspect-[16/7] rounded-[20px] bg-surface-2" role="img" aria-label={title} />;

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };
  const thumbs = images.slice(1, 5);

  return (
    <>
      <div className="relative grid gap-2 overflow-hidden rounded-[20px] md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2">
        <button
          type="button"
          onClick={() => openAt(0)}
          aria-label={t("viewPhotos", { count: n })}
          className="relative aspect-[4/3] overflow-hidden bg-surface-2 md:row-span-2 md:aspect-auto md:min-h-[420px]"
        >
          <PropertyImage src={images[0]!.url} alt={images[0]!.alt ?? title} priority sizes="(max-width: 768px) 100vw, 60vw" className="size-full" />
        </button>
        {thumbs.map((im, i) => (
          <button
            key={im.url}
            type="button"
            onClick={() => openAt(i + 1)}
            className={cn("relative hidden overflow-hidden bg-surface-2 md:block", i === 3 && "")}
            aria-label={t("photoOf", { current: i + 2, total: n })}
          >
            <PropertyImage src={im.url} alt={im.alt ?? title} sizes="20vw" className="size-full transition-transform duration-500 hover:scale-[1.04]" />
          </button>
        ))}
        <Button variant="secondary" size="sm" onClick={() => openAt(0)} className="absolute bottom-3 right-3 shadow-[var(--shadow-md)]">
          <Images aria-hidden />
          {t("viewPhotos", { count: n })}
        </Button>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/90" />
          <Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-[61] flex flex-col outline-none">
            <Dialog.Title className="sr-only">{t("gallery")}</Dialog.Title>
            <div className="flex items-center justify-between px-4 py-3 text-white">
              <p className="tnum text-sm" aria-live="polite">
                {t("photoOf", { current: index + 1, total: n })}
              </p>
              <Dialog.Close className="flex size-11 items-center justify-center rounded-full hover:bg-white/15" aria-label={c("close")}>
                <X aria-hidden />
              </Dialog.Close>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-16">
              <button type="button" onClick={() => go(-1)} aria-label={t("prev")} className="absolute left-2 z-10 flex size-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 md:left-4">
                <ChevronLeft aria-hidden />
              </button>
              <div className="relative size-full">
                <PropertyImage src={images[index]!.url} alt={images[index]!.alt ?? title} sizes="100vw" className="size-full !object-contain" priority />
              </div>
              <button type="button" onClick={() => go(1)} aria-label={t("next")} className="absolute right-2 z-10 flex size-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 md:right-4">
                <ChevronRight aria-hidden />
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none]">
              {images.map((im, i) => (
                <button
                  key={im.url}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t("photoOf", { current: i + 1, total: n })}
                  aria-current={i === index}
                  className={cn("relative h-16 w-24 shrink-0 overflow-hidden rounded-lg opacity-60 transition-opacity", i === index && "opacity-100 ring-2 ring-white")}
                >
                  <PropertyImage src={im.url} alt="" sizes="96px" className="size-full" />
                </button>
              ))}
            </div>
            {images[index]!.illustrative && <p className="pb-3 text-center text-xs text-white/70">{t("illustrative")}</p>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
