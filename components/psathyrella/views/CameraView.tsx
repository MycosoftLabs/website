"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  ExternalLink, RefreshCw, Video, Settings, Plus, Minus, Maximize2,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Dot, ScanSearch, Sun, Moon, CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { emptyCameraRig, type BuoyCommand, type BuoyTelemetry, type CameraFeed, type CameraRig } from "@/lib/psathyrella/contract";
import { ViewBadge } from "@/components/psathyrella/ui";
import Quad360View from "./Quad360View";
import TargetView from "./TargetView";

/**
 * Tower camera viewport. Two real feeds + a dev-only webcam:
 *  - "quad360" (360°): the four IMX519 ring cameras stitched in software (Quad360View).
 *  - "front"  (TARGET): the IMX477 HQ day/night cam looking straight ahead — the Sony 30x stand-in.
 *    PTZ is digital today (CSS crop) and becomes optical when the Sony lands; same commands. IR-cut
 *    day/night/auto drives the IMX477's motorized filter.
 *  - "webcam": this machine's getUserMedia — a DEV-ONLY plug-in test, hidden on the iPad/production.
 */
type CamTab = "quad360" | "front" | "webcam";
type Quality = "auto" | "720p" | "1080p";

const QUALITY: Record<Quality, { width?: number; height?: number }> = {
  auto: {}, "720p": { width: 1280, height: 720 }, "1080p": { width: 1920, height: 1080 },
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const fetcher = (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json());

export default function CameraView({
  telemetry,
  sendCommand,
  visible = true,
  className,
}: {
  telemetry: BuoyTelemetry;
  sendCommand: (cmd: BuoyCommand) => Promise<boolean> | void;
  visible?: boolean;
  className?: string;
}) {
  // Live rig status (which feeds are online, sensor, layout, IR-cut). Same-origin, owner-gated.
  const { data: rig, mutate: mutateRig } = useSWR<CameraRig>("/api/psathyrella/camera", fetcher, {
    refreshInterval: 10000, revalidateOnFocus: false, dedupingInterval: 8000,
  });
  const feeds = rig?.feeds ?? emptyCameraRig().feeds;
  const frontFeed: CameraFeed = feeds.find((f) => f.id === "front") ?? emptyCameraRig().feeds[1];
  const quadFeed: CameraFeed = feeds.find((f) => f.id === "quad360") ?? emptyCameraRig().feeds[0];

  // Webcam is a dev-only aid — only offer the tab on localhost or with an explicit flag.
  const devWebcam = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (process.env.NEXT_PUBLIC_PSATHYRELLA_CAM_DEV === "1") return true;
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  }, []);

  const [tab, setTab] = useState<CamTab>("quad360");
  // If the user is parked on the dev webcam tab and it's not a dev host, fall back to TARGET.
  useEffect(() => { if (tab === "webcam" && !devWebcam) setTab("front"); }, [tab, devWebcam]);

  const brg = Math.round(frontFeed.mountBearingsDeg?.[0] != null ? (telemetry.pose.headingDeg ?? 0) + frontFeed.mountBearingsDeg[0] : telemetry.pose.headingDeg ?? 0);

  // ── webcam (dev) ──
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [err, setErr] = useState<{ msg: string; hint?: string; iframe?: boolean } | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [active, setActive] = useState(false);

  // ── PTZ (front / target) ──
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [quality, setQuality] = useState<Quality>("auto");
  const [showSettings, setShowSettings] = useState(false);
  const [auto, setAuto] = useState(false);
  const [frontErr, setFrontErr] = useState(false);
  const [frontNonce, setFrontNonce] = useState(0);

  const inIframe = typeof window !== "undefined" && window.self !== window.top;
  const secure = typeof window !== "undefined" ? window.isSecureContext : true;
  const zoomMax = Math.max(2, frontFeed.zoomMax && frontFeed.zoomMax > 1 ? frontFeed.zoomMax : 8);
  const optical = frontFeed.ptz === "optical";

  const stop = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setActive(false);
  }, []);
  useEffect(() => { if ((!visible || tab !== "webcam") && active) stop(); }, [visible, tab, active, stop]);

  const start = useCallback(async () => {
    setErr(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErr({ msg: !secure ? "Insecure context" : "Camera API unavailable", hint: !secure ? "Webcam needs HTTPS or http://localhost." : "This browser blocks getUserMedia here.", iframe: inIframe });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), ...QUALITY[quality] }, audio: false });
      streamRef.current = stream;
      setLabel(stream.getVideoTracks()[0]?.label || "webcam");
      setActive(true);
      try { setDevices((await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput")); } catch { /* ignore */ }
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError") setErr({ msg: "Camera permission denied", hint: inIframe ? "Embedded preview can't access the camera — open in a real tab." : "Click the camera icon in the address bar → Allow → reload.", iframe: inIframe });
      else if (name === "NotFoundError" || name === "OverconstrainedError") setErr({ msg: "No camera found", hint: "No video input available." });
      else if (name === "NotReadableError") setErr({ msg: "Camera busy", hint: "Another app is using the camera." });
      else setErr({ msg: "Camera unavailable", hint: (e as Error)?.message });
    }
  }, [deviceId, quality, inIframe, secure]);

  useEffect(() => { if (tab === "webcam") start(); return () => stop(); }, [tab, start, stop]);
  useEffect(() => {
    const v = videoRef.current;
    if (tab === "webcam" && active && v && streamRef.current) {
      if (v.srcObject !== streamRef.current) v.srcObject = streamRef.current;
      v.play().catch(() => {});
    }
  }, [tab, active]);

  // Auto-scan oscillation (front)
  useEffect(() => {
    if (!auto || tab !== "front") return;
    let t = 0;
    const id = setInterval(() => { t += 0.05; setPan((p) => ({ x: Math.sin(t) * 0.7, y: p.y })); }, 120);
    return () => clearInterval(id);
  }, [auto, tab]);

  const showWebcam = tab === "webcam" && active && !err;
  const frontSrc = frontFeed.streamUrl ? `${frontFeed.streamUrl}?n=${frontNonce}` : null;
  const frontOnline = frontFeed.online && !frontErr;
  const reconnectFront = () => { setFrontErr(false); setFrontNonce((n) => n + 1); void mutateRig(); };

  // PTZ actions — digital crop always; also send optic commands when on the front feed.
  const applyZoom = (z: number) => {
    const nz = clamp(Math.round(z * 10) / 10, 1, optical ? (frontFeed.zoomMax ?? 30) : zoomMax);
    setZoom(nz);
    if (tab === "front" && optical) sendCommand({ domain: "camera", action: "setZoom", zoom: Math.round(nz) });
  };
  const nudgePan = (dx: number, dy: number) => {
    setAuto(false);
    setPan((p) => {
      const np = { x: clamp(p.x + dx, -1, 1), y: clamp(p.y + dy, -1, 1) };
      if (tab === "front" && optical) sendCommand({ domain: "camera", action: "point", bearingDeg: Math.round((telemetry.pose.headingDeg ?? 0) + np.x * 45), tiltDeg: Math.round(np.y * 30) });
      return np;
    });
  };
  const resetPtz = () => { setAuto(false); setZoom(1); setPan({ x: 0, y: 0 }); if (tab === "front" && optical) { sendCommand({ domain: "camera", action: "setZoom", zoom: 1 }); sendCommand({ domain: "camera", action: "point", bearingDeg: Math.round(telemetry.pose.headingDeg ?? 0), tiltDeg: 0 }); } };
  const applyPreset = (z: number, autoScan: boolean) => { setZoom(z); setPan({ x: 0, y: 0 }); setAuto(autoScan); if (tab === "front" && optical) sendCommand({ domain: "camera", action: "setZoom", zoom: z }); };
  // NOTE: no setIrCut here. A `sendCommand({ domain: "camera", action: "irCut" })` helper used to live
  // on this line, firing into the generic command bus, which has no handler for that action. It was
  // already unreferenced, and left in place it reads like live wiring to anyone tracing why the
  // day/night controls do nothing. TargetView owns IR-cut and posts to /api/psathyrella/camera/ircut.

  const ptzStyle = { transform: `scale(${zoom})`, transformOrigin: `${50 + pan.x * 45}% ${50 + pan.y * 45}%`, transition: "transform 0.18s ease-out" } as const;
  const tiltDeg = Math.round(pan.y * 30);
  // TargetView owns every Target-tab control now (PTZ, IR-cut, presets, bearing, offline card).
  // These legacy controls remain ONLY for the dev webcam — rendering them on "front" duplicated
  // TargetView's own zoom rail and d-pad on top of each other.
  const showPtz = tab === "webcam" && showWebcam;

  const TABS: { id: CamTab; label: string }[] = [
    { id: "quad360", label: "360°" },
    { id: "front", label: "Target" },
    ...(devWebcam ? [{ id: "webcam" as CamTab, label: "Webcam" }] : []),
  ];

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-gradient-to-b from-[#0a1626] via-[#0a1018] to-[#05080e]", className)}>
      <ViewBadge>{tab === "quad360" ? "360° Ring" : tab === "front" ? "Target · IMX477" : "Webcam · dev"}</ViewBadge>

      {/* ── 360° RING ── */}
      {tab === "quad360" && (
        <div className="absolute inset-0">
          <Quad360View feed={quadFeed} telemetry={telemetry} active={visible && tab === "quad360"} onReconnect={() => void mutateRig()} />
        </div>
      )}

      {/* ── TARGET (discrete IMX477) — own view: recognition + bearing + follow ── */}
      {tab === "front" && (
        <div className="absolute inset-0">
          <TargetView feed={frontFeed} telemetry={telemetry} active={visible && tab === "front"} sendCommand={sendCommand} onReconnect={() => void mutateRig()} />
        </div>
      )}

      {/* ── WEBCAM (dev only) ── */}
      {tab === "webcam" && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="h-full w-full" style={ptzStyle}>
            {showWebcam ? (
              <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0">
                <div className="absolute left-1/2 top-1/2 h-px w-[180%] -translate-x-1/2 -translate-y-1/2 bg-cyan-400/25" style={{ transform: `rotate(${tiltDeg}deg)` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* top-right: settings + tab toggle — z-40 so it stays clickable ABOVE any offline overlay
          (else the inset-0 offline card traps you on the Target/Webcam tab with no way back). */}
      <div className="absolute right-3 top-[4px] z-[70] flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wide">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("px-2.5 py-1 transition-colors", tab === t.id ? "bg-cyan-500/20 text-cyan-100" : "bg-black/40 text-slate-400 hover:text-slate-200")}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* IR-cut day/night (front only, when the feed has the hardware) — below the ViewBadge */}

      {/* settings popover (front) */}

      {/* bearing tape (front) */}
      {tab === "front" && (
        <div className="absolute left-0 right-0 top-2 z-10 flex justify-center">
          <div className="rounded border border-cyan-500/20 bg-black/40 px-3 py-0.5 font-mono text-xs text-cyan-200">BRG {brg.toString().padStart(3, "0")}°</div>
        </div>
      )}

      {/* crosshair (front / webcam) */}
      {tab === "webcam" && (
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
          <g stroke="rgba(34,211,238,0.5)" strokeWidth="1" fill="none">
            <line x1="50%" y1="42%" x2="50%" y2="58%" /><line x1="42%" y1="50%" x2="58%" y2="50%" /><circle cx="50%" cy="50%" r="28" />
          </g>
        </svg>
      )}

      {showWebcam && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded border border-red-500/40 bg-black/50 px-2 py-1 font-mono text-[11px] text-red-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> LIVE · {label ?? "webcam"}
        </div>
      )}

      {/* zoom + d-pad (front / webcam) */}
      {showPtz && (
        <>
          <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-lg border border-cyan-500/20 bg-black/45 p-1.5 backdrop-blur-sm">
            <button type="button" onClick={() => applyZoom(zoom + 1)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><Plus className="h-4 w-4" /></button>
            <div className="font-mono text-[11px] font-bold text-cyan-100">{zoom.toFixed(zoom < 10 ? 1 : 0)}×</div>
            <input type="range" min={1} max={optical ? (frontFeed.zoomMax ?? 30) : zoomMax} step={0.5} value={zoom} onChange={(e) => applyZoom(parseFloat(e.target.value))} className="h-24 w-1 cursor-pointer accent-cyan-400" style={{ writingMode: "vertical-lr" as never, direction: "rtl" }} />
            <button type="button" onClick={() => applyZoom(zoom - 1)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><Minus className="h-4 w-4" /></button>
            <button type="button" onClick={resetPtz} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/10" title="Reset PTZ"><Maximize2 className="h-3.5 w-3.5" /></button>
          </div>
          <div className="absolute bottom-3 right-3 z-20 grid grid-cols-3 grid-rows-3 gap-0.5 rounded-lg border border-cyan-500/20 bg-black/45 p-1 backdrop-blur-sm">
            <span /><button type="button" onClick={() => nudgePan(0, -0.18)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><ChevronUp className="h-4 w-4" /></button><span />
            <button type="button" onClick={() => nudgePan(-0.18, 0)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={resetPtz} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/10"><Dot className="h-4 w-4" /></button>
            <button type="button" onClick={() => nudgePan(0.18, 0)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><ChevronRight className="h-4 w-4" /></button>
            <span /><button type="button" onClick={() => nudgePan(0, 0.18)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><ChevronDown className="h-4 w-4" /></button><span />
          </div>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-4 font-mono text-[11px] text-cyan-200/90">
            <span>ZOOM {zoom.toFixed(1)}×{optical ? "" : " DIG"}</span><span>PAN {Math.round(pan.x * 45)}°</span><span>TILT {tiltDeg}°</span>{auto && <span className="text-cyan-300">⟳ AUTO-SCAN</span>}
          </div>
        </>
      )}

      {/* webcam error / recovery (dev) */}
      {tab === "webcam" && err && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/55 text-center">
          <Video className="h-7 w-7 text-amber-300/80" />
          <div className="text-sm font-bold uppercase tracking-[0.15em] text-amber-300">{err.msg}</div>
          {err.hint && <div className="max-w-md px-4 text-[12px] leading-relaxed text-slate-300">{err.hint}</div>}
          <div className="mt-1 flex gap-2">
            <button onClick={() => start()} className="flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase text-cyan-100 hover:bg-cyan-500/20"><RefreshCw className="h-3.5 w-3.5" /> Retry</button>
            {err.iframe && <button onClick={() => window.open(window.location.href, "_blank", "noopener")} className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase text-amber-100 hover:bg-amber-500/20"><ExternalLink className="h-3.5 w-3.5" /> Open in tab</button>}
          </div>
        </div>
      )}

      {/* target offline / recovery */}
    </div>
  );
}
