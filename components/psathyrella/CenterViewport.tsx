"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { BuoyCommand, BuoyTelemetry, SelectedDevice, ViewMode, Waypoint } from "@/lib/psathyrella/contract";
import { setMapViewActive } from "@/lib/psathyrella/viewState";
import CameraView from "./views/CameraView";
import RadarScope from "./views/RadarScope";
import PointCloudView from "@/components/sensors/PointCloudView";
import BlueSightView from "./views/BlueSightView";
import SonarView from "./views/SonarView";
import MapZone from "./views/MapZone";

/**
 * The MAP view stays MOUNTED for the whole session (just hidden when inactive).
 * Unmounting MapLibre on every tab switch tears down its React marker portals and
 * throws "Cannot read properties of null (reading 'removeChild')" — which also
 * blocked reaching the lidar/radar/bluesight views. Keeping it mounted avoids that.
 */
export function CenterViewport({
  view,
  telemetry,
  sendCommand,
  waypoints,
  onAddWaypoint,
  onEraseWaypoint,
  onClearWaypoints,
  selected,
  onSelect,
}: {
  view: ViewMode;
  telemetry: BuoyTelemetry;
  sendCommand: (cmd: BuoyCommand) => Promise<boolean> | void;
  waypoints: Waypoint[];
  onAddWaypoint: (lat: number, lon: number) => void;
  onEraseWaypoint: (id: string) => void;
  onClearWaypoints: () => void;
  selected: SelectedDevice | null;
  onSelect: (s: SelectedDevice | null) => void;
}) {
  // Lazy keep-alive for the heavy Earth-Sim engine: mount only once MAP is first
  // opened, then keep it mounted (hidden when inactive) so view-switching never tears
  // it down (crashes MapLibre portals) and it never re-initialises.
  const [mapOpened, setMapOpened] = useState(view === "MAP");
  useEffect(() => {
    if (view === "MAP") setMapOpened(true);
  }, [view]);

  // Pause the (still-mounted) WebGL map's animation loops whenever another view is active, so the
  // map + a live webcam don't both hammer the GPU and freeze the controls. Resumes on MAP.
  useEffect(() => {
    setMapViewActive(view === "MAP");
    return () => setMapViewActive(true);
  }, [view]);

  // KEEP ALL VIEWS MOUNTED (toggle visibility), never unmount on switch. Unmounting a
  // view tears down DOM that MapLibre/media also touch, which throws the React commit-phase
  // "Cannot read properties of null (reading 'removeChild')" crash — that error escapes and
  // FREEZES every control (same failure as Earth Simulator). Keeping panes alive avoids it.
  const pane = (active: boolean, z: string, node: ReactNode) => (
    <div className={cn("absolute inset-0", z, active ? "" : "invisible pointer-events-none")} aria-hidden={!active}>
      {node}
    </div>
  );

  return (
    <div className="relative h-full w-full">
      {mapOpened &&
        pane(
          view === "MAP",
          "z-0",
          <MapZone
            telemetry={telemetry}
            waypoints={waypoints}
            onAddWaypoint={onAddWaypoint}
            onEraseWaypoint={onEraseWaypoint}
            onClearWaypoints={onClearWaypoints}
            selected={selected}
            onSelect={onSelect}
          />
        )}
      {pane(view === "CAMERA", "z-10", <CameraView telemetry={telemetry} sendCommand={sendCommand} visible={view === "CAMERA"} />)}
      {pane(view === "LIDAR", "z-10", <PointCloudView frame={null} active={view === "LIDAR"} />)}
      {pane(view === "RADAR", "z-10", <RadarScope telemetry={telemetry} />)}
      {pane(view === "BLUESIGHT", "z-10", <BlueSightView telemetry={telemetry} active={view === "BLUESIGHT"} />)}
      {pane(view === "SONAR", "z-10", <SonarView telemetry={telemetry} sendCommand={sendCommand} active={view === "SONAR"} />)}
    </div>
  );
}
