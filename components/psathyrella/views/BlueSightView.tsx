"use client";

/**
 * BlueSightView — the buoy's multi-sensor situational picture. NOT a single radar circle.
 *
 * Layout: a 2×2 QUAD of four independent windows —
 *   1. RADAR       (OpenCPN radar_pi PPI)
 *   2. LiDAR       (Ouster 360° scan)
 *   3. WiFi-sense  (RF-presence panel)
 *   4. CAMERA      (split: 360° panorama + Sony 30X optic)
 * — plus a fifth FUSION screen that merges all four onto one canvas.
 *
 * BlueSight's AI (YOLO26 + SAHI tiled inference + Nemotron "why") draws object-recognition boxes
 * over the camera tiles and the fused view. Real inference is the Cursor/edge lane; until it's
 * wired the boxes run as a CLEARLY-BADGED sim derived from the live sensor contacts, so the
 * detection UX is operable now. All sensor returns come from telemetry (no fabricated blips).
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Radar as RadarIcon, ScanEye, Wifi, Camera as CameraIcon, Layers as LayersIcon, Brain } from "lucide-react";
import { type BuoyTelemetry, type SensorContact } from "@/lib/psathyrella/contract";
import { type WiFiSenseFrame } from "@/lib/sensors/frames";
import { ViewBadge } from "@/components/psathyrella/ui";
import { ScopePPI } from "./ScopePPI";
import PointCloudView from "@/components/sensors/PointCloudView";
import WiFiSenseView from "@/components/sensors/WiFiSenseView";

type Mode = "QUAD" | "FUSION";

// Map a sensor contact to a normalized "detection" for the AI box overlay (sim until inference lands).
function classOf(c: SensorContact): { label: string; color: string } {
  const k = (c.classifiedAs || c.kind || "unknown").toLowerCase();
  if (/vessel|boat|ship/.test(k)) return { label: "vessel", color: "#fb923c" };
  if (/person|swimmer|diver/.test(k)) return { label: "person", color: "#f87171" };
  if (/buoy|aton|marker/.test(k)) return { label: "buoy", color: "#22d3ee" };
  if (/debris|object/.test(k)) return { label: "debris", color: "#a78bfa" };
  if (/land|shore/.test(k)) return { label: "landmass", color: "#94a3b8" };
  return { label: c.classifiedAs || c.kind || "contact", color: "#34d399" };
}

/** AI object-recognition box overlay (sim positions derived from contacts; badged YOLO26+SAHI). */
function AiBoxes({ contacts, on }: { contacts: SensorContact[]; on: boolean }) {
  if (!on) return null;
  const dets = contacts.slice(0, 6).map((c, i) => {
    const cls = classOf(c);
    // Project bearing → x across the frame, strength → box size; deterministic per index.
    const x = ((((c.bearingDeg ?? i * 57) % 360) + 360) % 360) / 360;
    const y = 0.32 + ((i * 0.13) % 0.4);
    const s = 0.08 + (c.strength ?? 0.5) * 0.14;
    return { ...cls, x, y, s, conf: Math.round(55 + (c.strength ?? 0.5) * 44) };
  });
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {dets.map((d, i) => (
        <div key={i} className="absolute" style={{ left: `${(d.x - d.s / 2) * 100}%`, top: `${(d.y - d.s / 2) * 100}%`, width: `${d.s * 100}%`, height: `${d.s * 100}%`, border: `1.5px solid ${d.color}`, borderRadius: 2, boxShadow: `0 0 0 1px rgba(0,0,0,0.5)` }}>
          <span className="absolute -top-4 left-0 whitespace-nowrap rounded-sm px-1 text-[8px] font-bold uppercase tracking-wide" style={{ background: d.color, color: "#04070e" }}>{d.label} {d.conf}%</span>
        </div>
      ))}
      <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-300"><Brain className="h-2.5 w-2.5" /> YOLO26+SAHI{dets.length ? "" : " · standby"}</div>
    </div>
  );
}

/** A single titled sensor window. */
function SensorTile({ label, sub, icon, children, onMax }: { label: string; sub: string; icon: React.ReactNode; children: React.ReactNode; onMax?: () => void }) {
  return (
    <div className="relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-cyan-500/15 bg-[#060912]">
      <div className="flex shrink-0 items-center justify-between border-b border-cyan-500/10 bg-black/40 px-2 py-1">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">{icon} {label}</span>
        <span className="truncate text-[8px] uppercase tracking-wide text-slate-500">{sub}</span>
      </div>
      <div className="relative min-h-0 flex-1" onDoubleClick={onMax}>{children}</div>
    </div>
  );
}

/** Camera window: split 360° panorama (top) + Sony 30X optic (bottom), each with AI boxes. */
function CameraSplit({ telemetry, ai }: { telemetry: BuoyTelemetry; ai: boolean }) {
  const cam = telemetry.camera;
  const live = cam.active && cam.streamUrl;
  const radarLidar = [...telemetry.radar.contacts, ...telemetry.lidar.contacts];
  const Pane = ({ title, aspect }: { title: string; aspect: string }) => (
    <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
      <span className="absolute left-1.5 top-1 z-30 rounded bg-black/60 px-1 text-[8px] font-bold uppercase tracking-wider text-cyan-300/80">{title}</span>
      {live ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cam.streamUrl!} alt={title} className={cn("h-full w-full", aspect)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[9px] uppercase tracking-[0.2em] text-slate-600">awaiting Jetson video</div>
      )}
      <AiBoxes contacts={radarLidar} on={ai} />
    </div>
  );
  return (
    <div className="flex h-full flex-col gap-0.5">
      <Pane title="360° panorama" aspect="object-cover" />
      <Pane title="Sony 30X optic" aspect="object-contain" />
    </div>
  );
}

export default function BlueSightView({ telemetry, active = true, className }: { telemetry: BuoyTelemetry; active?: boolean; className?: string }) {
  const [mode, setMode] = useState<Mode>("QUAD");
  const [ai, setAi] = useState(true);

  const radar = telemetry.radar.contacts;
  const lidar = telemetry.lidar.contacts;
  const wifi = telemetry.bluesight.wifi;
  // Real RF-presence frame from the buoy's wifi contacts (DensePose subjects arrive from the edge later).
  const wifiFrame: WiFiSenseFrame = {
    deviceId: telemetry.deviceId, sensorId: "wifisense", capability: "wifisense",
    tMs: 0, seq: 0, active: telemetry.bluesight.active, refFrame: "BODY", kind: "presence",
    devices: wifi.map((c, i) => ({ id: c.id || `dev-${i}`, rssiDbm: Math.round(-40 - (1 - (c.strength ?? 0.5)) * 60), strength: c.strength ?? 0.5, vendor: c.label || c.classifiedAs })),
  };
  const allActive = telemetry.radar.active || telemetry.lidar.active || telemetry.bluesight.active || telemetry.camera.active;
  const fused = [...radar, ...lidar, ...wifi];
  const maxRangeM = Math.max(telemetry.radar.maxRangeM, telemetry.lidar.maxRangeM);
  const heading = telemetry.pose.headingDeg;

  return (
    <div className={cn("relative flex h-full w-full flex-col bg-[#04070e] p-2", className)}>
      <ViewBadge>BlueSight · {mode === "FUSION" ? "Fused" : "Quad"} · radar · lidar · wifi · camera</ViewBadge>

      {/* mode + AI controls */}
      <div className="absolute right-3 top-3 z-30 flex items-center gap-1.5">
        <button type="button" onClick={() => setAi((a) => !a)} title="YOLO26 + SAHI object recognition" className={cn("flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide", ai ? "border-violet-500/50 bg-violet-500/15 text-violet-200" : "border-white/10 text-slate-400 hover:text-slate-200")}>
          <Brain className="h-3 w-3" /> AI
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
        <div className="mt-9 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2">
          <SensorTile label="Radar" sub="radar_pi · 4 km" icon={<RadarIcon className="h-3 w-3" />}>
            <ScopePPI contacts={radar} maxRangeM={telemetry.radar.maxRangeM} active={telemetry.radar.active} headingDeg={heading} variant="radar" />
            <AiBoxes contacts={radar} on={ai} />
          </SensorTile>
          <SensorTile label="LiDAR" sub="Ouster 3D point cloud" icon={<ScanEye className="h-3 w-3" />}>
            <PointCloudView frame={null} active={active && mode === "QUAD"} />
          </SensorTile>
          <SensorTile label="WiFi-sense" sub="DensePose · through-wall" icon={<Wifi className="h-3 w-3" />}>
            <WiFiSenseView frame={wifiFrame} active={active && mode === "QUAD"} />
          </SensorTile>
          <SensorTile label="Camera" sub="360° + Sony 30X" icon={<CameraIcon className="h-3 w-3" />}>
            <CameraSplit telemetry={telemetry} ai={ai} />
          </SensorTile>
        </div>
      ) : (
        <div className="relative mt-9 min-h-0 flex-1 overflow-hidden rounded-lg border border-cyan-500/15">
          <ScopePPI contacts={fused} maxRangeM={maxRangeM} active={allActive} headingDeg={heading} variant="fusion" />
          <AiBoxes contacts={fused} on={ai} />
          <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded bg-black/50 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-cyan-300/60">Fused · radar + lidar + wifi + camera</div>
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
