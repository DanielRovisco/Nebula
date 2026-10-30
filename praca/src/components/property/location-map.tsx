"use client";

import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Label, Select } from "@/components/ui/input";
import { maptilerKey } from "@/lib/env";
import { useVisible } from "@/lib/use-visible";
import { ISO_MINUTES, ISO_MODES, type IsoMode } from "@/lib/isochrone";
import type { RiskLayerInfo } from "@/server/risk";

const EMPTY = { type: "FeatureCollection", features: [] } as const;

export function LocationMap({ lat, lng, approximate, layers = [] }: { lat: number; lng: number; approximate: boolean; layers?: RiskLayerInfo[] }) {
  const t = useTranslations("property");
  const tm = useTranslations("mapTools");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const visible = useVisible(wrap);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [layer, setLayer] = useState("");
  const [mode, setMode] = useState<IsoMode | "">("");
  const [minutes, setMinutes] = useState<number>(15);
  const [isoNote, setIsoNote] = useState<"openrouteservice" | "approximation" | "error" | null>(null);

  useEffect(() => {
    if (!visible) return;
    let map: MlMap | null = null;
    let cancelled = false;
    setReady(false);
    (async () => {
      try {
        const ml = (await import("maplibre-gl")).default;
        if (cancelled || !el.current) return;
        const style = maptilerKey
          ? `https://api.maptiler.com/maps/${dark ? "dataviz-dark" : "dataviz-light"}/style.json?key=${maptilerKey}`
          : `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`;
        map = new ml.Map({ container: el.current, style, center: [lng, lat], zoom: approximate ? 14 : 15.5, attributionControl: { compact: true }, cooperativeGestures: true });
        mapRef.current = map;
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        const pin = document.createElement("div");
        pin.className = "size-5 rounded-full border-[3px] border-white bg-[var(--brand)] shadow-[0_0_0_6px_rgb(29_63_181/0.25)]";
        new ml.Marker({ element: pin }).setLngLat([lng, lat]).addTo(map);
        map.on("load", () => {
          if (!map || cancelled) return;
          map.addSource("risk", { type: "geojson", data: EMPTY as never });
          map.addSource("iso", { type: "geojson", data: EMPTY as never });
          map.addLayer({ id: "iso-fill", type: "fill", source: "iso", paint: { "fill-color": "#1d3fb5", "fill-opacity": 0.14 } });
          map.addLayer({ id: "iso-line", type: "line", source: "iso", paint: { "line-color": "#1d3fb5", "line-width": 2, "line-dasharray": [2, 1] } });
          map.addLayer({
            id: "risk-fill",
            type: "fill",
            source: "risk",
            paint: { "fill-color": ["match", ["get", "level"], "high", "#b42318", "medium", "#e08a00", "low", "#d9b100", "#8a5300"], "fill-opacity": 0.38 },
          });
          setReady(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [lat, lng, dark, approximate, visible]);

  // Risk overlay: re-fetched for the visible area whenever the layer or the view changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const src = map.getSource("risk") as GeoJSONSource | undefined;
    if (!layer) {
      src?.setData(EMPTY as never);
      return;
    }
    let live = true;
    const load = async () => {
      const b = map.getBounds();
      try {
        const r = await fetch(`/api/risk/${layer}?bbox=${[b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(",")}`);
        if (r.ok && live) src?.setData((await r.json()) as never);
      } catch {
        /* overlay stays as it was */
      }
    };
    void load();
    map.on("moveend", load);
    return () => {
      live = false;
      map.off("moveend", load);
    };
  }, [layer, ready]);

  // Isochrone overlay.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const src = map.getSource("iso") as GeoJSONSource | undefined;
    if (!mode) {
      src?.setData(EMPTY as never);
      setIsoNote(null);
      return;
    }
    let live = true;
    (async () => {
      try {
        const r = await fetch(`/api/isochrone?lat=${lat}&lng=${lng}&mode=${mode}&minutes=${minutes}`);
        if (!r.ok) throw new Error(String(r.status));
        const d = (await r.json()) as { provider: "openrouteservice" | "approximation"; geojson: unknown };
        if (!live) return;
        src?.setData(d.geojson as never);
        setIsoNote(d.provider);
        const b = (d.geojson as { features?: { geometry: { coordinates: number[][][] } }[] }).features?.[0]?.geometry.coordinates[0];
        if (b?.length) {
          const xs = b.map((p) => p[0]!);
          const ys = b.map((p) => p[1]!);
          map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: 40, duration: 400 });
        }
      } catch {
        if (live) setIsoNote("error");
      }
    })();
    return () => {
      live = false;
    };
  }, [mode, minutes, ready, lat, lng]);

  if (failed) return <div className="flex h-72 items-center justify-center rounded-[16px] bg-surface-2 text-sm text-muted">{t("locationNote")}</div>;
  const active = layers.find((l) => l.code === layer);
  return (
    <div>
      <div ref={wrap} className="relative h-72 overflow-hidden rounded-[16px] border border-border bg-surface-2 sm:h-80">
        <div ref={el} className="size-full" role="region" aria-label={t("location")} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {layers.length > 0 && (
          <div>
            <Label htmlFor="map-risk">{tm("riskLayer")}</Label>
            <Select id="map-risk" value={layer} onChange={(e) => setLayer(e.target.value)}>
              <option value="">{tm("none")}</option>
              {layers.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                  {l.isSeed ? ` (${tm("demo")})` : ""}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div>
          <Label htmlFor="map-iso">{tm("reach")}</Label>
          <Select id="map-iso" value={mode} onChange={(e) => setMode(e.target.value as IsoMode | "")}>
            <option value="">{tm("none")}</option>
            {ISO_MODES.map((m) => (
              <option key={m} value={m}>
                {tm(`mode.${m}`)}
              </option>
            ))}
          </Select>
        </div>
        {mode && (
          <div>
            <Label htmlFor="map-iso-min">{tm("minutes")}</Label>
            <Select id="map-iso-min" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {ISO_MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      <div aria-live="polite" className="mt-2 space-y-1 text-xs text-muted">
        {isoNote === "approximation" && <p className="text-warn">{tm("isoApprox")}</p>}
        {isoNote === "openrouteservice" && <p>{tm("isoOrs")}</p>}
        {isoNote === "error" && <p className="text-down">{tm("isoError")}</p>}
        {active && (
          <p>
            {active.source}
            {active.isSeed && <span className="text-warn"> · {tm("demoNotice")}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
