"use client";

/**
 * MAP view — ISOLATED MapLibre globe (NOT the CREP engine). Satellite imagery basemap +
 * the buoy's own ocean/device layers + waypoints. Top-left = dynamic MYCA analysis widget,
 * top-right = collapsible ocean-ops filters. No CREP/MYCA providers, no NatureOS pipeline.
 */

import { memo, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Crosshair, Trash2, Navigation2 } from "lucide-react";
import { Map, MapControls, useMap } from "@/components/ui/map";
import { cn } from "@/lib/utils";
import { classifyDevice, CONTACT_COLOR, type BuoyTelemetry, type DeviceCategory, type MapAsset, type MapAssetHover, type SelectedDevice, type SensorContact, type Waypoint } from "@/lib/psathyrella/contract";
import { type LayerState } from "./MapFiltersPanel";
import { OceanLayers } from "./OceanLayers";
import { FieldLayers } from "./FieldLayers";
import { MaritimeNavLayers } from "./MaritimeNavLayers";
import { MeshLayer } from "./MeshLayer";
import { GhostTrackLayer } from "./GhostTrackLayer";
import { runWhenStyleReady } from "@/lib/psathyrella/mapReady";
import { isMapViewActive } from "@/lib/psathyrella/viewState";

const fetcher = (u: string) => fetch(u, { headers: { accept: "application/json" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const EMPTY_FC = { type: "FeatureCollection", features: [] as unknown[] };

// ── Universal asset interactivity (Earth-Sim parity) ─────────────────────────────────────────
// Priority-ordered allowlist of asset layer ids → how to label/detail each in the hover + detail
// cards. ONE delegated click/hover handler (AssetInteractions) queries these so EVERY asset is
// selectable with an info card. Point/specific layers rank ABOVE big polygons/lines so the
// foreground asset wins an overlapping click. Raster/chart/field layers are intentionally absent.
type AssetCfg = { kind: string; label: (p: any) => string; detail: (p: any) => string[] };
const astr = (v: any) => (v == null ? "" : String(v));
const ASSET_LAYERS: { id: string; cfg: AssetCfg }[] = [
  { id: "psa-peer-nodes-dot", cfg: { kind: "Peer buoy", label: (p) => astr(p.name) || astr(p.id) || "Peer", detail: (p) => [astr(p.role), p.online === false || p.online === "false" ? "standby" : "online"] } },
  { id: "psa-devices", cfg: { kind: "Mycosoft device", label: (p) => astr(p.name) || "Device", detail: (p) => [astr(p.category), p.online === false || p.online === "false" ? "offline" : "online"] } },
  { id: "psa-radar-ct-dot", cfg: { kind: "Radar contact", label: (p) => astr(p.label) || "Contact", detail: (p) => [astr(p.kind), p.strength != null ? `strength ${Math.round(Number(p.strength) * 100)}%` : ""] } },
  { id: "psa-lidar-ct-dot", cfg: { kind: "Lidar return", label: (p) => astr(p.label) || "Return", detail: (p) => [astr(p.kind), p.strength != null ? `strength ${Math.round(Number(p.strength) * 100)}%` : ""] } },
  { id: "psa-ndbc", cfg: { kind: "NOAA ocean buoy", label: (p) => `NDBC ${astr(p.name)}`, detail: (p) => [p.waveHeight != null ? `wave ${p.waveHeight} m` : "", p.waterTemp != null ? `water ${p.waterTemp}°C` : ""] } },
  { id: "psa-gauges-dot", cfg: { kind: "Gauge", label: (p) => astr(p.name) || "Gauge", detail: (p) => [astr(p.parameter), p.value != null ? `${p.value} ${astr(p.unit)}`.trim() : ""] } },
  { id: "psa-currents-dot", cfg: { kind: "Ocean current", label: (p) => astr(p.name) || "Current station", detail: (p) => [astr(p.phase)] } },
  { id: "psa-life-dot", cfg: { kind: "Marine life", label: (p) => astr(p.name) || astr(p.sci) || "Occurrence", detail: (p) => [astr(p.sci)] } },
  { id: "psa-ais-dot", cfg: { kind: "Vessel (AIS)", label: (p) => astr(p.name) || astr(p.mmsi) || "Vessel", detail: (p) => [p.mmsi ? `MMSI ${astr(p.mmsi)}` : ""] } },
  { id: "psa-cell-dot", cfg: { kind: "Cell tower", label: (p) => `${astr(p.radio) || "Cell"} tower`, detail: (p) => [astr(p.radio), p.mcc ? `MCC ${astr(p.mcc)}` : ""] } },
  { id: "psa-bases-dot", cfg: { kind: "Military / Navy base", label: (p) => astr(p.name) || "Installation", detail: (p) => [astr(p.type), astr(p.operator)] } },
  { id: "psa-bases-fill", cfg: { kind: "Military / Navy base", label: (p) => astr(p.name) || "Installation", detail: (p) => [astr(p.type), astr(p.operator)] } },
  { id: "psa-events-fill", cfg: { kind: "Marine hazard", label: (p) => astr(p.event) || "Hazard", detail: (p) => [astr(p.severity)] } },
  { id: "psa-oyster-fill", cfg: { kind: "Project Oyster plume", label: () => "Contamination plume", detail: (p) => [astr(p.kind) === "core" ? "core plume" : "outer plume"] } },
  { id: "psa-channels-fill", cfg: { kind: "Maintained channel", label: () => "Navigation channel", detail: (p) => [p.depth != null ? `depth ${p.depth}` : astr(p.DRVAL1)] } },
  { id: "psa-depth-soundings-line", cfg: { kind: "Charted depth", label: () => "Sounding", detail: (p) => [astr(p.depthLabel)] } },
  { id: "psa-cables-line", cfg: { kind: "Submarine cable", label: (p) => astr(p.name) || "Cable", detail: (p) => [astr(p.landing)] } },
  { id: "psa-mesh-links-line", cfg: { kind: "LoRa mesh link", label: () => "Mesh link", detail: (p) => [p.active ? "active" : "idle"] } },
];
const ASSET_CFG: Record<string, AssetCfg> = Object.fromEntries(ASSET_LAYERS.map((a) => [a.id, a.cfg]));
// Priority rank: the self-buoy wins (-1), then config order. Lower = wins an overlapping pick.
const ASSET_RANK: Record<string, number> = { "psa-buoy-dot": -1, ...Object.fromEntries(ASSET_LAYERS.map((a, i) => [a.id, i])) };
const ASSET_LAYER_IDS: string[] = ["psa-buoy-dot", ...ASSET_LAYERS.map((a) => a.id)];
// HOVER runs on every (throttled) mousemove, so it must NOT queryRenderedFeatures the heavy
// fill/line geometry — querying the 710-multiline submarine cables or the 146 base polygons each
// frame janks/freezes the main thread on weaker GPUs (iPad), the same reason Earth-Sim excludes
// mil perimeters from its frequent pick. Hover queries POINT/dot layers ONLY; CLICK (one-off,
// affordable) queries the full ASSET_LAYER_IDS incl. polygons/lines — so every asset stays
// selectable, while only points get a cursor-follow tooltip.
const HOVER_LAYER_IDS: string[] = [
  "psa-buoy-dot", "psa-peer-nodes-dot", "psa-devices", "psa-radar-ct-dot", "psa-lidar-ct-dot",
  "psa-ndbc", "psa-gauges-dot", "psa-currents-dot", "psa-life-dot", "psa-ais-dot", "psa-cell-dot", "psa-bases-dot",
];

// Maritime basemap — the "topology / bathymetry / satellite split" from Earth Sim, ported
// ISOLATED (keyless rasters inline in the style, no CREP engine). Bottom→top:
//   1. dark background
//   2. ocean DEPTH (Esri World Ocean Base — GEBCO foundation bathymetry)
//   3. land RELIEF (terrarium DEM hillshade; terrarium also encodes seafloor depth)
//   4. realistic SATELLITE imagery (Esri World Imagery, z19) at partial opacity so depth/
//      relief read through — meter-accurate coastline comes from the imagery itself.
// All raster/DEM tiles are viewport-culled by MapLibre automatically (only visible tiles load).
const SAT_STYLE: any = {
  version: 8,
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  // NOTE: a `raster-dem` (terrarium hillshade) was here but it needs CORS pixel access;
  // when it can't load, MapLibre's style.loaded() stays false forever and the base <Map>
  // never renders its children → NO data layers. Satellite imagery already shows terrain,
  // so we keep satellite + bathymetry only. Re-add relief later via a CORS-safe DEM.
  sources: {
    esriOcean: { type: "raster", tiles: ["https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 13 },
    esriSat: { type: "raster", tiles: ["https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 19 },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#04070e" } },
    { id: "bathymetry", type: "raster", source: "esriOcean", paint: { "raster-opacity": 0.9 } },
    { id: "esriSat", type: "raster", source: "esriSat", paint: { "raster-opacity": 0.92 } },
  ],
};

// Stable style object identity — passing a fresh {dark,light} each render makes the base
// Map re-run its style memo; a module constant keeps the MapLibre style untouched.
const MAP_STYLES = { dark: SAT_STYLE, light: SAT_STYLE };

// Toggleable Navy-grade chart overlays (keyless rasters, viewport-culled). NOAA ENC charts
// carry authoritative coastline + depth contours/soundings + channels (the "Garmin boat
// nav" layer); OpenSeaMap seamarks carry buoys/beacons/lights. Added below the device
// markers so contacts always stay on top.
// NOAA charts: the WMTS REST tile path 400s, but the ArcGIS MapServer export endpoint
// serves the seamless chart and MapLibre fills the {bbox-epsg-3857} WMS token per tile.
const CHART_SOURCES = {
  noaaCharts: "https://gis.charttools.noaa.gov/arcgis/rest/services/MarineChart_Services/NOAACharts/MapServer/export?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png&transparent=true&f=image",
  seamarks: "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
  // Earth-Sim Nature layer: mycorrhizal-fungi raster (same-origin, live)
  fungalEcm: "/api/crep/fungal-atlas/tiles/ecm/{z}/{x}/{y}.png?v=2026-05-24-global-ecm-am-raster-v9-green-am",
  fungalAm: "/api/crep/fungal-atlas/tiles/am/{z}/{x}/{y}.png?v=2026-05-24-global-ecm-am-raster-v9-green-am",
} as const;

function toDeviceFC(data: any) {
  const rows: any[] = Array.isArray(data?.devices) ? data.devices : [];
  return {
    type: "FeatureCollection",
    features: rows
      .map((d) => {
        const idLc = String(d?.id || "").toLowerCase();
        // The primary buoy is drawn by BuoyLayers + the COM4 board is the same node — don't double-plot.
        if (idLc.includes("psathyrella") || idLc === "mycobrain-com4") return null;
        const lat = Number(d?.location?.lat);
        const lon = Number(d?.location?.lon ?? d?.location?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        const category = classifyDevice(d);
        const online = !String(d?.status || d?.telemetry?.status || "").toLowerCase().match(/offline|stale/);
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lon, lat] },
          properties: { id: String(d?.id || d?.name || "device"), name: d?.name || d?.id, kind: "device", category, online, __full: JSON.stringify(d) },
        };
      })
      .filter(Boolean),
  };
}

function toBuoyFC(data: any) {
  const rows: any[] = Array.isArray(data?.buoys) ? data.buoys : [];
  return {
    type: "FeatureCollection",
    features: rows
      .map((b) => {
        const lat = Number(b?.lat);
        const lon = Number(b?.lng ?? b?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { name: b?.station_id || b?.id, waveHeight: b?.wave_height, waterTemp: b?.water_temp } };
      })
      .filter(Boolean),
  };
}

/** Keyless nautical-chart raster overlays (NOAA ENC + OpenSeaMap seamarks), toggled by the
 * filter panel. Raster = MapLibre viewport-culls automatically; sits above the basemap and
 * below the device/buoy markers (mounted first inside <Map>). */
function ChartOverlays({ layers }: { layers: LayerState }) {
  const { map } = useMap();
  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource("psa-noaa")) {
          map.addSource("psa-noaa", { type: "raster", tiles: [CHART_SOURCES.noaaCharts], tileSize: 256, maxzoom: 18 } as any);
          map.addLayer({ id: "psa-noaa", type: "raster", source: "psa-noaa", layout: { visibility: layers.noaaCharts ? "visible" : "none" }, paint: { "raster-opacity": 0.85 } });
        }
        if (!map.getSource("psa-seamark")) {
          map.addSource("psa-seamark", { type: "raster", tiles: [CHART_SOURCES.seamarks], tileSize: 256, maxzoom: 18 } as any);
          map.addLayer({ id: "psa-seamark", type: "raster", source: "psa-seamark", layout: { visibility: layers.seamarks ? "visible" : "none" } });
        }
        if (!map.getSource("psa-fungal-ecm")) {
          map.addSource("psa-fungal-ecm", { type: "raster", tiles: [CHART_SOURCES.fungalEcm], tileSize: 256, maxzoom: 9 } as any);
          map.addLayer({ id: "psa-fungal-ecm", type: "raster", source: "psa-fungal-ecm", layout: { visibility: layers.fungalEcm ? "visible" : "none" }, paint: { "raster-opacity": 0.7 } });
        }
        if (!map.getSource("psa-fungal-am")) {
          map.addSource("psa-fungal-am", { type: "raster", tiles: [CHART_SOURCES.fungalAm], tileSize: 256, maxzoom: 9 } as any);
          map.addLayer({ id: "psa-fungal-am", type: "raster", source: "psa-fungal-am", layout: { visibility: layers.fungalAm ? "visible" : "none" }, paint: { "raster-opacity": 0.7 } });
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        ["psa-noaa", "psa-seamark", "psa-fungal-ecm", "psa-fungal-am"].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); });
      } catch { /* tearing down */ }
    };
  }, [map]);

  useEffect(() => {
    try { if (map?.getLayer("psa-noaa")) map.setLayoutProperty("psa-noaa", "visibility", layers.noaaCharts ? "visible" : "none"); } catch { /* */ }
  }, [map, layers.noaaCharts]);
  useEffect(() => {
    try { if (map?.getLayer("psa-seamark")) map.setLayoutProperty("psa-seamark", "visibility", layers.seamarks ? "visible" : "none"); } catch { /* */ }
  }, [map, layers.seamarks]);
  useEffect(() => {
    try { if (map?.getLayer("psa-fungal-ecm")) map.setLayoutProperty("psa-fungal-ecm", "visibility", layers.fungalEcm ? "visible" : "none"); } catch { /* */ }
  }, [map, layers.fungalEcm]);
  useEffect(() => {
    try { if (map?.getLayer("psa-fungal-am")) map.setLayoutProperty("psa-fungal-am", "visibility", layers.fungalAm ? "visible" : "none"); } catch { /* */ }
  }, [map, layers.fungalAm]);

  return null;
}

/** Ocean/device GeoJSON circle layers (add source/layer + setData). */
function OceanDataLayers({ layers }: { layers: LayerState }) {
  const { map } = useMap();
  const { data: devicesData } = useSWR(layers.devices ? "/api/earth-simulator/devices" : null, fetcher, { refreshInterval: 20000, revalidateOnFocus: false });
  const { data: buoysData } = useSWR(layers.ndbc ? "/api/oei/buoys" : null, fetcher, { refreshInterval: 300000, revalidateOnFocus: false });

  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource("psa-ndbc")) {
          map.addSource("psa-ndbc", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({ id: "psa-ndbc", type: "circle", source: "psa-ndbc", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 3.5, 9, 7], "circle-color": "#84cc16", "circle-stroke-width": 1.2, "circle-stroke-color": "#1a2e05", "circle-opacity": 0.9 } });
        }
        if (!map.getSource("psa-devices")) {
          map.addSource("psa-devices", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({ id: "psa-devices", type: "circle", source: "psa-devices", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 10, 11], "circle-color": ["match", ["get", "category"], "land", "#f59e0b", "flying", "#a78bfa", "edge", "#34d399", "aquatic", "#22d3ee", "#e879f9"], "circle-stroke-width": 1.5, "circle-stroke-color": "#0a0f1e", "circle-opacity": 0.92 } });
          map.addLayer({ id: "psa-devices-label", type: "symbol", source: "psa-devices", minzoom: 7, layout: { "text-field": ["get", "name"], "text-size": 9, "text-font": ["Open Sans Bold"], "text-offset": [0, 1.2], "text-anchor": "top", "text-allow-overlap": false } as any, paint: { "text-color": "#e2e8f0", "text-halo-color": "#04070e", "text-halo-width": 1 } });
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);

    return () => {
      try {
        if (map.getLayer("psa-devices-label")) map.removeLayer("psa-devices-label");
        ["psa-devices", "psa-ndbc"].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        });
      } catch { /* tearing down */ }
    };
  }, [map]);

  useEffect(() => {
    (map?.getSource("psa-devices") as { setData?: (d: any) => void } | undefined)?.setData?.(layers.devices ? toDeviceFC(devicesData) : EMPTY_FC);
  }, [map, devicesData, layers.devices]);
  useEffect(() => {
    (map?.getSource("psa-ndbc") as { setData?: (d: any) => void } | undefined)?.setData?.(layers.ndbc ? toBuoyFC(buoysData) : EMPTY_FC);
  }, [map, buoysData, layers.ndbc]);

  return null;
}

function MapInteractions({ navMode, waypoints, onAddWaypoint, onEraseWaypoint }: { navMode: boolean; waypoints: Waypoint[]; onAddWaypoint: (lat: number, lon: number) => void; onEraseWaypoint: (id: string) => void }) {
  const { map } = useMap();
  const wpRef = useRef(waypoints);
  wpRef.current = waypoints;
  const navRef = useRef(navMode);
  navRef.current = navMode;
  useEffect(() => {
    if (!map) return;
    const onClick = (e: any) => {
      if (!navRef.current) return; // SELECTION mode (default) — clicking the map never drops waypoints
      const cand = ASSET_LAYER_IDS.filter((id) => map.getLayer(id));
      const hit = cand.length ? map.queryRenderedFeatures(e.point, { layers: cand }) : [];
      if (hit.length) return; // clicked an asset (any layer), not open water → AssetInteractions selects it
      onAddWaypoint(e.lngLat.lat, e.lngLat.lng);
    };
    const onContext = (e: any) => {
      if (!navRef.current) return;
      e.preventDefault?.();
      let nearest: { id: string; d: number } | null = null;
      for (const wp of wpRef.current) {
        const p = map.project([wp.lon, wp.lat]);
        const d = Math.hypot(p.x - e.point.x, p.y - e.point.y);
        if (d < 22 && (!nearest || d < nearest.d)) nearest = { id: wp.id, d };
      }
      if (nearest) onEraseWaypoint(nearest.id);
    };
    map.on("click", onClick);
    map.on("contextmenu", onContext);
    return () => {
      try { map.off("click", onClick); map.off("contextmenu", onContext); } catch { /* */ }
    };
  }, [map, onAddWaypoint, onEraseWaypoint]);
  return null;
}

/**
 * AssetInteractions — ONE delegated click + hover handler over every asset layer so EVERY asset
 * is selectable with a hover/detail card (Earth-Sim parity). Freeze-safe: registered once per
 * [map] with stable callbacks; all maplibre calls try/caught + layer-existence-filtered; hover/
 * pick state lives in MapZone (OUTSIDE the memoized map), so this never re-renders the map subtree.
 * Replaces OceanDataLayers' old click — keeps the listener count at two (this + nav waypoint).
 */
function AssetInteractions({ onSelect, onPickAsset, onHover }: {
  onSelect: (s: SelectedDevice | null) => void;
  onPickAsset: (a: MapAsset | null) => void;
  onHover: (h: MapAssetHover | null) => void;
}) {
  const { map } = useMap();
  const lastMoveRef = useRef(0);
  const hoveringRef = useRef(false);
  useEffect(() => {
    if (!map) return;
    const pick = (point: any, ids: string[]) => {
      const cand = ids.filter((id) => map.getLayer(id));
      if (!cand.length) return null;
      let feats: any[] = [];
      try { feats = map.queryRenderedFeatures(point, { layers: cand }); } catch { return null; }
      let best: any = null, bestRank = Infinity;
      for (const f of feats) { const r = ASSET_RANK[f.layer.id]; if (r != null && r < bestRank) { bestRank = r; best = f; } }
      return best;
    };
    const coordsOf = (f: any, e: any): { lat: number | null; lon: number | null } => {
      const g = f.geometry;
      if (g?.type === "Point" && Array.isArray(g.coordinates)) {
        const lon = Number(g.coordinates[0]), lat = Number(g.coordinates[1]);
        if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
      }
      return { lat: e.lngLat.lat, lon: e.lngLat.lng };
    };
    const onClick = (e: any) => {
      const f = pick(e.point, ASSET_LAYER_IDS);
      if (!f) { onPickAsset(null); return; } // click/tap-away on empty water → dismiss any open card
      const id = f.layer.id;
      const p: any = f.properties || {};
      if (id === "psa-buoy-dot") { onSelect(null); onPickAsset(null); return; } // primary buoy → live focus (StatusBar), close any card
      const ll = coordsOf(f, e);
      // Devices open the rich entity widget only (no onSelect → no map-memo recompute = lighter on iPad).
      if (id === "psa-devices") {
        onPickAsset({ id: String(p.id || p.name || "device"), layerId: id, kind: "Mycosoft device", label: String(p.name || "device"), detail: [], lat: ll.lat, lon: ll.lon, raw: { ...p } });
        return;
      }
      // NDBC keeps the legacy SelectedDevice→StatusBar behavior.
      if (id === "psa-ndbc") {
        onSelect({ id: `ndbc-${p.name}`, name: `NDBC ${p.name}`, category: "aquatic", isBuoy: false, online: true, batteryPct: null, rssiDbm: null, peers: null, lat: ll.lat, lon: ll.lon });
        onPickAsset(null);
        return;
      }
      // Every other asset → the dismissable card (military goes to the rich widget via MapZone's router).
      const cfg = ASSET_CFG[id];
      if (!cfg) return;
      onPickAsset({ id: String(p.id || p.mmsi || p.name || id), layerId: id, kind: cfg.kind, label: cfg.label(p), detail: cfg.detail(p).filter(Boolean), lat: ll.lat, lon: ll.lon, raw: { ...p } });
    };
    const onMove = (e: any) => {
      const now = performance.now();
      if (now - lastMoveRef.current < 60) return; // throttle ~16 fps
      lastMoveRef.current = now;
      const f = pick(e.point, HOVER_LAYER_IDS);
      if (!f) {
        if (hoveringRef.current) { hoveringRef.current = false; onHover(null); }
        try { map.getCanvas().style.cursor = ""; } catch { /* */ }
        return;
      }
      const id = f.layer.id;
      const p: any = f.properties || {};
      const cfg = ASSET_CFG[id];
      const ll = coordsOf(f, e);
      const isBuoy = id === "psa-buoy-dot";
      try { map.getCanvas().style.cursor = "pointer"; } catch { /* */ }
      hoveringRef.current = true;
      onHover({
        id: String(p.id || p.name || id),
        layerId: id,
        kind: isBuoy ? "Primary buoy (self)" : cfg ? cfg.kind : "Asset",
        label: isBuoy ? "Psathyrella" : cfg ? cfg.label(p) : id,
        detail: isBuoy ? [] : cfg ? cfg.detail(p).filter(Boolean) : [],
        lat: ll.lat, lon: ll.lon, x: e.point.x, y: e.point.y,
      });
    };
    const onLeave = () => {
      if (hoveringRef.current) { hoveringRef.current = false; onHover(null); }
      try { map.getCanvas().style.cursor = ""; } catch { /* */ }
    };
    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.on("mouseout", onLeave);
    return () => {
      try { map.off("click", onClick); map.off("mousemove", onMove); map.off("mouseout", onLeave); } catch { /* */ }
      onHover(null);
    };
  }, [map, onSelect, onPickAsset, onHover]);
  return null;
}

/** Tracks the map center so the MYCA widget can update as the map moves. */
function MapCenterTracker({ onMove }: { onMove: (c: { lat: number; lon: number }) => void }) {
  const { map } = useMap();
  useEffect(() => {
    if (!map) return;
    const update = () => { const c = map.getCenter(); onMove({ lat: c.lat, lon: c.lng }); };
    update();
    map.on("moveend", update);
    return () => { try { map.off("moveend", update); } catch { /* */ } };
  }, [map, onMove]);
  return null;
}

/** Buoy + waypoints rendered as GeoJSON layers — NO React portals (those crash MapLibre
 * teardown with "removeChild on null"). The buoy point FOLLOWS its live pose via the STABLE
 * telemetryRef on a ~500ms timer (isolation-safe, like SensorContactsLayer) — never via
 * per-poll React re-renders. `lat`/`lon` are only the first-paint seed + waypoint-line origin
 * fallback; `waypoints` stays reactive so the dashed path updates on edit. */
function BuoyLayers({ lat, lon, waypoints, telemetryRef }: { lat: number; lon: number; waypoints: Waypoint[]; telemetryRef: { current: BuoyTelemetry } }) {
  const { map } = useMap();
  // Mutable seed so ensure()'s first paint uses the latest known pose without re-subscribing.
  const seedRef = useRef<[number, number]>([lon, lat]);
  seedRef.current = [lon, lat];
  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource("psa-buoy")) {
          // seed the source WITH the buoy already placed — its setData (immediate primitives)
          // can otherwise fire before the source exists, leaving the buoy unpainted.
          const [slon, slat] = seedRef.current;
          map.addSource("psa-buoy", { type: "geojson", data: { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [slon, slat] }, properties: {} }] } as any });
          // animated pulse ring (radius/opacity driven by the rAF loop below) — "pulsing maritime icon"
          map.addLayer({ id: "psa-buoy-pulse", type: "circle", source: "psa-buoy", paint: { "circle-radius": 12, "circle-color": "#22d3ee", "circle-opacity": 0.35, "circle-stroke-width": 1, "circle-stroke-color": "#22d3ee", "circle-stroke-opacity": 0.5 } });
          map.addLayer({ id: "psa-buoy-halo", type: "circle", source: "psa-buoy", paint: { "circle-radius": 10, "circle-color": "#22d3ee", "circle-opacity": 0.2 } });
          // solid marker — FIXED radius so the buoy is findable at EVERY zoom level
          map.addLayer({ id: "psa-buoy-dot", type: "circle", source: "psa-buoy", paint: { "circle-radius": 7, "circle-color": "#22d3ee", "circle-stroke-width": 2.5, "circle-stroke-color": "#04070e" } });
          map.addLayer({ id: "psa-buoy-label", type: "symbol", source: "psa-buoy", layout: { "text-field": "Psathyrella", "text-size": 10, "text-font": ["Open Sans Bold"], "text-offset": [0, 1.4], "text-anchor": "top", "text-allow-overlap": true } as any, paint: { "text-color": "#67e8f9", "text-halo-color": "#04070e", "text-halo-width": 1.2 } });
        }
        if (!map.getSource("psa-wp")) {
          map.addSource("psa-wp", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({ id: "psa-wp-line", type: "line", source: "psa-wp", filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": "#f59e0b", "line-width": 1.5, "line-dasharray": [2, 2], "line-opacity": 0.6 } });
          map.addLayer({ id: "psa-wp-dot", type: "circle", source: "psa-wp", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 7, "circle-color": "#f59e0b", "circle-stroke-width": 1.5, "circle-stroke-color": "#04070e" } });
          map.addLayer({ id: "psa-wp-label", type: "symbol", source: "psa-wp", filter: ["==", ["geometry-type"], "Point"], layout: { "text-field": ["get", "n"], "text-size": 10, "text-font": ["Open Sans Bold"], "text-allow-overlap": true } as any, paint: { "text-color": "#04070e" } });
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        ["psa-buoy-pulse", "psa-buoy-halo", "psa-buoy-dot", "psa-buoy-label", "psa-wp-line", "psa-wp-dot", "psa-wp-label"].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
        ["psa-buoy", "psa-wp"].forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
      } catch { /* */ }
    };
  }, [map]);

  // Pulse animation for the buoy ring — throttled to ~20fps so it never taxes the frame budget.
  useEffect(() => {
    if (!map) return;
    let raf = 0;
    let last = 0;
    let start = 0;
    const tick = (t: number) => {
      if (document.hidden || !isMapViewActive()) { raf = requestAnimationFrame(tick); return; }
      if (!start) start = t;
      if (t - last >= 50) {
        last = t;
        const phase = ((t - start) % 1600) / 1600;
        try {
          if (map.getLayer("psa-buoy-pulse")) {
            map.setPaintProperty("psa-buoy-pulse", "circle-radius", 11 + phase * 22);
            map.setPaintProperty("psa-buoy-pulse", "circle-opacity", 0.45 * (1 - phase));
          }
        } catch { /* layer mid-teardown */ }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [map]);

  // Buoy FOLLOWS its live pose from the STABLE telemetry ref on a ~500ms timer — NO React
  // re-render (so the map memo + freeze-isolation hold), hidden-tab paused, try/caught. This
  // is what makes the buoy move smoothly WITHOUT recreating the map. We also keep the waypoint
  // line's origin pinned to the live buoy here, so the dashed path tracks the moving buoy.
  const liveLL = useRef<[number, number]>([lon, lat]);
  useEffect(() => {
    if (!map) return;
    let timer: ReturnType<typeof setTimeout> | 0 = 0;
    const paint = () => {
      try {
        const t = telemetryRef.current;
        const plat = t?.pose?.lat;
        const plon = t?.pose?.lon;
        const useLat = typeof plat === "number" ? plat : liveLL.current[1];
        const useLon = typeof plon === "number" ? plon : liveLL.current[0];
        liveLL.current = [useLon, useLat];
        (map.getSource("psa-buoy") as { setData?: (d: any) => void } | undefined)?.setData?.({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [useLon, useLat] }, properties: {} }] });
      } catch { /* layer mid-teardown */ }
    };
    const tick = () => { if (!document.hidden && isMapViewActive()) paint(); timer = setTimeout(tick, 500); };
    paint();
    timer = setTimeout(tick, 500);
    return () => { if (timer) clearTimeout(timer); };
  }, [map, telemetryRef]);

  // Waypoint dashed path + numbered dots. Reactive on waypoints; the line origin uses the
  // last live buoy position tracked above so the path stays anchored to the moving buoy.
  useEffect(() => {
    const [olon, olat] = liveLL.current;
    const pts = waypoints.map((wp, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [wp.lon, wp.lat] }, properties: { n: String(i + 1) } }));
    const line = waypoints.length ? [{ type: "Feature", geometry: { type: "LineString", coordinates: [[olon, olat], ...waypoints.map((w) => [w.lon, w.lat])] }, properties: {} }] : [];
    (map?.getSource("psa-wp") as { setData?: (d: any) => void } | undefined)?.setData?.({ type: "FeatureCollection", features: [...line, ...pts] });
  }, [map, waypoints]);

  return null;
}

/** Amber ring around the currently-selected device (GeoJSON, no portals). */
function SelectionHighlight({ selected }: { selected: SelectedDevice | null }) {
  const { map } = useMap();
  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource("psa-sel")) {
          map.addSource("psa-sel", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({ id: "psa-sel-ring", type: "circle", source: "psa-sel", paint: { "circle-radius": 18, "circle-color": "#fbbf24", "circle-opacity": 0.1, "circle-stroke-width": 2.5, "circle-stroke-color": "#fbbf24", "circle-stroke-opacity": 0.9 } });
        }
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        if (map.getLayer("psa-sel-ring")) map.removeLayer("psa-sel-ring");
        if (map.getSource("psa-sel")) map.removeSource("psa-sel");
      } catch { /* */ }
    };
  }, [map]);

  useEffect(() => {
    const features = selected && selected.lat != null && selected.lon != null
      ? [{ type: "Feature", geometry: { type: "Point", coordinates: [selected.lon, selected.lat] }, properties: {} }]
      : [];
    (map?.getSource("psa-sel") as { setData?: (d: any) => void } | undefined)?.setData?.({ type: "FeatureCollection", features });
  }, [map, selected]);
  return null;
}

/**
 * WebGL context-loss guard. On a 24/7 controller the GPU context is periodically lost (driver
 * reset, VRAM pressure, tab backgrounding). Without preventDefault() the browser kills the
 * context permanently and every subsequent MapLibre paint/setData throws ASYNC (escaping React
 * boundaries) — a freeze vector. preventDefault() lets the browser RESTORE the context instead;
 * on restore we nudge a repaint. Isolated to Psathyrella (attached via useMap, not the shared map).
 */
function MapHealthGuard() {
  const { map } = useMap();
  useEffect(() => {
    if (!map) return;
    let canvas: HTMLCanvasElement | null = null;
    try { canvas = map.getCanvas(); } catch { /* map mid-init */ }
    if (!canvas) return;
    const onLost = (e: Event) => { e.preventDefault(); };
    const onRestored = () => { try { (map as { triggerRepaint?: () => void }).triggerRepaint?.(); } catch { /* */ } };
    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);
    return () => {
      try {
        canvas?.removeEventListener("webglcontextlost", onLost, false);
        canvas?.removeEventListener("webglcontextrestored", onRestored, false);
      } catch { /* */ }
    };
  }, [map]);
  return null;
}

// ── Radar / Lidar contacts ON THE MAP ────────────────────────────────────────
// The buoy's own marine radar (≤4 km) and 360° lidar (≤500 m) returns, geolocated onto the
// map around the buoy: each contact's bearing is bow-relative, so its map position is the
// destination point from the buoy pose at (heading + bearing), distance = rangeM. Plus a
// range ring per sensor. Fed from the STABLE telemetry ref on a 700 ms timer (NO React
// re-render → the map memo + freeze-isolation hold); paused when the tab is hidden.
function destPoint(lat: number, lon: number, bearingDeg: number, distM: number): [number, number] {
  const R = 6371008.8;
  const d = distM / R;
  const br = (bearingDeg * Math.PI) / 180;
  const la1 = (lat * Math.PI) / 180;
  const lo1 = (lon * Math.PI) / 180;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return [(((lo2 * 180) / Math.PI + 540) % 360) - 180, (la2 * 180) / Math.PI];
}
function ringPolygon(lat: number, lon: number, radiusM: number, steps = 72): number[][] {
  const ring: number[][] = [];
  for (let i = 0; i <= steps; i++) ring.push(destPoint(lat, lon, (i * 360) / steps, radiusM));
  return ring;
}
type ScopeKey = "radar" | "lidar";
const SCOPE_META: Record<ScopeKey, { ring: string; defaultRange: number }> = {
  radar: { ring: "#4ade80", defaultRange: 4000 },
  lidar: { ring: "#22d3ee", defaultRange: 500 },
};

function SensorContactsLayer({ telemetryRef, layers }: { telemetryRef: { current: BuoyTelemetry }; layers: LayerState }) {
  const { map } = useMap();
  const radarOn = !!layers.radar;
  const lidarOn = !!layers.lidar;
  // Fresh-toggle ref so the [map]-only ensure() can bake CURRENT visibility into the layers it
  // creates — without this, a layer that's already ON before style-ready is created hidden and
  // the separate visibility effect may not re-flip it (the visibility race).
  const onRef = useRef({ radar: radarOn, lidar: lidarOn });
  onRef.current = { radar: radarOn, lidar: lidarOn };

  // sources + layers, once
  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        (["radar", "lidar"] as ScopeKey[]).forEach((sk) => {
          const meta = SCOPE_META[sk];
          const vis = onRef.current[sk] ? "visible" : "none";
          if (!map.getSource(`psa-${sk}-ring`)) {
            map.addSource(`psa-${sk}-ring`, { type: "geojson", data: EMPTY_FC as any });
            map.addLayer({ id: `psa-${sk}-ring-line`, type: "line", source: `psa-${sk}-ring`, layout: { visibility: vis }, paint: { "line-color": meta.ring, "line-width": 1, "line-opacity": 0.4, "line-dasharray": [3, 3] } });
          }
          if (!map.getSource(`psa-${sk}-ct`)) {
            map.addSource(`psa-${sk}-ct`, { type: "geojson", data: EMPTY_FC as any });
            map.addLayer({ id: `psa-${sk}-ct-glow`, type: "circle", source: `psa-${sk}-ct`, layout: { visibility: vis }, paint: { "circle-radius": ["interpolate", ["linear"], ["get", "strength"], 0, 5, 1, 13], "circle-color": ["get", "color"], "circle-opacity": 0.18, "circle-blur": 0.7 } });
            map.addLayer({ id: `psa-${sk}-ct-dot`, type: "circle", source: `psa-${sk}-ct`, layout: { visibility: vis }, paint: { "circle-radius": ["interpolate", ["linear"], ["get", "strength"], 0, 2.5, 1, 5.5], "circle-color": ["get", "color"], "circle-stroke-width": 1, "circle-stroke-color": "#04070e" } });
            map.addLayer({ id: `psa-${sk}-ct-label`, type: "symbol", source: `psa-${sk}-ct`, layout: { visibility: vis, "text-field": ["coalesce", ["get", "label"], ""], "text-size": 9, "text-font": ["Open Sans Regular"], "text-offset": [0, 1.1], "text-anchor": "top", "text-optional": true } as any, paint: { "text-color": meta.ring, "text-halo-color": "#04070e", "text-halo-width": 1 } });
          }
        });
      } catch { /* style mid-load */ }
    };
    runWhenStyleReady(map, ensure);
    return () => {
      try {
        (["radar", "lidar"] as ScopeKey[]).forEach((sk) => {
          [`psa-${sk}-ring-line`, `psa-${sk}-ct-glow`, `psa-${sk}-ct-dot`, `psa-${sk}-ct-label`].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
          [`psa-${sk}-ring`, `psa-${sk}-ct`].forEach((id) => { if (map.getSource(id)) map.removeSource(id); });
        });
      } catch { /* */ }
    };
  }, [map]);

  // visibility follows toggles
  useEffect(() => {
    const setVis = (sk: ScopeKey, on: boolean) => {
      [`psa-${sk}-ring-line`, `psa-${sk}-ct-glow`, `psa-${sk}-ct-dot`, `psa-${sk}-ct-label`].forEach((id) => {
        try { if (map?.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); } catch { /* */ }
      });
    };
    setVis("radar", radarOn);
    setVis("lidar", lidarOn);
  }, [map, radarOn, lidarOn]);

  // live feed via the stable ref on a timer — NO React re-render, hidden-tab paused, try/caught
  useEffect(() => {
    if (!map || (!radarOn && !lidarOn)) return;
    let timer: ReturnType<typeof setTimeout> | 0 = 0;
    const paint = () => {
      try {
        const t = telemetryRef.current;
        const lat = t?.pose?.lat ?? null;
        const lon = t?.pose?.lon ?? null;
        const heading = t?.pose?.headingDeg ?? 0;
        (["radar", "lidar"] as ScopeKey[]).forEach((sk) => {
          const on = sk === "radar" ? radarOn : lidarOn;
          const frame = t?.[sk];
          const ringSrc = map.getSource(`psa-${sk}-ring`) as { setData?: (d: any) => void } | undefined;
          const ctSrc = map.getSource(`psa-${sk}-ct`) as { setData?: (d: any) => void } | undefined;
          if (!on || lat == null || lon == null) { ringSrc?.setData?.(EMPTY_FC); ctSrc?.setData?.(EMPTY_FC); return; }
          const maxRange = frame?.maxRangeM ?? SCOPE_META[sk].defaultRange;
          ringSrc?.setData?.({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [ringPolygon(lat, lon, maxRange)] }, properties: {} }] });
          const cts = frame?.active ? frame.contacts || [] : [];
          const features = cts.map((c: SensorContact) => {
            const [clon, clat] = destPoint(lat, lon, (heading + c.bearingDeg) % 360, Math.min(c.rangeM, maxRange));
            return { type: "Feature", geometry: { type: "Point", coordinates: [clon, clat] }, properties: { color: CONTACT_COLOR[c.kind] || "#94a3b8", strength: Math.max(0, Math.min(1, c.strength ?? 0.5)), label: c.classifiedAs || c.label || "" } };
          });
          ctSrc?.setData?.({ type: "FeatureCollection", features });
        });
      } catch { /* layer mid-teardown */ }
    };
    const tick = () => { if (!document.hidden && isMapViewActive()) paint(); timer = setTimeout(tick, 700); };
    paint();
    timer = setTimeout(tick, 700);
    return () => { if (timer) clearTimeout(timer); };
  }, [map, radarOn, lidarOn, telemetryRef]);

  return null;
}

/**
 * Isolated map. Receives ONLY primitives + stable callbacks (NEVER the telemetry object),
 * so the 2.5s telemetry polls cannot re-render the MapLibre subtree. Wrapped in React.memo
 * at export; the live MYCA widget + filters live in MapZone OUTSIDE this boundary. This is
 * the "controls 100% separated from the map" guarantee at the React level.
 */
function MapViewInner({
  buoyLat,
  buoyLon,
  layers,
  waypoints,
  selected,
  onSelect,
  onAddWaypoint,
  onEraseWaypoint,
  onClearWaypoints,
  onMoveCenter,
  onHover,
  onPickAsset,
  telemetryRef,
  className,
}: {
  buoyLat: number;
  buoyLon: number;
  layers: LayerState;
  waypoints: Waypoint[];
  selected: SelectedDevice | null;
  onSelect: (s: SelectedDevice | null) => void;
  onAddWaypoint: (lat: number, lon: number) => void;
  onEraseWaypoint: (id: string) => void;
  onClearWaypoints: () => void;
  onMoveCenter: (c: { lat: number; lon: number }) => void;
  onHover: (h: MapAssetHover | null) => void;
  onPickAsset: (a: MapAsset | null) => void;
  telemetryRef: { current: BuoyTelemetry };
  className?: string;
}) {
  // Default = SELECTION (click things on the map, like Earth Sim). Waypoint-dropping only
  // happens in Navigation mode, behind this toggle — never just by clicking the map.
  const [navMode, setNavMode] = useState(false);
  // STABLE initial center captured ONCE on first render. The buoyLat/buoyLon props jitter in
  // SIM mode; if they fed <Map center> the map would re-center/re-init every poll → the
  // "blinking" bug. The buoy instead FOLLOWS its live pose via BuoyLayers' telemetryRef timer.
  const initialCenter = useRef<[number, number]>([buoyLon, buoyLat]);
  return (
    <div className={cn("relative h-full w-full bg-[#060912]", className)}>
      <Map center={initialCenter.current} zoom={5} projection={{ type: "globe" }} maxZoom={18} styles={MAP_STYLES} attributionControl={false}>
        <MapControls position="bottom-right" showZoom showCompass showFullscreen />
        <MapHealthGuard />
        <FieldLayers layers={layers} />
        <ChartOverlays layers={layers} />
        <OceanLayers layers={layers} />
        <MaritimeNavLayers layers={layers} />
        <OceanDataLayers layers={layers} />
        <AssetInteractions onSelect={onSelect} onPickAsset={onPickAsset} onHover={onHover} />
        <MapInteractions navMode={navMode} waypoints={waypoints} onAddWaypoint={onAddWaypoint} onEraseWaypoint={onEraseWaypoint} />
        <MapCenterTracker onMove={onMoveCenter} />
        <MeshLayer telemetryRef={telemetryRef} layers={layers} />
        <SensorContactsLayer telemetryRef={telemetryRef} layers={layers} />
        <GhostTrackLayer telemetryRef={telemetryRef} />
        <BuoyLayers lat={buoyLat} lon={buoyLon} waypoints={waypoints} telemetryRef={telemetryRef} />
        <SelectionHighlight selected={selected} />
      </Map>

      {/* bottom-left: Navigation mode toggle (+ waypoint controls only when ON) */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setNavMode((v) => !v)}
          className={cn(
            "psa-glass-btn flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide",
            navMode ? "border-amber-400/60 bg-amber-400/15 text-amber-200" : "border-cyan-500/30 text-cyan-200 hover:border-cyan-500/50"
          )}
          title={navMode ? "Navigation ON — L-click sets a waypoint, R-click erases. Toggle off to select." : "Enable Navigation to plot waypoints. Otherwise clicking the map selects."}
        >
          <Navigation2 className="h-3.5 w-3.5" /> Navigation{navMode ? " · ON" : ""}
        </button>
        {navMode && (
          <>
            <div className="rounded border border-amber-500/30 bg-black/60 px-2 py-1 text-[10px] text-amber-200">
              <Crosshair className="mr-1 inline h-3 w-3 text-amber-300" /> L-click drop · R-click erase · {waypoints.length} queued
            </div>
            {waypoints.length > 0 && (
              <button onClick={onClearWaypoints} className="psa-glass-btn flex items-center gap-1 rounded border border-amber-500/30 px-2 py-1 text-[10px] uppercase text-amber-300 hover:text-amber-200">
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Re-renders only on real map-input changes (layers/selection/waypoints/buoy move) — never on telemetry polls. */
const MapView = memo(MapViewInner);
export default MapView;
