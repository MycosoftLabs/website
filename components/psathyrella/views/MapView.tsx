"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { Navigation2, MapPin, Crosshair, Layers, Trash2, Anchor, Waves } from "lucide-react";
import { Map, MapControls, MapMarker, MarkerContent, useMap } from "@/components/ui/map";
import { cn } from "@/lib/utils";
import { PROJECT_OYSTER_ANCHOR, type BuoyTelemetry, type Waypoint } from "@/lib/psathyrella/contract";
import { ViewBadge } from "@/components/psathyrella/ui";

const fetcher = (u: string) => fetch(u, { headers: { accept: "application/json" } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const EMPTY_FC = { type: "FeatureCollection", features: [] as unknown[] };

type LayerKey = "devices" | "ndbc" | "radar" | "ais" | "cell";
type LayerState = Record<LayerKey, boolean>;

function toDeviceFC(data: any) {
  const rows: any[] = Array.isArray(data?.devices) ? data.devices : [];
  const features = rows
    .map((d) => {
      const lat = Number(d?.location?.lat);
      const lon = Number(d?.location?.lon ?? d?.location?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const isBuoy = String(d?.id || "").toLowerCase().includes("psathyrella") || String(d?.type || "").toLowerCase().includes("buoy");
      return { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { name: d?.name || d?.id, kind: isBuoy ? "buoy" : "device", id: d?.id } };
    })
    .filter(Boolean);
  return { type: "FeatureCollection", features };
}

function toBuoyFC(data: any) {
  const rows: any[] = Array.isArray(data?.buoys) ? data.buoys : [];
  const features = rows
    .map((b) => {
      const lat = Number(b?.lat);
      const lon = Number(b?.lng ?? b?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { name: b?.station_id || b?.id, waveHeight: b?.wave_height, waterTemp: b?.water_temp } };
    })
    .filter(Boolean);
  return { type: "FeatureCollection", features };
}

/** Adds the ocean/device GeoJSON circle layers (Earth-Sim pattern: addSource + addLayer + setData). */
function OceanDataLayers({ layers, onSelect }: { layers: LayerState; onSelect: (s: { name: string; sub: string } | null) => void }) {
  const { map } = useMap();
  const { data: devicesData } = useSWR(layers.devices ? "/api/earth-simulator/devices" : null, fetcher, { refreshInterval: 20000, revalidateOnFocus: false });
  const { data: buoysData } = useSWR(layers.ndbc ? "/api/oei/buoys" : null, fetcher, { refreshInterval: 300000, revalidateOnFocus: false });

  useEffect(() => {
    if (!map) return;
    const ensure = () => {
      try {
        if (!map.getSource("psa-ndbc")) {
          map.addSource("psa-ndbc", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({ id: "psa-ndbc", type: "circle", source: "psa-ndbc", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 8, 5], "circle-color": "#84cc16", "circle-stroke-width": 1, "circle-stroke-color": "#1a2e05", "circle-opacity": 0.85 } });
        }
        if (!map.getSource("psa-devices")) {
          map.addSource("psa-devices", { type: "geojson", data: EMPTY_FC as any });
          map.addLayer({ id: "psa-devices", type: "circle", source: "psa-devices", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 4, 8, 8], "circle-color": ["match", ["get", "kind"], "buoy", "#22d3ee", "#e879f9"], "circle-stroke-width": 1.5, "circle-stroke-color": "#0a0f1e" } });
        }
      } catch {
        /* style mid-load */
      }
    };
    if (map.isStyleLoaded?.()) ensure();
    else map.once("load", ensure);

    const onClick = (e: any) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ["psa-devices", "psa-ndbc"] })[0];
      if (!f) return;
      const p = f.properties || {};
      if (f.layer.id === "psa-ndbc") onSelect({ name: `NDBC ${p.name}`, sub: `${p.waveHeight != null ? `wave ${Number(p.waveHeight).toFixed(1)}m · ` : ""}${p.waterTemp != null ? `${Number(p.waterTemp).toFixed(1)}°C` : "ocean buoy"}` });
      else onSelect({ name: String(p.name || "device"), sub: p.kind === "buoy" ? "Mycosoft buoy" : "Mycosoft device" });
    };
    map.on("click", onClick);

    return () => {
      try {
        map.off("click", onClick);
        ["psa-devices", "psa-ndbc"].forEach((id) => {
          if (map.getLayer(id)) map.removeLayer(id);
          if (map.getSource(id)) map.removeSource(id);
        });
      } catch {
        /* map tearing down */
      }
    };
  }, [map, onSelect]);

  useEffect(() => {
    const src = map?.getSource("psa-devices") as { setData?: (d: any) => void } | undefined;
    src?.setData?.(layers.devices ? toDeviceFC(devicesData) : EMPTY_FC);
  }, [map, devicesData, layers.devices]);
  useEffect(() => {
    const src = map?.getSource("psa-ndbc") as { setData?: (d: any) => void } | undefined;
    src?.setData?.(layers.ndbc ? toBuoyFC(buoysData) : EMPTY_FC);
  }, [map, buoysData, layers.ndbc]);

  return null;
}

function MapInteractions({
  waypoints,
  onAddWaypoint,
  onEraseWaypoint,
}: {
  waypoints: Waypoint[];
  onAddWaypoint: (lat: number, lon: number) => void;
  onEraseWaypoint: (id: string) => void;
}) {
  const { map } = useMap();
  const wpRef = useRef(waypoints);
  wpRef.current = waypoints;
  useEffect(() => {
    if (!map) return;
    const onClick = (e: any) => {
      // ignore clicks that hit a data feature (those select instead of dropping a waypoint)
      const hit = map.queryRenderedFeatures(e.point, { layers: ["psa-devices", "psa-ndbc"] });
      if (hit.length) return;
      onAddWaypoint(e.lngLat.lat, e.lngLat.lng);
    };
    const onContext = (e: any) => {
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
      try {
        map.off("click", onClick);
        map.off("contextmenu", onContext);
      } catch {
        /* */
      }
    };
  }, [map, onAddWaypoint, onEraseWaypoint]);
  return null;
}

export default function MapView({
  telemetry,
  waypoints,
  onAddWaypoint,
  onEraseWaypoint,
  onClearWaypoints,
  className,
}: {
  telemetry: BuoyTelemetry;
  waypoints: Waypoint[];
  onAddWaypoint: (lat: number, lon: number) => void;
  onEraseWaypoint: (id: string) => void;
  onClearWaypoints: () => void;
  className?: string;
}) {
  const lat = telemetry.pose.lat ?? PROJECT_OYSTER_ANCHOR.lat;
  const lon = telemetry.pose.lon ?? PROJECT_OYSTER_ANCHOR.lon;
  const heading = telemetry.pose.headingDeg ?? 0;

  const [layers, setLayers] = useState<LayerState>({ devices: true, ndbc: true, radar: false, ais: false, cell: false });
  const [sel, setSel] = useState<{ name: string; sub: string } | null>(null);
  const toggle = (k: LayerKey) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  const LAYER_META: { key: LayerKey; label: string; soon?: boolean }[] = [
    { key: "devices", label: "Mycosoft devices" },
    { key: "ndbc", label: "NOAA buoys" },
    { key: "radar", label: "Weather radar", soon: true },
    { key: "ais", label: "AIS vessels", soon: true },
    { key: "cell", label: "Cell coverage", soon: true },
  ];

  return (
    <div className={cn("relative h-full w-full bg-[#060912]", className)}>
      <ViewBadge>Earth Sim · Ocean Ops · Project Oyster</ViewBadge>

      <Map center={[lon, lat]} zoom={5} projection={{ type: "globe" }} maxZoom={18}>
        <MapControls position="bottom-right" showZoom showCompass showFullscreen />
        <OceanDataLayers layers={layers} onSelect={setSel} />
        <MapInteractions waypoints={waypoints} onAddWaypoint={onAddWaypoint} onEraseWaypoint={onEraseWaypoint} />

        {/* the buoy */}
        <MapMarker longitude={lon} latitude={lat}>
          <MarkerContent>
            <div className="relative flex h-8 w-8 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping" />
              <span className="absolute inset-1.5 rounded-full border border-cyan-400/40" />
              <Navigation2 className="h-5 w-5 text-cyan-300 drop-shadow" style={{ transform: `rotate(${heading}deg)` }} />
            </div>
          </MarkerContent>
        </MapMarker>

        {/* waypoints */}
        {waypoints.map((wp, i) => (
          <MapMarker key={wp.id} longitude={wp.lon} latitude={wp.lat}>
            <MarkerContent>
              <div className="flex flex-col items-center" title="Right-click to erase">
                <MapPin className="h-5 w-5 text-amber-400" />
                <span className="-mt-1 rounded bg-black/70 px-1 text-[9px] font-bold text-amber-200">{i + 1}</span>
              </div>
            </MarkerContent>
          </MapMarker>
        ))}
      </Map>

      {/* layer toggles */}
      <div className="absolute left-3 top-12 z-10 w-44 rounded-lg border border-cyan-500/20 bg-[#0a0f1e]/95 p-2 backdrop-blur-md">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300"><Layers className="h-3.5 w-3.5" /> Layers</div>
        {LAYER_META.map((l) => (
          <button
            key={l.key}
            type="button"
            disabled={l.soon}
            onClick={() => toggle(l.key)}
            className={cn(
              "mb-0.5 flex w-full items-center justify-between rounded px-2 py-1 text-[11px] transition-colors",
              l.soon ? "cursor-not-allowed text-slate-600" : layers[l.key] ? "bg-cyan-500/15 text-cyan-100" : "text-slate-400 hover:bg-white/5"
            )}
          >
            <span>{l.label}</span>
            {l.soon ? <span className="text-[8px] uppercase">soon</span> : <span className={cn("h-2 w-2 rounded-full", layers[l.key] ? "bg-cyan-400" : "bg-slate-600")} />}
          </button>
        ))}
      </div>

      {/* selection readout */}
      {sel && (
        <div className="absolute right-3 top-12 z-10 max-w-[220px] rounded-lg border border-cyan-500/20 bg-[#0a0f1e]/95 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-white">
            {sel.name.startsWith("NDBC") ? <Waves className="h-3.5 w-3.5 text-lime-400" /> : <Anchor className="h-3.5 w-3.5 text-cyan-300" />} {sel.name}
          </div>
          <div className="text-[10px] text-slate-400">{sel.sub}</div>
          <button onClick={() => setSel(null)} className="mt-1 text-[9px] uppercase text-slate-500 hover:text-slate-300">dismiss</button>
        </div>
      )}

      {/* waypoint controls */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
        <div className="rounded border border-cyan-500/20 bg-black/50 px-2 py-1 text-[10px] text-slate-400">
          <Crosshair className="mr-1 inline h-3 w-3 text-cyan-400" />
          L-click drop · R-click erase · {waypoints.length} queued
        </div>
        {waypoints.length > 0 && (
          <button onClick={onClearWaypoints} className="flex items-center gap-1 rounded border border-amber-500/30 bg-black/50 px-2 py-1 text-[10px] uppercase text-amber-300 hover:bg-amber-500/10">
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
