"use client";

/**
 * MapZone — the isolation boundary between the MAP and the rest of the GCS.
 *
 * Military-grade requirement (Morgan): the control panels and the buoy data pipeline
 * must be 100% separated from the map — the map can NEVER freeze the controls or stall
 * incoming telemetry, and a map crash must not take down the console.
 *
 * How this is enforced:
 *  1. MapErrorBoundary — any error thrown inside the MapLibre subtree (render/commit,
 *     e.g. a WebGL context loss or a stray removeChild) is caught HERE. The controls and
 *     telemetry keep running; the map shows a recover card and auto-remounts.
 *  2. The heavy MapLibre subtree (<MapView/>) is React.memo'd and fed ONLY primitives +
 *     stable callbacks, so the 2.5s telemetry polls never re-render it. The live MYCA
 *     analysis widget + ocean filters re-render here (cheap DOM), not inside the map.
 */

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PROJECT_OYSTER_ANCHOR, type BuoyTelemetry, type MapAsset, type MapAssetHover, type SelectedDevice, type Waypoint } from "@/lib/psathyrella/contract";
import MapView from "./MapView";
import { MapFiltersPanel, DEFAULT_LAYERS, type LayerKey, type LayerState } from "./MapFiltersPanel";
import { MapAnalysisWidget } from "./MapAnalysisWidget";
import { DisconnectedOpsHUD } from "./DisconnectedOpsHUD";
import { MapAssetHoverCard, MapAssetDetailCard } from "./MapAssetCards";
import { MapEntityWidget } from "./MapEntityWidget";

// Asset kinds that get the RICH entity widget (full data) instead of the lightweight card.
const RICH_ENTITY_LAYERS = new Set(["psa-bases-fill", "psa-bases-dot", "psa-devices"]);

// Persisted layer-preset key (preset "phase2_demo_default" — DEFAULT_LAYERS).
const LAYERS_STORAGE_KEY = "psathyrella.layers.v1";

class MapErrorBoundary extends Component<{ children: ReactNode }, { errored: boolean }> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  state = { errored: false };

  static getDerivedStateFromError() {
    return { errored: true };
  }

  componentDidCatch(error: unknown) {
    // Isolated: log only — the parent console (controls + telemetry) is untouched.
    // eslint-disable-next-line no-console
    console.error("[Psathyrella] MAP subtree error contained by boundary:", error);
    // Auto-recover the map once after a short beat; controls never stop in the meantime.
    if (typeof window !== "undefined" && !this.retryTimer) {
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.setState({ errored: false });
      }, 1500);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  reset = () => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.setState({ errored: false });
  };

  render() {
    if (this.state.errored) {
      return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#060912] text-slate-300">
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300/80">Map recovering</div>
          <div className="max-w-xs text-center text-[11px] text-slate-500">
            The chart view hit a rendering fault and was isolated. Buoy control and telemetry are unaffected.
          </div>
          <button
            type="button"
            onClick={this.reset}
            className="rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-200 hover:bg-cyan-500/20"
          >
            Reload chart
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Contains any throw inside an asset info card (MapEntityWidget / MapAssetDetailCard) so a stray
// data shape can never blank the whole console. Keyed by the picked asset, so it resets per pick.
class CardErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[Psathyrella] asset card error contained by boundary:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MapZone({
  telemetry,
  waypoints,
  onAddWaypoint,
  onEraseWaypoint,
  onClearWaypoints,
  selected,
  onSelect,
}: {
  telemetry: BuoyTelemetry;
  waypoints: Waypoint[];
  onAddWaypoint: (lat: number, lon: number) => void;
  onEraseWaypoint: (id: string) => void;
  onClearWaypoints: () => void;
  selected: SelectedDevice | null;
  onSelect: (s: SelectedDevice | null) => void;
}) {
  // Map-only UI state lives here, decoupled from the telemetry object.
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [center, setCenter] = useState<{ lat: number; lon: number } | null>(null);
  // Asset hover/pick state lives HERE, outside the memoized map — so hover/select never
  // reconciles the MapLibre subtree (the cards render as siblings). setState fns are stable,
  // so passing them into the map memo (like setCenter) never recomputes it.
  const [hoverAsset, setHoverAsset] = useState<MapAssetHover | null>(null);
  const [pickedAsset, setPickedAsset] = useState<MapAsset | null>(null);
  const toggle = (k: LayerKey) => setLayers((l) => ({ ...l, [k]: !l[k] }));
  const resetLayers = () => setLayers(DEFAULT_LAYERS);

  // Persist the operator's layer choices. SSR-safe: first paint is always the Phase-2 demo
  // default, then we hydrate any saved overrides on mount (so hydration never mismatches).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAYERS_STORAGE_KEY);
      if (raw) setLayers((cur) => ({ ...cur, ...(JSON.parse(raw) as Partial<LayerState>) }));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(LAYERS_STORAGE_KEY, JSON.stringify(layers));
    } catch {
      /* ignore */
    }
  }, [layers]);

  // Primitives only — stable across telemetry polls while the buoy holds position,
  // so the memoized map never re-renders from a poll.
  const buoyLat = typeof telemetry.pose.lat === "number" ? telemetry.pose.lat : PROJECT_OYSTER_ANCHOR.lat;
  const buoyLon = typeof telemetry.pose.lon === "number" ? telemetry.pose.lon : PROJECT_OYSTER_ANCHOR.lon;
  const selectedName = selected?.name ?? null;

  // Live telemetry handed to the map as a STABLE ref (identity never changes) so the radar/
  // lidar contact layer can read live sensor returns WITHOUT re-rendering the memoized map —
  // the same isolation guarantee that keeps telemetry polls off the MapLibre subtree.
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;

  // Keep the (rare-changing) map element referentially stable so the analysis widget /
  // filters re-rendering on telemetry never reconciles the MapLibre subtree.
  const map = useMemo(
    () => (
      <MapErrorBoundary>
        <MapView
          buoyLat={buoyLat}
          buoyLon={buoyLon}
          layers={layers}
          waypoints={waypoints}
          selected={selected}
          onSelect={onSelect}
          onAddWaypoint={onAddWaypoint}
          onEraseWaypoint={onEraseWaypoint}
          onClearWaypoints={onClearWaypoints}
          onMoveCenter={setCenter}
          onHover={setHoverAsset}
          onPickAsset={setPickedAsset}
          telemetryRef={telemetryRef}
        />
      </MapErrorBoundary>
    ),
    // buoyLat/buoyLon are DELIBERATELY excluded: in SIM mode the pose jitters every poll, and
    // recreating <MapView> (whose <Map center> then re-inits) is the "blinking" bug. The buoy now
    // FOLLOWS its live position via BuoyLayers reading telemetryRef on a timer — no map recompute.
    // telemetryRef identity is stable, so listing it never forces a map recompute either.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layers, waypoints, selected, onSelect, onAddWaypoint, onEraseWaypoint, onClearWaypoints, telemetryRef]
  );

  return (
    <div className="relative h-full w-full">
      {map}

      {/* live overlays — re-render on telemetry/center (cheap DOM), never the map */}
      <MapAnalysisWidget center={center} telemetry={telemetry} selectedName={selectedName} />

      {/* Right-side stack: comms/link HUD on top, Layers docked BELOW it (no overlap).
          The column is click-through; only its widgets capture pointer events. */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 flex h-[calc(100%-1.5rem)] flex-col items-end gap-2">
        <DisconnectedOpsHUD telemetry={telemetry} />
        <MapFiltersPanel layers={layers} onToggle={toggle} onReset={resetLayers} />
      </div>

      {/* Asset info widgets (Earth-Sim parity) — cursor-following hover tooltip + a pinned,
          dismissable detail card. Rendered OUTSIDE the memoized map so hover/select never
          reconciles the MapLibre subtree. */}
      <MapAssetHoverCard hover={hoverAsset} />
      <CardErrorBoundary key={pickedAsset?.id || "none"}>
        {pickedAsset && (RICH_ENTITY_LAYERS.has(pickedAsset.layerId)
          ? <MapEntityWidget asset={pickedAsset} onClose={() => setPickedAsset(null)} />
          : <MapAssetDetailCard asset={pickedAsset} onClose={() => setPickedAsset(null)} />)}
      </CardErrorBoundary>
    </div>
  );
}
