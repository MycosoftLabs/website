"use client";

/**
 * MaritimeNavLayers — isolated, viewport-culled marine-navigation overlays for the buoy GCS.
 *
 * Open-source nautical-nav layers Morgan flagged (OpenSeaMap, OpenCPN/ENC, i-Boating,
 * NaviSu/SentinelMap), ported ISOLATED: each is a self-contained MapLibre source/layer added
 * to the existing <Map> ref via useMap() — NO CREP engine, NO MYCA/CREP providers. Mirrors
 * OceanLayers.tsx / ChartOverlays exactly (config → addSource/addLayer via runWhenStyleReady →
 * visibility effect → cleanup), unique psa-* ids, every maplibre call try/caught.
 *
 * Layers (both keyless / graceful, gated so they never load globally):
 *   - "navaids":       OpenSeaMap seamark raster (buoys/beacons/lights/nav aids) — the canonical
 *                      open-source nautical nav-aid tile set. Min-zoom gated (visibility forced
 *                      off below z6) so it never tiles the whole globe.
 *   - "depthContours": NOAA ENC depth-contour / sounding emphasis. Two same-origin-friendly
 *                      sources: (a) NOAA MarineChart MapServer export raster (WMS bbox-3857
 *                      token, same endpoint ChartOverlays uses) rendered as a depth-emphasis
 *                      raster; (b) /api/crep/ocean/channels ENC depth polygons → contour lines +
 *                      US-customary depth labels (feet / fathoms). Both degrade to empty, never 401.
 *
 * Backend-key note: NONE of these need a key. OpenSeaMap + NOAA MarineChart export are public
 * keyless tile services; /api/crep/ocean/channels is the existing same-origin BFF (returns []
 * when it has nothing, never 401s). If OpenSeaMap/NOAA are unreachable, MapLibre simply shows
 * no raster tiles — no thrown errors, no auth failures.
 */

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useMap } from "@/components/ui/map";
import type { LayerState } from "./MapFiltersPanel";
import { runWhenStyleReady } from "@/lib/psathyrella/mapReady";

const fetcher = (u: string) =>
  fetch(u, { headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
const EMPTY = { type: "FeatureCollection", features: [] as unknown[] };
const f4 = (n: number) => n.toFixed(4);
const isFC = (j: any) => j && j.type === "FeatureCollection" && Array.isArray(j.features);
const fc = (features: any[]) => ({ type: "FeatureCollection", features: features.filter(Boolean) });

interface Bounds { n: number; s: number; e: number; w: number }

// ── Keyless raster sources (public; viewport-culled by MapLibre automatically) ───────────────
// OpenSeaMap seamark tiles = the canonical open-source nav-aid raster (buoys/beacons/lights).
// NOAA MarineChart export = the authoritative ENC chart image (depth contours + soundings); same
// endpoint ChartOverlays uses, MapLibre fills the {bbox-epsg-3857} WMS token per tile.
const SEAMARK_TILES = "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png";
const NOAA_ENC_EXPORT =
  "https://gis.charttools.noaa.gov/arcgis/rest/services/MarineChart_Services/NOAACharts/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png&transparent=true&f=image";

// Min zoom at which the global-tiling rasters are allowed on — keeps them from ever loading
// the whole globe (nav aids / charts are only meaningful coastal/harbor zooms).
const NAVAID_MIN_ZOOM = 6;
const DEPTH_MIN_ZOOM = 6;

// ── US-customary depth helpers ───────────────────────────────────────────────────────────────
// ENC channel polygons carry depth in meters; surface it as feet + fathoms for the Navy operator.
const M_TO_FT = 3.28084;
const M_TO_FATH = 0.546807;

/** navaids — OpenSeaMap seamark raster, min-zoom gated so it never tiles globally. */
function NavAidsRaster({ enabled, zoom }: { enabled: boolean; zoom: number | null }) {
  const { map } = useMap();
  // Only paint when the layer is ON *and* we're zoomed in enough — the gate that stops a
  // global tile fetch. Below the gate the layer stays "none" even if toggled on.
  const visible = enabled && zoom != null && zoom >= NAVAID_MIN_ZOOM;

  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource("psa-nav-seamark")) {
          map.addSource("psa-nav-seamark", { type: "raster", tiles: [SEAMARK_TILES], tileSize: 256, minzoom: NAVAID_MIN_ZOOM, maxzoom: 18 } as any);
          map.addLayer({ id: "psa-nav-seamark", type: "raster", source: "psa-nav-seamark", minzoom: NAVAID_MIN_ZOOM, layout: { visibility: visible ? "visible" : "none" } });
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        if (map.getLayer("psa-nav-seamark")) map.removeLayer("psa-nav-seamark");
        if (map.getSource("psa-nav-seamark")) map.removeSource("psa-nav-seamark");
      } catch { /* tearing down */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    try { if (map?.getLayer("psa-nav-seamark")) map.setLayoutProperty("psa-nav-seamark", "visibility", visible ? "visible" : "none"); } catch { /* */ }
  }, [map, visible]);

  return null;
}

/** depthContours (raster) — NOAA ENC chart export, min-zoom gated, as a depth-emphasis overlay. */
function DepthChartRaster({ enabled, zoom }: { enabled: boolean; zoom: number | null }) {
  const { map } = useMap();
  const visible = enabled && zoom != null && zoom >= DEPTH_MIN_ZOOM;

  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource("psa-depth-enc")) {
          map.addSource("psa-depth-enc", { type: "raster", tiles: [NOAA_ENC_EXPORT], tileSize: 256, minzoom: DEPTH_MIN_ZOOM, maxzoom: 18 } as any);
          map.addLayer({ id: "psa-depth-enc", type: "raster", source: "psa-depth-enc", minzoom: DEPTH_MIN_ZOOM, layout: { visibility: visible ? "visible" : "none" }, paint: { "raster-opacity": 0.8 } });
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        if (map.getLayer("psa-depth-enc")) map.removeLayer("psa-depth-enc");
        if (map.getSource("psa-depth-enc")) map.removeSource("psa-depth-enc");
      } catch { /* tearing down */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    try { if (map?.getLayer("psa-depth-enc")) map.setLayoutProperty("psa-depth-enc", "visibility", visible ? "visible" : "none"); } catch { /* */ }
  }, [map, visible]);

  return null;
}

/** depthContours (vector) — ENC maintained-channel depth polygons → contour lines + soundings,
 * with US-customary (feet / fathoms) labels. Viewport-bbox fetch; clears when off / below gate. */
function DepthContoursVector({ enabled, view }: { enabled: boolean; view: { b: Bounds; zoom: number } | null }) {
  const { map } = useMap();

  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource("psa-depth-soundings")) {
          map.addSource("psa-depth-soundings", { type: "geojson", data: EMPTY as any });
          // depth-contour outline (the boat-nav "Garmin" contour line)
          map.addLayer({
            id: "psa-depth-soundings-line",
            type: "line",
            source: "psa-depth-soundings",
            filter: ["==", ["geometry-type"], "Polygon"],
            layout: { visibility: enabled ? "visible" : "none" },
            paint: { "line-color": "#7dd3fc", "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 12, 1.4], "line-opacity": 0.7 },
          } as any);
          // sounding-style depth labels in US customary units (ft / fathoms)
          map.addLayer({
            id: "psa-depth-soundings-label",
            type: "symbol",
            source: "psa-depth-soundings",
            filter: ["==", ["geometry-type"], "Polygon"],
            minzoom: 9,
            layout: {
              visibility: enabled ? "visible" : "none",
              "symbol-placement": "line",
              "text-field": ["coalesce", ["get", "depthLabel"], ""],
              "text-size": 9,
              "text-font": ["Open Sans Bold"],
              "symbol-spacing": 220,
            } as any,
            paint: { "text-color": "#bae6fd", "text-halo-color": "#04221a", "text-halo-width": 1.2 },
          } as any);
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        ["psa-depth-soundings-label", "psa-depth-soundings-line"].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
        if (map.getSource("psa-depth-soundings")) map.removeSource("psa-depth-soundings");
      } catch { /* tearing down */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // visibility follows the toggle
  useEffect(() => {
    try {
      ["psa-depth-soundings-line", "psa-depth-soundings-label"].forEach((id) => {
        if (map?.getLayer(id)) map.setLayoutProperty(id, "visibility", enabled ? "visible" : "none");
      });
    } catch { /* */ }
  }, [map, enabled]);

  // viewport bbox fetch (ENC channel depth polygons); gate at DEPTH_MIN_ZOOM so it never goes global
  const url =
    enabled && view && view.zoom >= DEPTH_MIN_ZOOM
      ? `/api/crep/ocean/channels?bbox=${f4(view.b.w)},${f4(view.b.s)},${f4(view.b.e)},${f4(view.b.n)}`
      : null;
  const { data } = useSWR(url, fetcher, { refreshInterval: 3600000, revalidateOnFocus: false, keepPreviousData: true });

  useEffect(() => {
    const src = map?.getSource("psa-depth-soundings") as { setData?: (d: any) => void } | undefined;
    if (!src?.setData) return;
    if (!url) { try { src.setData(EMPTY); } catch { /* */ } return; } // off / below gate → clear
    if (!isFC(data)) return;
    try {
      // Tag each polygon with a US-customary depth label (ft / fathoms) read from common ENC fields.
      const feats = (data.features || []).map((ft: any) => {
        const p = ft?.properties || {};
        const meters = Number(p.depth ?? p.DRVAL1 ?? p.drval1 ?? p.minDepth ?? p.depthMeters);
        let depthLabel = "";
        if (Number.isFinite(meters)) {
          const ft_ = Math.round(meters * M_TO_FT);
          const fath = (meters * M_TO_FATH).toFixed(1);
          depthLabel = `${ft_} ft / ${fath} fm`;
        }
        return { ...ft, properties: { ...p, depthLabel } };
      });
      src.setData(fc(feats));
    } catch { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, data, url]);

  return null;
}

export function MaritimeNavLayers({ layers }: { layers: LayerState }) {
  const { map } = useMap();
  const [view, setView] = useState<{ b: Bounds; zoom: number } | null>(null);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      try {
        const b = map.getBounds();
        setView({ b: { n: b.getNorth(), s: b.getSouth(), e: b.getEast(), w: b.getWest() }, zoom: map.getZoom() });
      } catch { /* */ }
    };
    update();
    map.on("moveend", update);
    return () => { try { map.off("moveend", update); } catch { /* */ } };
  }, [map]);

  const zoom = view ? view.zoom : null;

  return (
    <>
      <NavAidsRaster enabled={!!layers.navaids} zoom={zoom} />
      <DepthChartRaster enabled={!!layers.depthContours} zoom={zoom} />
      <DepthContoursVector enabled={!!layers.depthContours} view={view} />
    </>
  );
}

export default MaritimeNavLayers;
