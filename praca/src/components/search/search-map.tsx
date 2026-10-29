"use client";

import type { GeoJSONSource, Map as MlMap, StyleSpecification } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { maptilerKey } from "@/lib/env";
import type { BBox } from "@/lib/filters";
import { formatPinPrice } from "@/lib/format";
import type { MapPoint } from "@/server/search";

interface Props {
  points: MapPoint[];
  business: "sale" | "rent";
  /** [west, south, east, north] to frame on first render / when `frameKey` changes. */
  bounds?: [number, number, number, number];
  frameKey: string;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  /** Called after the user (not the code) moved the map. */
  onUserMove: (bbox: BBox) => void;
  className?: string;
}

const PT_CENTER: [number, number] = [-8.1, 39.6];

function styleUrl(dark: boolean) {
  return maptilerKey
    ? `https://api.maptiler.com/maps/${dark ? "dataviz-dark" : "dataviz-light"}/style.json?key=${maptilerKey}`
    : `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`;
}

function pillImage(fill: string, stroke: string): ImageData {
  const c = document.createElement("canvas");
  c.width = c.height = 40;
  const g = c.getContext("2d")!;
  g.fillStyle = fill;
  g.strokeStyle = stroke;
  g.lineWidth = 2;
  g.beginPath();
  g.roundRect(1.5, 1.5, 37, 37, 16);
  g.fill();
  g.stroke();
  return g.getImageData(0, 0, 40, 40);
}

export function SearchMap({ points, business, bounds, frameKey, hoveredId, selectedId, onHover, onSelect, onUserMove, className }: Props) {
  const t = useTranslations("search");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // Latest props for event handlers registered once.
  const live = useRef({ points, business, onHover, onSelect, onUserMove });
  live.current = { points, business, onHover, onSelect, onUserMove };
  const programmatic = useRef(true);

  const toGeoJSON = (pts: MapPoint[], biz: "sale" | "rent") => ({
    type: "FeatureCollection" as const,
    features: pts.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.x, p.y] },
      properties: { id: p.id, label: formatPinPrice(p.p, biz) },
    })),
  });

  // Create the map once per theme (style swap re-adds our layers).
  useEffect(() => {
    let cancelled = false;
    let instance: MlMap | null = null;
    (async () => {
      try {
        const ml = (await import("maplibre-gl")).default;
        if (cancelled || !el.current) return;
        instance = new ml.Map({
          container: el.current,
          style: styleUrl(dark) as string | StyleSpecification,
          center: PT_CENTER,
          zoom: 5.4,
          minZoom: 4,
          maxBounds: [[-35, 28], [-3, 43.5]],
          attributionControl: { compact: true },
          cooperativeGestures: false,
        });
        map.current = instance;
        instance.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");

        const setup = () => {
          const m = instance!;
          const pillFill = dark ? "#26241f" : "#ffffff";
          const pillStroke = dark ? "#4a463f" : "#c9c5bc";
          const opts = { pixelRatio: 2, stretchX: [[14, 26]] as [number, number][], stretchY: [[14, 26]] as [number, number][], content: [14, 14, 26, 26] as [number, number, number, number] };
          if (!m.hasImage("pill")) m.addImage("pill", pillImage(pillFill, pillStroke), opts);
          if (!m.hasImage("pill-active")) m.addImage("pill-active", pillImage(dark ? "#8da4f7" : "#1d3fb5", dark ? "#a8baf9" : "#17328f"), opts);
          if (!m.getSource("listings")) {
            m.addSource("listings", { type: "geojson", data: toGeoJSON(live.current.points, live.current.business), cluster: true, clusterRadius: 46, clusterMaxZoom: 14 });
          }
          const font = ["Noto Sans Bold"];
          if (!m.getLayer("clusters")) {
            m.addLayer({
              id: "clusters",
              type: "circle",
              source: "listings",
              filter: ["has", "point_count"],
              paint: {
                "circle-color": dark ? "#8da4f7" : "#1d3fb5",
                "circle-radius": ["step", ["get", "point_count"], 16, 25, 20, 100, 25, 500, 31],
                "circle-stroke-width": 3,
                "circle-stroke-color": dark ? "rgba(141,164,247,.35)" : "rgba(29,63,181,.25)",
              },
            });
            m.addLayer({
              id: "cluster-count",
              type: "symbol",
              source: "listings",
              filter: ["has", "point_count"],
              layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": font, "text-size": 13, "text-allow-overlap": true },
              paint: { "text-color": dark ? "#0c1330" : "#ffffff" },
            });
            m.addLayer({
              id: "pins",
              type: "symbol",
              source: "listings",
              filter: ["!", ["has", "point_count"]],
              layout: {
                "icon-image": "pill",
                "icon-text-fit": "both",
                "icon-text-fit-padding": [3, 8, 3, 8],
                "icon-allow-overlap": true,
                "text-field": ["get", "label"],
                "text-font": font,
                "text-size": 12,
                "text-allow-overlap": true,
              },
              paint: { "text-color": dark ? "#f1efea" : "#1a1917" },
            });
            m.addLayer({
              id: "pins-active",
              type: "symbol",
              source: "listings",
              filter: ["==", ["get", "id"], ""],
              layout: {
                "icon-image": "pill-active",
                "icon-text-fit": "both",
                "icon-text-fit-padding": [4, 9, 4, 9],
                "icon-allow-overlap": true,
                "text-field": ["get", "label"],
                "text-font": font,
                "text-size": 13,
                "text-allow-overlap": true,
              },
              paint: { "text-color": dark ? "#0c1330" : "#ffffff" },
            });
          }
          setReady(true);
        };

        instance.on("style.load", setup);
        instance.on("error", (e) => {
          // Tile/style failures: keep the list usable and tell the user.
          if (e.error && /style|Failed to fetch|NetworkError/i.test(String(e.error.message)) && !instance!.isStyleLoaded()) setFailed(true);
        });

        instance.on("click", "clusters", async (e) => {
          const f = instance!.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
          if (!f) return;
          const src = instance!.getSource("listings") as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(f.properties!.cluster_id as number);
          programmatic.current = false;
          instance!.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom: Math.min(zoom + 0.2, 17) });
        });
        instance.on("click", "pins", (e) => {
          const f = e.features?.[0];
          if (f) live.current.onSelect(String(f.properties!.id));
        });
        instance.on("click", (e) => {
          const hit = instance!.queryRenderedFeatures(e.point, { layers: ["pins", "clusters"] });
          if (!hit.length) live.current.onSelect(null);
        });
        instance.on("mousemove", "pins", (e) => {
          instance!.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          live.current.onHover(f ? String(f.properties!.id) : null);
        });
        instance.on("mouseleave", "pins", () => {
          instance!.getCanvas().style.cursor = "";
          live.current.onHover(null);
        });
        instance.on("mouseenter", "clusters", () => (instance!.getCanvas().style.cursor = "pointer"));
        instance.on("mouseleave", "clusters", () => (instance!.getCanvas().style.cursor = ""));

        instance.on("movestart", (e) => {
          // Events caused by user input carry an originalEvent; programmatic camera moves do not.
          programmatic.current = !(e as { originalEvent?: unknown }).originalEvent;
        });
        instance.on("moveend", () => {
          if (programmatic.current) return;
          const b = instance!.getBounds();
          live.current.onUserMove({ w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() });
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      setReady(false);
      instance?.remove();
      map.current = null;
    };
     
  }, [dark]);

  // Frame the geography when it changes.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    programmatic.current = true;
    if (bounds) m.fitBounds(bounds, { padding: 48, animate: false, maxZoom: 15 });
    else m.jumpTo({ center: PT_CENTER, zoom: 5.4 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameKey, ready]);

  // Push new points.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource("listings") as GeoJSONSource | undefined)?.setData(toGeoJSON(points, business));
     
  }, [points, business, ready]);

  // Hover / selection highlight.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !m.getLayer("pins-active")) return;
    m.setFilter("pins-active", ["==", ["get", "id"], selectedId ?? hoveredId ?? ""]);
  }, [hoveredId, selectedId, ready]);

  if (failed) {
    return (
      <div role="alert" className={`flex items-center justify-center bg-surface-2 p-6 text-center text-sm text-muted ${className ?? ""}`}>
        {t("mapError")}
      </div>
    );
  }
  // maplibre-gl.css forces position:relative on its container, so positioning lives on a wrapper.
  return (
    <div className={className}>
      <div ref={el} role="region" aria-label={t("mapLabel")} className="size-full" />
    </div>
  );
}
