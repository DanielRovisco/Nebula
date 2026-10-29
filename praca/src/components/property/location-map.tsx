"use client";

import type { Map as MlMap } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { maptilerKey } from "@/lib/env";

export function LocationMap({ lat, lng, approximate }: { lat: number; lng: number; approximate: boolean }) {
  const t = useTranslations("property");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const el = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let map: MlMap | null = null;
    let cancelled = false;
    (async () => {
      try {
        const ml = (await import("maplibre-gl")).default;
        if (cancelled || !el.current) return;
        const style = maptilerKey
          ? `https://api.maptiler.com/maps/${dark ? "dataviz-dark" : "dataviz-light"}/style.json?key=${maptilerKey}`
          : `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`;
        map = new ml.Map({ container: el.current, style, center: [lng, lat], zoom: approximate ? 14 : 15.5, attributionControl: { compact: true }, cooperativeGestures: true });
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        const pin = document.createElement("div");
        pin.className = "size-5 rounded-full border-[3px] border-white bg-[var(--brand)] shadow-[0_0_0_6px_rgb(29_63_181/0.25)]";
        new ml.Marker({ element: pin }).setLngLat([lng, lat]).addTo(map);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, dark, approximate]);

  if (failed) return <div className="flex h-72 items-center justify-center rounded-[16px] bg-surface-2 text-sm text-muted">{t("locationNote")}</div>;
  return (
    <div className="relative h-72 overflow-hidden rounded-[16px] border border-border sm:h-80">
      <div ref={el} className="size-full" role="region" aria-label={t("location")} />
    </div>
  );
}
