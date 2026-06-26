"use client";

import { cn } from "@/lib/utils";
import type { BuoyTelemetry, ViewMode, Waypoint } from "@/lib/psathyrella/contract";
import CameraView from "./views/CameraView";
import LidarScope from "./views/LidarScope";
import RadarScope from "./views/RadarScope";
import BlueSightView from "./views/BlueSightView";
import MapView from "./views/MapView";

/**
 * The MAP view stays MOUNTED for the whole session (just hidden when inactive).
 * Unmounting MapLibre on every tab switch tears down its React marker portals and
 * throws "Cannot read properties of null (reading 'removeChild')" — which also
 * blocked reaching the lidar/radar/bluesight views. Keeping it mounted avoids that.
 */
export function CenterViewport({
  view,
  telemetry,
  waypoints,
  onAddWaypoint,
  onEraseWaypoint,
  onClearWaypoints,
}: {
  view: ViewMode;
  telemetry: BuoyTelemetry;
  waypoints: Waypoint[];
  onAddWaypoint: (lat: number, lon: number) => void;
  onEraseWaypoint: (id: string) => void;
  onClearWaypoints: () => void;
}) {
  const overlay =
    view === "CAMERA" ? <CameraView telemetry={telemetry} /> :
    view === "LIDAR" ? <LidarScope telemetry={telemetry} /> :
    view === "RADAR" ? <RadarScope telemetry={telemetry} /> :
    view === "BLUESIGHT" ? <BlueSightView telemetry={telemetry} /> :
    null;

  return (
    <div className="relative h-full w-full">
      {/* persistent globe */}
      <div className={cn("absolute inset-0", view === "MAP" ? "z-0" : "invisible pointer-events-none")} aria-hidden={view !== "MAP"}>
        <MapView
          telemetry={telemetry}
          waypoints={waypoints}
          onAddWaypoint={onAddWaypoint}
          onEraseWaypoint={onEraseWaypoint}
          onClearWaypoints={onClearWaypoints}
        />
      </div>

      {/* active non-map view renders on top */}
      {overlay && <div className="absolute inset-0 z-10">{overlay}</div>}
    </div>
  );
}
