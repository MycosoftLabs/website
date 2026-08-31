"use client";

/**
 * Collapsible ocean-ops filters panel (top-right of the MAP). The buoy-tailored,
 * organized equivalent of the Earth Simulator layer filters — NOT the full intel feed.
 * Ocean things first: ocean data, ocean devices, ocean infrastructure, ocean weather,
 * ocean events. Pure UI toggles over the isolated map's own layers.
 */

import { useState } from "react";
import { Layers, X, Waves, Anchor, Radio, Ship, Zap, Compass, Fish, Shield, CloudRain, Leaf, Radar as RadarIcon, Share2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type LayerKey =
  | "noaaCharts" | "seamarks" | "channels"
  | "navaids" | "depthContours"
  | "peers" | "mesh"
  | "devices" | "ndbc"
  | "radar" | "lidar"
  | "gauges" | "currents" | "marineLife"
  | "cables" | "cell" | "ais" | "bases" | "events" | "oyster"
  | "fungalEcm" | "fungalAm"
  | "wxTemp" | "wxPrecip" | "wxRadar" | "wxMrms" | "wxSolar" | "wxGpp" | "wxNdvi" | "wxBiomass";
export type LayerState = Record<LayerKey, boolean>;

// Phase-2 demo default (preset "phase2_demo_default", persisted as psathyrella.layers.v1).
// ON: buoy sensors, mesh + fleet, ALL charts, ALL ocean assets, devices, infrastructure,
// military bases, Project Oyster plume. OFF: climate/weather, marine-life, nature·fungi,
// vessels, events. NOTE: fungi is a default-OFF *toggle* for the buoy ops view — the data
// is never pruned/capped, only hidden until the operator turns it on.
export const DEFAULT_LAYERS: LayerState = {
  // Charts — all on
  noaaCharts: true, seamarks: true, channels: true,
  navaids: true, depthContours: true,
  // Mesh & fleet — on
  peers: true, mesh: true,
  // Devices + NOAA ocean buoys — on
  devices: true, ndbc: true,
  // Buoy sensors — on
  radar: true, lidar: true,
  // Ocean assets — on; marine life off (nature)
  gauges: true, currents: true, marineLife: false,
  // Infrastructure on; defense/bases on; Oyster plume on; vessels + events off
  cables: true, cell: true, ais: false, bases: true, events: false, oyster: true,
  // Nature · fungi — default-off toggle (data never pruned)
  fungalEcm: false, fungalAm: false,
  // Climate & weather — all off
  wxTemp: false, wxPrecip: false, wxRadar: false, wxMrms: false, wxSolar: false, wxGpp: false, wxNdvi: false, wxBiomass: false,
};

// Live = wired to a real isolated source today; the rest are organized + ready to wire.
const CATEGORIES: { label: string; icon: typeof Waves; layers: { k: LayerKey; label: string; live?: boolean }[] }[] = [
  { label: "Buoy sensors", icon: RadarIcon, layers: [
    { k: "radar", label: "Radar contacts (4 km)", live: true },
    { k: "lidar", label: "Lidar returns (500 m)", live: true },
  ] },
  { label: "Mesh & fleet", icon: Share2, layers: [
    { k: "peers", label: "Peer buoys", live: true },
    { k: "mesh", label: "Mesh links + packets", live: true },
  ] },
  { label: "Charts", icon: Compass, layers: [
    { k: "noaaCharts", label: "NOAA ENC charts", live: true },
    { k: "seamarks", label: "Seamarks · buoys", live: true },
    { k: "channels", label: "Depth / channels", live: true },
    { k: "navaids", label: "Nav aids / seamarks", live: true },
    { k: "depthContours", label: "Depth contours / soundings", live: true },
  ] },
  { label: "Ocean", icon: Waves, layers: [
    { k: "ndbc", label: "NOAA buoys", live: true },
    { k: "gauges", label: "Tide / river gauges", live: true },
    { k: "currents", label: "Ocean currents", live: true },
  ] },
  { label: "Climate & weather", icon: CloudRain, layers: [
    { k: "wxMrms", label: "Live radar (MRMS 1 km)", live: true },
    { k: "wxRadar", label: "Radar forecast (HRRR)", live: true },
    { k: "wxTemp", label: "Air temperature (ERA5)", live: true },
    { k: "wxPrecip", label: "Precipitation (ERA5)", live: true },
    { k: "wxSolar", label: "Solar irradiance (Helios)", live: true },
    { k: "wxGpp", label: "Carbon uptake · GPP", live: true },
    { k: "wxNdvi", label: "Greenness · NDVI", live: true },
    { k: "wxBiomass", label: "Biomass carbon (AGB)", live: true },
  ] },
  { label: "Devices", icon: Anchor, layers: [
    { k: "devices", label: "Mycosoft fleet", live: true },
  ] },
  { label: "Marine life", icon: Fish, layers: [
    { k: "marineLife", label: "Species occurrences", live: true },
  ] },
  { label: "Nature · fungi", icon: Leaf, layers: [
    { k: "fungalEcm", label: "ECM mycorrhizal fungi", live: true },
    { k: "fungalAm", label: "AM mycorrhizal fungi", live: true },
  ] },
  { label: "Infrastructure", icon: Radio, layers: [
    { k: "cables", label: "Submarine cables", live: true },
    { k: "cell", label: "Cell towers", live: true },
  ] },
  { label: "Vessels", icon: Ship, layers: [
    { k: "ais", label: "AIS vessels", live: true },
  ] },
  { label: "Defense", icon: Shield, layers: [
    { k: "bases", label: "Military / Navy bases", live: true },
  ] },
  { label: "Projects", icon: Anchor, layers: [
    { k: "oyster", label: "Project Oyster plume", live: true },
  ] },
  { label: "Events", icon: Zap, layers: [
    { k: "events", label: "Marine hazards / storms", live: true },
  ] },
];

export function MapFiltersPanel({ layers, onToggle, onReset }: { layers: LayerState; onToggle: (k: LayerKey) => void; onReset?: () => void }) {
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(layers).filter(Boolean).length;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="psa-glass-btn pointer-events-auto shrink-0 flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-200 hover:border-cyan-500/50"
        title="Layers & filters"
      >
        <Layers className="h-3.5 w-3.5" /> Layers
        <span className="rounded bg-cyan-500/20 px-1 text-[9px]">{activeCount}</span>
      </button>
    );
  }

  return (
    <div className="psa-glass pointer-events-auto flex min-h-0 w-56 flex-1 flex-col overflow-hidden rounded-xl">
      <div className="flex shrink-0 items-center justify-between border-b border-cyan-500/10 bg-gradient-to-r from-cyan-500/5 to-transparent px-3 py-2">
        <div className="flex items-center gap-1.5 text-cyan-200"><Layers className="h-3.5 w-3.5" /><span className="text-[11px] font-bold uppercase tracking-wider text-white">Ocean Layers</span></div>
        <div className="flex items-center gap-0.5">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title="Reset to Phase 2 Demo Default"
              className="rounded p-0.5 text-slate-400 hover:bg-white/5 hover:text-cyan-200"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
          <button type="button" onClick={() => setOpen(false)} className="rounded p-0.5 text-slate-400 hover:bg-white/5"><X className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.label} className="mb-2">
              <div className="mb-1 flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60"><Icon className="h-3 w-3" /> {cat.label}</div>
              {cat.layers.map((l) => (
                <button
                  key={l.k}
                  type="button"
                  disabled={!l.live}
                  onClick={() => onToggle(l.k)}
                  className={cn(
                    "psa-glass-btn mb-0.5 flex w-full items-center justify-between rounded border border-transparent px-2 py-1 text-[11px]",
                    !l.live ? "cursor-not-allowed text-slate-600" : layers[l.k] ? "border-cyan-500/40 bg-cyan-500/15 text-cyan-100" : "text-slate-300 hover:text-white"
                  )}
                >
                  <span>{l.label}</span>
                  {!l.live ? <span className="text-[8px] uppercase">soon</span> : <span className={cn("h-2 w-2 rounded-full", layers[l.k] ? "bg-cyan-400" : "bg-slate-600")} />}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
