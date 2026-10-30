"use client";

import type { GeoJSONSource, Map as MlMap, StyleSpecification } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { maptilerKey } from "@/lib/env";
import type { BBox } from "@/lib/filters";
import type { Ring } from "@/lib/zones";
import { Button } from "@/components/ui/button";
import { Check, PenLine, X } from "lucide-react";
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
  /** Zones already applied to the search, shown as outlines. */
  zones: Ring[];
  drawing: boolean;
  onDrawingChange: (v: boolean) => void;
  /** A finished free-hand polygon (>= 3 vertices). */
  onZoneAdd: (ring: Ring) => void;
  /** Extra controls rendered inside the map (saved zones menu). */
  children?: React.ReactNode;
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

export function SearchMap({ points, business, bounds, frameKey, hoveredId, selectedId, onHover, onSelect, onUserMove, zones, drawing, onDrawingChange, onZoneAdd, children, className }: Props) {
  const t = useTranslations("search");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // Latest props for event handlers registered once.
  const live = useRef({ points, business, onHover, onSelect, onUserMove, drawing, zones, onZoneAdd, onDrawingChange });
  live.current = { points, business, onHover, onSelect, onUserMove, drawing, zones, onZoneAdd, onDrawingChange };
  const draft = useRef<Ring>([]);
  const [draftCount, setDraftCount] = useState(0);
  const programmatic = useRef(true);

  const toGeoJSON = (pts: MapPoint[], biz: "sale" | "rent") => ({
    type: "FeatureCollection" as const,
    features: pts.map((p) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [p.x, p.y] },
      properties: { id: p.id, label: formatPinPrice(p.p, biz) },
    })),
  });

  const zonesGeoJSON = (zs: Ring[]) => ({
    type: "FeatureCollection" as const,
    features: zs.map((r, i) => ({ type: "Feature" as const, properties: { i }, geometry: { type: "Polygon" as const, coordinates: [[...r, r[0]!]] } })),
  });
  const draftGeoJSON = (r: Ring) => ({
    type: "FeatureCollection" as const,
    features: [
      ...(r.length > 1 ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: r } }] : []),
      ...r.map((c) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: c } })),
    ],
  });
  const paintDraft = () => (map.current?.getSource("draft") as GeoJSONSource | undefined)?.setData(draftGeoJSON(draft.current));
  const finishDraft = () => {
    if (draft.current.length >= 3) live.current.onZoneAdd(draft.current);
    draft.current = [];
    setDraftCount(0);
    paintDraft();
    live.current.onDrawingChange(false);
  };
  const cancelDraft = () => {
    draft.current = [];
    setDraftCount(0);
    paintDraft();
    live.current.onDrawingChange(false);
  };
  const finishRef = useRef(finishDraft);
  finishRef.current = finishDraft;
  const cancelRef = useRef(cancelDraft);
  cancelRef.current = cancelDraft;

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
          if (!m.getSource("zones")) {
            m.addSource("zones", { type: "geojson", data: zonesGeoJSON(live.current.zones) });
            m.addSource("draft", { type: "geojson", data: draftGeoJSON(draft.current) });
            const brand = dark ? "#8da4f7" : "#1d3fb5";
            m.addLayer({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-color": brand, "fill-opacity": 0.12 } }, "clusters");
            m.addLayer({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": brand, "line-width": 2.5 } }, "clusters");
            m.addLayer({ id: "draft-line", type: "line", source: "draft", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": brand, "line-width": 2.5, "line-dasharray": [2, 1.5] } });
            m.addLayer({ id: "draft-pts", type: "circle", source: "draft", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 5, "circle-color": "#ffffff", "circle-stroke-color": brand, "circle-stroke-width": 2.5 } });
          }
          setReady(true);
        };

        instance.on("style.load", setup);
        instance.on("error", (e) => {
          // Tile/style failures: keep the list usable and tell the user.
          if (e.error && /style|Failed to fetch|NetworkError/i.test(String(e.error.message)) && !instance!.isStyleLoaded()) setFailed(true);
        });

        instance.on("click", "clusters", async (e) => {
          if (live.current.drawing) return;
          const f = instance!.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
          if (!f) return;
          const src = instance!.getSource("listings") as GeoJSONSource;
          const zoom = await src.getClusterExpansionZoom(f.properties!.cluster_id as number);
          programmatic.current = false;
          instance!.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom: Math.min(zoom + 0.2, 17) });
        });
        instance.on("click", "pins", (e) => {
          if (live.current.drawing) return;
          const f = e.features?.[0];
          if (f) live.current.onSelect(String(f.properties!.id));
        });
        instance.on("click", (e) => {
          if (live.current.drawing) {
            const first = draft.current[0];
            // Clicking the first vertex (within 12 px) closes the polygon.
            if (draft.current.length >= 3 && first) {
              const p0 = instance!.project(first as [number, number]);
              if (Math.hypot(p0.x - e.point.x, p0.y - e.point.y) < 12) return finishRef.current();
            }
            draft.current = [...draft.current, [e.lngLat.lng, e.lngLat.lat]];
            setDraftCount(draft.current.length);
            paintDraft();
            return;
          }
          const hit = instance!.queryRenderedFeatures(e.point, { layers: ["pins", "clusters"] });
          if (!hit.length) live.current.onSelect(null);
        });
        instance.on("dblclick", (e) => {
          if (!live.current.drawing) return;
          e.preventDefault();
          // The two clicks of a double click each added the same vertex: drop the duplicate.
          draft.current = draft.current.slice(0, -1);
          finishRef.current();
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

  // Zones outline.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    (m.getSource("zones") as GeoJSONSource | undefined)?.setData(zonesGeoJSON(zones));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zones, ready]);

  // Draw mode: crosshair, no double-click zoom, keyboard shortcuts.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    if (drawing) {
      m.doubleClickZoom.disable();
      m.getCanvas().style.cursor = "crosshair";
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Enter") finishRef.current();
        if (e.key === "Escape") cancelRef.current();
      };
      window.addEventListener("keydown", onKey);
      return () => {
        window.removeEventListener("keydown", onKey);
        m.doubleClickZoom.enable();
        m.getCanvas().style.cursor = "";
      };
    }
    draft.current = [];
    setDraftCount(0);
    (m.getSource("draft") as GeoJSONSource | undefined)?.setData(draftGeoJSON([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawing, ready]);

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
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
        {drawing ? (
          <>
            <Button size="sm" onClick={() => finishRef.current()} disabled={draftCount < 3} className="shadow-[var(--shadow-md)]">
              <Check aria-hidden />
              {t("drawFinish")}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => cancelRef.current()} className="shadow-[var(--shadow-md)]">
              <X aria-hidden />
              {t("drawCancel")}
            </Button>
            <p role="status" className="rounded-full bg-surface px-3 py-1.5 text-xs shadow-[var(--shadow-md)]">
              {draftCount < 3 ? t("drawHint", { n: draftCount }) : t("drawHintClose")}
            </p>
          </>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => onDrawingChange(true)} className="shadow-[var(--shadow-md)]">
            <PenLine aria-hidden />
            {t("drawZone")}
          </Button>
        )}
        {!drawing && children}
      </div>
    </div>
  );
}
