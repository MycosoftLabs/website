"use client";

/**
 * OceanLayers — isolated, viewport-culled maritime data layers for the buoy GCS.
 *
 * Every layer is one config: a viewport-bbox URL into an existing Earth-Sim BFF endpoint
 * (no CREP engine, no MYCA/CREP providers), a parse → GeoJSON, and MapLibre layer specs.
 * Rules that satisfy "must never slow the app / off-screen never rendered":
 *   - fetch ONLY when the layer's filter toggle is ON,
 *   - fetch ONLY the current viewport (bbox refetch on moveend), capped feature counts,
 *   - zoom-gate heavy layers (cell towers ≥ z9, AIS ≥ z5) so they never choke,
 *   - clear the source the moment a layer is toggled off or panned below its min zoom.
 * Raster basemap/charts are already viewport-culled by MapLibre; this covers the vectors.
 */

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useMap } from "@/components/ui/map";
import type { LayerKey, LayerState } from "./MapFiltersPanel";
import { runWhenStyleReady } from "@/lib/psathyrella/mapReady";

const fetcher = (u: string) => fetch(u, { headers: { accept: "application/json" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const EMPTY = { type: "FeatureCollection", features: [] as unknown[] };

interface Bounds { n: number; s: number; e: number; w: number }
interface LayerCfg {
  key: LayerKey;
  sourceId: string;
  refreshMs: number;
  url: (b: Bounds, zoom: number) => string | null; // null = skip (disabled / below min zoom)
  parse: (json: any) => any;
  layers: any[]; // MapLibre layer specs (id + type + paint/layout/filter); source filled by engine
}

// ── GeoJSON helpers ──────────────────────────────────────────────────────────
const fc = (features: any[]) => ({ type: "FeatureCollection", features: features.filter(Boolean) });
const pt = (lon: any, lat: any, properties: any) => {
  const x = Number(lon), y = Number(lat);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { type: "Feature", geometry: { type: "Point", coordinates: [x, y] }, properties };
};
const isFC = (j: any) => j && j.type === "FeatureCollection" && Array.isArray(j.features);
const closeRing = (ring: number[][]) => {
  const r = ring.slice();
  const a = r[0], b = r[r.length - 1];
  if (a && b && (a[0] !== b[0] || a[1] !== b[1])) r.push(a);
  return r;
};
const f4 = (n: number) => n.toFixed(4);

// ── Layer catalog — all keyless or graceful (server holds keys) ──────────────
const CONFIGS: LayerCfg[] = [
  // River + tide + buoy + AQI gauges, one bbox call (viewport-sensors aggregator)
  {
    key: "gauges", sourceId: "psa-gauges", refreshMs: 120000,
    url: (b) => `/api/crep/viewport-sensors?bbox=${f4(b.w)},${f4(b.s)},${f4(b.e)},${f4(b.n)}&limit=16`,
    parse: (j) => fc((j?.sensors || []).map((s: any) => pt(s.lng, s.lat, { kind: s.kind, name: s.name, value: s?.live?.value, unit: s?.live?.unit, parameter: s?.live?.parameter }))),
    layers: [
      { id: "psa-gauges-dot", type: "circle", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 10, 6], "circle-color": ["match", ["get", "kind"], "tide", "#22d3ee", "buoy", "#38bdf8", "streamflow", "#34d399", "river-flow", "#2dd4bf", "aqi", "#f59e0b", "h2s", "#ef4444", "#94a3b8"], "circle-stroke-width": 1, "circle-stroke-color": "#04070e" } },
    ],
  },
  // NOAA CO-OPS current predictions (already GeoJSON, velocity in knots)
  {
    key: "currents", sourceId: "psa-currents", refreshMs: 300000,
    url: () => "/api/crep/ocean/currents",
    parse: (j) => (isFC(j) ? j : fc([])),
    layers: [
      { id: "psa-currents-dot", type: "circle", paint: { "circle-radius": 5, "circle-color": ["match", ["get", "phase"], "flood", "#22d3ee", "ebb", "#f59e0b", "#38bdf8"], "circle-opacity": 0.8, "circle-stroke-width": 1, "circle-stroke-color": "#04070e" } },
    ],
  },
  // OBIS marine-life occurrences (bbox)
  {
    key: "marineLife", sourceId: "psa-life", refreshMs: 300000,
    url: (b) => `/api/oei/obis?north=${f4(b.n)}&south=${f4(b.s)}&east=${f4(b.e)}&west=${f4(b.w)}&size=200`,
    parse: (j) => fc((j?.entities || []).slice(0, 300).map((e: any) => pt(e?.location?.longitude, e?.location?.latitude, { name: e?.name, sci: e?.properties?.scientificName, rel: e?.provenance?.reliability }))),
    layers: [
      { id: "psa-life-dot", type: "circle", paint: { "circle-radius": 3.5, "circle-color": "#34d399", "circle-opacity": 0.75, "circle-stroke-width": 0.5, "circle-stroke-color": "#04221a" } },
    ],
  },
  // NOAA ENC maintained-channel depth polygons (Garmin-style depth/soundings, bbox)
  {
    key: "channels", sourceId: "psa-channels", refreshMs: 3600000,
    url: (b) => `/api/crep/ocean/channels?bbox=${f4(b.w)},${f4(b.s)},${f4(b.e)},${f4(b.n)}`,
    parse: (j) => (isFC(j) ? j : fc([])),
    layers: [
      { id: "psa-channels-fill", type: "fill", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#0ea5e9", "fill-opacity": 0.16 } },
      { id: "psa-channels-line", type: "line", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": "#38bdf8", "line-width": 0.8, "line-opacity": 0.6 } },
    ],
  },
  // Submarine cables — the /api/oei BFF returns empty geometry and the upstream geojson is
  // CORS-blocked, so use the bundled same-origin TeleGeography geojson (710 MultiLineStrings).
  {
    key: "cables", sourceId: "psa-cables", refreshMs: 86400000,
    url: () => "/data/crep/submarine-cables.geojson",
    parse: (j) => (isFC(j) ? j : fc([])),
    layers: [
      { id: "psa-cables-line", type: "line", paint: { "line-color": ["coalesce", ["get", "color"], "#67e8f9"], "line-width": 1, "line-opacity": 0.5 } },
    ],
  },
  // Cell towers (bbox REQUIRED, zoom-gated so they never choke)
  {
    key: "cell", sourceId: "psa-cell", refreshMs: 600000,
    url: (b, z) => (z < 9 ? null : `/api/oei/cell-towers-global?bbox=${f4(b.w)},${f4(b.s)},${f4(b.e)},${f4(b.n)}&limit=4000`),
    parse: (j) => fc((j?.towers || []).slice(0, 4000).map((t: any) => pt(t.lon ?? t.lng, t.lat, { radio: t.radio, mcc: t.mcc }))),
    layers: [
      { id: "psa-cell-dot", type: "circle", paint: { "circle-radius": 2.5, "circle-color": ["match", ["get", "radio"], "NR", "#a78bfa", "LTE", "#38bdf8", "UMTS", "#fbbf24", "GSM", "#94a3b8", "#64748b"], "circle-opacity": 0.7 } },
    ],
  },
  // AIS vessels (bbox, graceful — server holds the key; empty without it, never 401)
  {
    key: "ais", sourceId: "psa-ais", refreshMs: 30000,
    url: (b, z) => (z < 5 ? null : `/api/oei/aisstream?lamin=${f4(b.s)}&lamax=${f4(b.n)}&lomin=${f4(b.w)}&lomax=${f4(b.e)}&limit=2000`),
    parse: (j) => fc((j?.vessels || []).slice(0, 2000).map((v: any) => pt(v.lng, v.lat, { mmsi: v.mmsi, name: v.name ?? v.shipName }))),
    layers: [
      { id: "psa-ais-dot", type: "circle", paint: { "circle-radius": 3, "circle-color": "#fb923c", "circle-stroke-width": 0.5, "circle-stroke-color": "#04070e" } },
    ],
  },
  // US military / Navy installation outlines (bbox; naval bases highlighted red)
  {
    key: "bases", sourceId: "psa-bases", refreshMs: 3600000,
    url: (b) => `/api/oei/military?south=${f4(b.s)}&north=${f4(b.n)}&west=${f4(b.w)}&east=${f4(b.e)}&limit=2000`,
    parse: (j) => fc((j?.facilities || []).map((f: any) => {
      const navy = /nav(y|al)/i.test(`${f.type || ""} ${f.name || ""} ${f.operator || ""}`);
      const { polygon: _poly, ...baseRest } = f; // drop the heavy ring from the per-feature snapshot
      const props = { name: f.name, type: f.type, operator: f.operator, navy, __full: JSON.stringify(baseRest) };
      if (Array.isArray(f.polygon) && f.polygon.length > 2) {
        return { type: "Feature", geometry: { type: "Polygon", coordinates: [closeRing(f.polygon)] }, properties: props };
      }
      return pt(f.lng, f.lat, props);
    })),
    layers: [
      { id: "psa-bases-fill", type: "fill", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": ["case", ["get", "navy"], "#ef4444", "#f59e0b"], "fill-opacity": 0.12 } },
      { id: "psa-bases-line", type: "line", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": ["case", ["get", "navy"], "#ef4444", "#f59e0b"], "line-width": 1.5 } },
      { id: "psa-bases-dot", type: "circle", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 4, "circle-color": ["case", ["get", "navy"], "#ef4444", "#f59e0b"], "circle-stroke-width": 1, "circle-stroke-color": "#04070e" } },
    ],
  },
  // Severe storm / tornado warning polygons (national, ~60s)
  {
    key: "events", sourceId: "psa-events", refreshMs: 60000,
    url: () => "/api/crep/storm-cells",
    parse: (j) => fc((j?.cells || []).filter((c: any) => Array.isArray(c?.polygon) && c.polygon.length > 2).map((c: any) => ({ type: "Feature", geometry: { type: "Polygon", coordinates: [closeRing(c.polygon)] }, properties: { event: c.event, severity: c.severity } }))),
    layers: [
      { id: "psa-events-fill", type: "fill", paint: { "fill-color": "#ef4444", "fill-opacity": 0.12 } },
      { id: "psa-events-line", type: "line", paint: { "line-color": "#ef4444", "line-width": 1.5, "line-dasharray": [2, 1] } },
    ],
  },
  // Project Oyster — Tijuana/SD contamination plume (fixed region)
  {
    key: "oyster", sourceId: "psa-oyster", refreshMs: 600000,
    url: () => "/api/crep/oyster/plume",
    parse: (j) => {
      const fts: any[] = [];
      if (j?.outer?.coordinates) fts.push({ type: "Feature", geometry: j.outer, properties: { kind: "outer" } });
      if (j?.core?.coordinates) fts.push({ type: "Feature", geometry: j.core, properties: { kind: "core" } });
      return fc(fts);
    },
    layers: [
      { id: "psa-oyster-fill", type: "fill", paint: { "fill-color": ["match", ["get", "kind"], "core", "#a16207", "#ca8a04"], "fill-opacity": ["match", ["get", "kind"], "core", 0.35, 0.15] } },
      { id: "psa-oyster-line", type: "line", paint: { "line-color": "#eab308", "line-width": 1 } },
    ],
  },
];

function FeatureLayer({ cfg, enabled, view }: { cfg: LayerCfg; enabled: boolean; view: { b: Bounds; zoom: number } | null }) {
  const { map } = useMap();

  // add source + layers once
  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource(cfg.sourceId)) {
          map.addSource(cfg.sourceId, { type: "geojson", data: EMPTY as any });
          cfg.layers.forEach((l) => {
            if (!map.getLayer(l.id)) map.addLayer({ ...l, source: cfg.sourceId, layout: { ...(l.layout || {}), visibility: enabled ? "visible" : "none" } });
          });
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        cfg.layers.forEach((l) => { if (map.getLayer(l.id)) map.removeLayer(l.id); });
        if (map.getSource(cfg.sourceId)) map.removeSource(cfg.sourceId);
      } catch { /* tearing down */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // visibility follows the toggle
  useEffect(() => {
    try { cfg.layers.forEach((l) => { if (map?.getLayer(l.id)) map.setLayoutProperty(l.id, "visibility", enabled ? "visible" : "none"); }); } catch { /* */ }
  }, [map, enabled]);

  // viewport fetch — only when enabled + (if bbox) within zoom gate
  const url = enabled && view ? cfg.url(view.b, view.zoom) : null;
  const { data } = useSWR(url, fetcher, { refreshInterval: cfg.refreshMs, revalidateOnFocus: false, keepPreviousData: true });
  useEffect(() => {
    const src = map?.getSource(cfg.sourceId) as { setData?: (d: any) => void } | undefined;
    if (!src?.setData) return;
    if (!url) { src.setData(EMPTY); return; } // disabled / below min zoom → clear
    if (data) { try { src.setData(cfg.parse(data)); } catch { /* */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, data, url]);

  return null;
}

export function OceanLayers({ layers }: { layers: LayerState }) {
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

  return (
    <>
      {CONFIGS.map((cfg) => (
        <FeatureLayer key={cfg.key} cfg={cfg} enabled={!!layers[cfg.key]} view={view} />
      ))}
    </>
  );
}
