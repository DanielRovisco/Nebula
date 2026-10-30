"use client";

import type { Map as MlMap, Marker } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { maptilerKey } from "@/lib/env";

interface Props {
  lat: number | null;
  lng: number | null;
  /** Centre used until a point is picked (e.g. a parish centroid). */
  focus: [number, number] | null;
  onChange: (lat: number, lng: number) => void;
}

export function LocationPicker({ lat, lng, focus, onChange }: Props) {
  const t = useTranslations("valuation");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const cb = useRef(onChange);
  cb.current = onChange;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let m: MlMap | null = null;
    (async () => {
      try {
        const ml = (await import("maplibre-gl")).default;
        if (cancelled || !el.current) return;
        const style = maptilerKey ? `https://api.maptiler.com/maps/${dark ? "dataviz-dark" : "dataviz-light"}/style.json?key=${maptilerKey}` : `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`;
        m = new ml.Map({ container: el.current, style, center: lng != null && lat != null ? [lng, lat] : focus ?? [-8.1, 39.6], zoom: lat != null ? 16 : focus ? 14 : 5.4, attributionControl: { compact: true } });
        map.current = m;
        m.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        const pin = document.createElement("div");
        pin.className = "size-5 rounded-full border-[3px] border-white bg-[var(--brand)] shadow-[0_0_0_6px_rgb(29_63_181/0.25)]";
        marker.current = new ml.Marker({ element: pin, draggable: true });
        if (lat != null && lng != null) marker.current.setLngLat([lng, lat]).addTo(m);
        const place = (x: number, y: number) => {
          marker.current!.setLngLat([x, y]).addTo(m!);
          cb.current(y, x);
        };
        m.on("click", (e) => place(e.lngLat.lng, e.lngLat.lat));
        marker.current.on("dragend", () => {
          const p = marker.current!.getLngLat();
          cb.current(p.lat, p.lng);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      m?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  // Fly to a newly chosen focus (parish/postcode picked in the autocomplete).
  useEffect(() => {
    if (focus && map.current) map.current.flyTo({ center: focus, zoom: 15 });
  }, [focus]);

  if (failed) return <p className="rounded-[12px] bg-surface-2 p-4 text-sm text-muted">{t("pickOnMap")}</p>;
  return (
    <div>
      <div className="h-72 overflow-hidden rounded-[16px] border border-border">
        <div ref={el} className="size-full" role="region" aria-label={t("location")} />
      </div>
      <p className="mt-2 text-xs text-muted" aria-live="polite">
        {lat != null && lng != null ? t("locationSet", { lat: lat.toFixed(5), lng: lng.toFixed(5) }) : t("pickOnMap")}
      </p>
    </div>
  );
}
