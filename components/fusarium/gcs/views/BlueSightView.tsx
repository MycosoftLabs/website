"use client";

/**
 * BlueSightView — the buoy's multi-sensor situational picture. NOT a single radar circle.
 *
 * Layout: a 2×2 QUAD of four independent windows —
 *   1. RADAR       (OpenCPN radar_pi PPI)
 *   2. LiDAR       (Ouster 360° scan)
 *   3. WiFi-sense  (RF-presence panel)
 *   4. CAMERA      (split: the 360° ring on top, the Target optic below)
 * — plus a fifth FUSION screen (`FusionPlot`) that projects every sensor into ONE buoy-centric polar
 * frame. Any window can be MAXIMIZED to fill the whole area (title bar or double-click), because LiDAR
 * and Radar no longer have top-level tabs — this view is where they are compared, so each must be
 * enlargeable.
 *
 * AI PROVENANCE — read before touching the camera window.
 * This file used to synthesize "detection" boxes from radar/lidar contacts: box position from a
 * contact's bearing and its ARRAY INDEX, box size and "confidence" from signal strength, the whole
 * thing badged "YOLO26+SAHI". That is fabricated model output presented to an operator as real
 * inference, and it is deleted. There is exactly one legitimate source of boxes in this codebase:
 * `useCameraDetections` (the owner-gated proxy to the Jetson detector), drawn by `DetectionOverlay`
 * in the coordinate space the backend computed them in. If the detector is off or unreachable the
 * surfaces show an honest standby chip and NO overlay. Never re-introduce a "sim" fallback, and
 * never print a model name the backend did not report.
 *
 * WHAT THE OTHER THREE WINDOWS ACTUALLY SHOW — do not overstate this.
 *   RADAR          — real: `telemetry.radar` contacts, straight into ScopePPI, which synthesizes
 *                    nothing. No contacts ⇒ an empty scope.
 *   FUSION         — real, and it is the one screen that knows what each sensor can MEASURE. It used
 *                    to be a ScopePPI over `[...radar, ...lidar, ...wifi]`, which drew every contact
 *                    as a dot at a bearing AND a range — including WiFi-sense, which measures neither.
 *                    `FusionPlot` replaces that: range-measuring sensors get a dot, bearing-only
 *                    sensors (camera, WiFi) get a wedge marked RANGE UNKNOWN, and a sensor with no
 *                    hardware is named in the legend rather than silently missing.
 *   LiDAR          — NO live Ouster feed exists yet (we pass `frame={null}`), so PointCloudView draws
 *                    its own clearly-badged demo scene. It is disclosed by the component ("· SIM",
 *                    "sim · awaiting Ouster") AND by this tile's subtitle. The day the edge serves
 *                    PointCloudFrames, pass them here and every badge clears itself.
 *   WiFi-sense     — real: `WifiSensePanel` renders ONLY what `/api/mindex/wifisense` reports, and
 *                    names which of "unreachable / pipeline off / heard nothing" it is looking at.
 *                    This window used to render WiFiSenseView's animated walking SKELETON from a
 *                    `simSubject()` generator, titled "DensePose (through-wall)". That is deleted
 *                    here. A badge does not defend a human figure on an operator console — at a
 *                    glance it is a contact on the deck — and it was not a placeholder for anything:
 *                    pose-from-WiFi has no working implementation, its published rig is two fixed
 *                    mains-powered 3x3 routers in a surveyed indoor room, and CSI sensing needs rich
 *                    indoor multipath that open water does not provide. The tower optics are this
 *                    buoy's person-detection sensor. Do not reintroduce a pose mode here.
 * A badged simulation is honest; an unbadged one is not. If you wire a real feed, delete the badge —
 * never the reverse. And a simulated PERSON is not honest at any badge level.
 */

import { useEffect, useState, type ReactNode } from "react";
import useSWR from "swr";
import { cn } from "@/lib/utils";
import {
  Radar as RadarIcon, ScanEye, Wifi, Camera as CameraIcon, Layers as LayersIcon,
  ScanSearch, Maximize2, Minimize2,
} from "lucide-react";
import { emptyCameraRig, type BuoyTelemetry, type CameraFeed, type CameraRig } from "@/lib/fusarium/gcs/contract";
import { useWifiSense } from "@/lib/fusarium/gcs/useWifiSense";
import { ViewBadge } from "@/components/fusarium/gcs/ui";
import LiveFeedSurface from "@/components/fusarium/gcs/camera/LiveFeedSurface";
import WifiSensePanel from "@/components/fusarium/gcs/camera/WifiSensePanel";
import { ScopePPI } from "./ScopePPI";
import FusionPlot from "./FusionPlot";
import PointCloudView from "@/components/sensors/PointCloudView";

type Mode = "QUAD" | "FUSION";
type TileId = "radar" | "lidar" | "wifi" | "camera";

const TILE_ORDER: TileId[] = ["radar", "lidar", "wifi", "camera"];

const fetcher = (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json());

/** A single titled sensor window. The whole title bar is the maximize control (so is a double-click). */
function SensorTile({
  label,
  sub,
  icon,
  maximized,
  onToggleMax,
  children,
}: {
  label: string;
  sub: string;
  icon: ReactNode;
  maximized: boolean;
  onToggleMax: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-cyan-500/15 bg-[#060912]">
      <button
        type="button"
        onClick={onToggleMax}
        title={maximized ? "Restore the 2×2" : `Maximize ${label}`}
        className="flex w-full shrink-0 items-center justify-between gap-2 border-b border-cyan-500/10 bg-black/40 px-2 py-1 text-left transition-colors hover:bg-black/60"
      >
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">{icon} {label}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[8px] uppercase tracking-wide text-slate-500">{sub}</span>
          <span className="shrink-0 text-cyan-300/70">
            {maximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </span>
        </span>
      </button>
      <div className="relative min-h-0 flex-1" onDoubleClick={onToggleMax}>{children}</div>
    </div>
  );
}

/**
 * CAMERA window — the ACTUAL tower optics, through the same-origin owner-gated proxies.
 *
 * WHICH RING SURFACE: the panorama, not the raw 2×2 composite. In a tile this small the composite
 * would show four sensors at a quarter each of an already-quarter-screen window, and its quadrants
 * are in cable order (tileOrder [1,3,2,0]), so left-to-right would NOT be bearing order without the
 * canvas blit machinery Quad360View exists to run. The pano is one 3840×540 strip already stitched
 * in bearing order on the Jetson: letterboxed into a wide short tile it fills the width and reads as
 * one continuous horizon. It also keeps the overlay honest — pano boxes are computed in pano space,
 * so a plain contain-fit is exactly right with no re-projection. If the Jetson never serves a pano
 * (or it dies), we fall back to the composite and switch the detection feed id with it.
 *
 * The SWR poll and the streams live inside this component on purpose: when another tile is
 * maximized this unmounts, and the video sockets, the detector polling and the rig poll all stop.
 */
function CameraWindow({ showAi, active }: { showAi: boolean; active: boolean }) {
  const { data: rig, mutate: mutateRig } = useSWR<CameraRig>("/api/fusarium/gcs/camera", fetcher, {
    refreshInterval: 10000, revalidateOnFocus: false, dedupingInterval: 8000,
  });
  const fallback = emptyCameraRig().feeds;
  const feeds = rig?.feeds ?? fallback;
  const quad: CameraFeed = feeds.find((f) => f.id === "quad360") ?? fallback[0];
  const front: CameraFeed = feeds.find((f) => f.id === "front") ?? fallback[1];

  // Fall back to the raw composite only when the pano has actually proven dead — not on a status
  // blip. Reconnect clears it so a recovered stitch service comes straight back.
  const [panoDead, setPanoDead] = useState(false);
  const panoUrl = quad.stitch?.panoUrl ?? null;
  const usePano = Boolean(panoUrl) && !panoDead;
  useEffect(() => { if (!panoUrl) setPanoDead(false); }, [panoUrl]);

  const reconnect = () => { setPanoDead(false); void mutateRig(); };

  return (
    <div className="flex h-full flex-col gap-0.5">
      <div className="relative min-h-0 flex-1">
        <LiveFeedSurface
          title={usePano ? "360° Panorama" : "360° Ring composite"}
          src={usePano ? panoUrl : quad.streamUrl}
          // Detections must be read in the space they were computed in — the pano stitch geometry
          // belongs to the Jetson, and re-projecting ring boxes onto it would put a contact on the
          // wrong bearing. Switching the surface switches the feed id with it.
          feedId={usePano ? "pano" : "quad360"}
          online={quad.online}
          // contain, for both: the composite must show all four quadrants (cover would crop two of
          // them away), and contain is the fit DetectionOverlay inverts for a whole-frame surface.
          fit="contain"
          showAi={showAi}
          active={active}
          srcW={usePano ? null : quad.width}
          srcH={usePano ? null : quad.height}
          onReconnect={reconnect}
          onUnavailable={usePano ? () => setPanoDead(true) : undefined}
          unavailableHint={
            usePano
              ? "Jetson CUDA stitch (quad360/pano). Falls back to the raw ring composite."
              : "Serve the 4× IMX519 Camarray composite on the Jetson (PSATHYRELLA_CAM_QUAD360_URL)."
          }
        />
      </div>
      <div className="relative min-h-0 flex-1">
        <LiveFeedSurface
          title="Target · IMX477"
          src={front.streamUrl}
          feedId="front"
          online={front.online}
          fit="contain"
          showAi={showAi}
          active={active}
          srcW={front.width}
          srcH={front.height}
          onReconnect={reconnect}
          unavailableHint="Serve the IMX477 on the Jetson (PSATHYRELLA_CAM_FRONT_URL)."
        />
      </div>
    </div>
  );
}

/**
 * WiFi-SENSE window — passive RF presence off `/api/mindex/wifisense`.
 *
 * The poll lives inside this component for the same reason CameraWindow's does: when another tile is
 * maximized this unmounts and the polling stops with it, instead of a hidden tile quietly holding the
 * MINDEX round-trip open.
 */
function WifiWindow({ active }: { active: boolean }): ReactNode {
  const wifiSense = useWifiSense({ enabled: active });
  return <WifiSensePanel state={wifiSense} />;
}

export default function BlueSightView({ telemetry, active = true, className }: { telemetry: BuoyTelemetry; active?: boolean; className?: string }) {
  const [mode, setMode] = useState<Mode>("QUAD");
  const [maximized, setMaximized] = useState<TileId | null>(null);
  const [showAi, setShowAi] = useState(true);

  // Same source of truth the detection hook uses — so the chip can say "off" honestly instead of
  // implying an overlay the browser is never going to be allowed to fetch.
  const camAiAvailable = process.env.NEXT_PUBLIC_FUSARIUM_GCS_CAM_AI === "1";

  const radar = telemetry.radar.contacts;
  const lidar = telemetry.lidar.contacts;
  const allActive = telemetry.radar.active || telemetry.lidar.active || telemetry.bluesight.active || telemetry.camera.active;
  const heading = telemetry.pose.headingDeg;

  const toggleMax = (id: TileId) => setMaximized((cur) => (cur === id ? null : id));
  // Only the mounted tile can be live; the others are unmounted while one is maximized, so nothing
  // hidden keeps a WebGL context or a video socket burning frame budget.
  const tileActive = active && mode === "QUAD";

  const renderTile = (id: TileId) => {
    const isMax = maximized === id;
    switch (id) {
      case "radar":
        return (
          <SensorTile key={id} label="Radar" sub="radar_pi · 4 km" icon={<RadarIcon className="h-3 w-3" />} maximized={isMax} onToggleMax={() => toggleMax(id)}>
            <ScopePPI contacts={radar} maxRangeM={telemetry.radar.maxRangeM} active={telemetry.radar.active} headingDeg={heading} variant="radar" />
          </SensorTile>
        );
      case "lidar":
        return (
          // `frame={null}` — no Ouster feed is wired, so this draws PointCloudView's badged demo
          // scene. The subtitle says so in the tile header too, not only inside the child.
          <SensorTile key={id} label="LiDAR" sub="Ouster · no feed · sim scene" icon={<ScanEye className="h-3 w-3" />} maximized={isMax} onToggleMax={() => toggleMax(id)}>
            <PointCloudView frame={null} active={tileActive} />
          </SensorTile>
        );
      case "wifi":
        return (
          // Passive RF only — radios heard, not people, and no pose. The panel names its own empty
          // state, so the subtitle claims a source rather than a result.
          <SensorTile key={id} label="WiFi-sense" sub="passive RF · MINDEX" icon={<Wifi className="h-3 w-3" />} maximized={isMax} onToggleMax={() => toggleMax(id)}>
            <WifiWindow active={tileActive} />
          </SensorTile>
        );
      case "camera":
        return (
          <SensorTile key={id} label="Camera" sub="360° ring + Target" icon={<CameraIcon className="h-3 w-3" />} maximized={isMax} onToggleMax={() => toggleMax(id)}>
            <CameraWindow showAi={showAi} active={tileActive} />
          </SensorTile>
        );
    }
  };

  return (
    <div className={cn("relative flex h-full w-full flex-col bg-[#04070e] p-2", className)}>
      <ViewBadge>BlueSight · {mode === "FUSION" ? "Fused" : "Quad"} · radar · lidar · wifi · camera</ViewBadge>

      {/* mode + camera-AI controls */}
      <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowAi((a) => !a)}
          title={camAiAvailable
            ? "Detection boxes from the Jetson detector, on the camera surfaces only"
            : "Camera AI is off — set NEXT_PUBLIC_FUSARIUM_GCS_CAM_AI=1 to enable the detector overlay"}
          className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
            showAi && camAiAvailable ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-100" : "border-white/10 text-slate-400 hover:text-slate-200")}
        >
          <ScanSearch className="h-3 w-3" /> Cam AI{camAiAvailable ? "" : " off"}
        </button>
        <div className="flex overflow-hidden rounded-md border border-cyan-500/25 text-[10px] font-bold uppercase tracking-wide">
          {(["QUAD", "FUSION"] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={cn("flex items-center gap-1 px-2.5 py-1", mode === m ? "bg-cyan-500/20 text-cyan-100" : "bg-black/45 text-slate-400 hover:text-slate-200")}>
              {m === "QUAD" ? <LayersIcon className="h-3 w-3" /> : <ScanEye className="h-3 w-3" />}{m === "QUAD" ? "Quad" : "Fusion"}
            </button>
          ))}
        </div>
      </div>

      {mode === "QUAD" ? (
        maximized ? (
          <div className="mt-9 flex min-h-0 flex-1 flex-col">{renderTile(maximized)}</div>
        ) : (
          <div className="mt-9 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2">
            {TILE_ORDER.map(renderTile)}
          </div>
        )
      ) : (
        <div className="relative mt-9 min-h-0 flex-1 overflow-hidden rounded-lg border border-cyan-500/15">
          <FusionPlot telemetry={telemetry} active={active && mode === "FUSION"} />
        </div>
      )}

      {!allActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center pb-10">
          <span className="rounded border border-amber-500/30 bg-black/60 px-2 py-1 text-[9px] uppercase tracking-wide text-amber-300/80">Sensors STANDBY · awaiting radar / lidar / wifi / camera backend</span>
        </div>
      )}
    </div>
  );
}
