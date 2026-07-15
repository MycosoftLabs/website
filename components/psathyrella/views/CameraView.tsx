"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExternalLink, RefreshCw, Video, Settings, Plus, Minus, Maximize2,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Dot, ScanSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuoyCommand, BuoyTelemetry } from "@/lib/psathyrella/contract";
import { ViewBadge } from "@/components/psathyrella/ui";

/**
 * Camera viewport with a PTZ control suite.
 *  - "tower": real buoy feed via Jetson (telemetry.camera.streamUrl). Zoom/pan
 *    send cam.zoom / cam.point commands to the optic.
 *  - "webcam": this machine's camera via getUserMedia — a plug-in test. Zoom/pan
 *    are DIGITAL (CSS transform) so the controls visibly work before the real optic.
 */
type Src = "tower" | "webcam";
type Quality = "auto" | "720p" | "1080p";

const QUALITY: Record<Quality, { width?: number; height?: number }> = {
  auto: {},
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
// Same-origin proxy to the Jetson tower camera (CAM0) — works on the iPad over WiFi.
const TOWER_PROXY = "/api/psathyrella/tower-cam";

export default function CameraView({
  telemetry,
  sendCommand,
  visible = true,
  className,
}: {
  telemetry: BuoyTelemetry;
  sendCommand: (cmd: BuoyCommand) => Promise<boolean> | void;
  /** false when the CAMERA view is kept-alive but hidden — release the webcam then. */
  visible?: boolean;
  className?: string;
}) {
  const cam = telemetry.camera;
  const brg = Math.round(cam.bearingDeg ?? telemetry.pose.headingDeg ?? 0);

  const [src, setSrc] = useState<Src>("tower");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [err, setErr] = useState<{ msg: string; hint?: string; iframe?: boolean } | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [active, setActive] = useState(false);

  // PTZ state
  const [zoom, setZoom] = useState(1); // 1..30
  const [pan, setPan] = useState({ x: 0, y: 0 }); // -1..1
  const [quality, setQuality] = useState<Quality>("auto");
  const [showSettings, setShowSettings] = useState(false);
  const [auto, setAuto] = useState(false);
  // Tower cam (Jetson CAM0): prefer the backend-provided streamUrl, else the same-origin proxy.
  const [towerErr, setTowerErr] = useState(false);
  const [towerNonce, setTowerNonce] = useState(0);

  const inIframe = typeof window !== "undefined" && window.self !== window.top;
  const secure = typeof window !== "undefined" ? window.isSecureContext : true;

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }, []);

  // Release the webcam when the CAMERA view is hidden (kept-alive but not shown).
  useEffect(() => {
    if (!visible && active) stop();
  }, [visible, active, stop]);

  const start = useCallback(async () => {
    setErr(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErr({
        msg: !secure ? "Insecure context" : "Camera API unavailable",
        hint: !secure ? "Camera needs HTTPS or http://localhost. On the LAN IP it's blocked." : "This browser blocks getUserMedia here.",
        iframe: inIframe,
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), ...QUALITY[quality] },
        audio: false,
      });
      streamRef.current = stream;
      setLabel(stream.getVideoTracks()[0]?.label || "webcam");
      setActive(true);
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices(list.filter((d) => d.kind === "videoinput"));
      } catch { /* ignore */ }
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError") {
        setErr({ msg: "Camera permission denied", hint: inIframe ? "Embedded preview frame can't access the camera — open in a real browser tab." : "Browser blocked it — click the camera icon in the address bar → Allow → reload.", iframe: inIframe });
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setErr({ msg: "No camera found", hint: "No video input available (or selected device gone)." });
      } else if (name === "NotReadableError") {
        setErr({ msg: "Camera busy", hint: "Another app is using the camera. Close it and retry." });
      } else {
        setErr({ msg: "Camera unavailable", hint: (e as Error)?.message });
      }
    }
  }, [deviceId, quality, inIframe, secure]);

  useEffect(() => {
    if (src === "webcam") start();
    return () => stop();
  }, [src, start, stop]);

  // Attach the stream after the <video> mounts (active flips it in AFTER start runs).
  useEffect(() => {
    const v = videoRef.current;
    if (src === "webcam" && active && v && streamRef.current) {
      if (v.srcObject !== streamRef.current) v.srcObject = streamRef.current;
      v.play().catch(() => {});
    }
  }, [src, active]);

  // Auto-scan — slow oscillating pan (scaffold for the future automated/profiled modes).
  useEffect(() => {
    if (!auto) return;
    let t = 0;
    const id = setInterval(() => {
      t += 0.05;
      setPan((p) => ({ x: Math.sin(t) * 0.7, y: p.y }));
    }, 120);
    return () => clearInterval(id);
  }, [auto]);

  const showWebcam = src === "webcam" && active && !err;
  // Tower feed: backend streamUrl if live, else the proxy (nonce lets "Reconnect" re-open the stream).
  const towerSrc = cam.active && cam.streamUrl ? cam.streamUrl : `${TOWER_PROXY}?n=${towerNonce}`;
  const reconnectTower = () => { setTowerErr(false); setTowerNonce((n) => n + 1); };

  // ── PTZ actions (digital on webcam, command-send on tower) ──
  const applyZoom = (z: number) => {
    const nz = clamp(Math.round(z * 10) / 10, 1, 30);
    setZoom(nz);
    if (src === "tower") sendCommand({ domain: "camera", action: "setZoom", zoom: Math.round(nz) });
  };
  const nudgePan = (dx: number, dy: number) => {
    setAuto(false);
    setPan((p) => {
      const np = { x: clamp(p.x + dx, -1, 1), y: clamp(p.y + dy, -1, 1) };
      if (src === "tower") {
        sendCommand({ domain: "camera", action: "point", bearingDeg: Math.round((telemetry.pose.headingDeg ?? 0) + np.x * 45), tiltDeg: Math.round(np.y * 30) });
      }
      return np;
    });
  };
  const resetPtz = () => {
    setAuto(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (src === "tower") {
      sendCommand({ domain: "camera", action: "setZoom", zoom: 1 });
      sendCommand({ domain: "camera", action: "point", bearingDeg: Math.round(telemetry.pose.headingDeg ?? 0), tiltDeg: 0 });
    }
  };
  const applyPreset = (z: number, autoScan: boolean) => { setZoom(z); setPan({ x: 0, y: 0 }); setAuto(autoScan); if (src === "tower") sendCommand({ domain: "camera", action: "setZoom", zoom: z }); };

  const ptzStyle = { transform: `scale(${zoom})`, transformOrigin: `${50 + pan.x * 45}% ${50 + pan.y * 45}%`, transition: "transform 0.18s ease-out" } as const;
  const tiltDeg = Math.round(pan.y * 30);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-gradient-to-b from-[#0a1626] via-[#0a1018] to-[#05080e]", className)}>
      <ViewBadge>Camera · {src === "webcam" ? "Local webcam (test)" : "Tower cam · Jetson CAM0"}</ViewBadge>

      {/* feed — PTZ transform goes on the WRAPPER, never the <video> itself
          (transforming a playing <video> freezes the frame in Chrome). */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="h-full w-full" style={ptzStyle}>
          {showWebcam ? (
            <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          ) : src === "tower" && !towerErr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={towerSrc} src={towerSrc} alt="Psathyrella tower camera" className="h-full w-full object-cover" onError={() => setTowerErr(true)} onLoad={() => setTowerErr(false)} />
          ) : (
            <div className="absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-px w-[180%] -translate-x-1/2 -translate-y-1/2 bg-cyan-400/25" style={{ transform: `rotate(${tiltDeg}deg)` }} />
            </div>
          )}
        </div>
      </div>

      {/* top-right: settings + source toggle */}
      <div className="absolute right-3 top-3 z-30 flex items-center gap-2">
        <button type="button" onClick={() => setShowSettings((s) => !s)} className={cn("flex h-7 w-7 items-center justify-center rounded-md border", showSettings ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-100" : "border-cyan-500/20 bg-black/40 text-slate-300 hover:text-white")} title="Camera settings">
          <Settings className="h-3.5 w-3.5" />
        </button>
        <div className="flex overflow-hidden rounded-md border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wide">
          {(["tower", "webcam"] as Src[]).map((s) => (
            <button key={s} type="button" onClick={() => setSrc(s)} className={cn("px-2.5 py-1 transition-colors", src === s ? "bg-cyan-500/20 text-cyan-100" : "bg-black/40 text-slate-400 hover:text-slate-200")}>
              {s === "tower" ? "Tower" : "Webcam"}
            </button>
          ))}
        </div>
      </div>

      {/* settings popover */}
      {showSettings && (
        <div className="absolute right-3 top-12 z-30 w-56 rounded-lg border border-cyan-500/25 bg-[#0a0f1e]/95 p-2.5 backdrop-blur-md">
          <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">Source device</div>
          <select value={deviceId ?? ""} onChange={(e) => setDeviceId(e.target.value || undefined)} className="mb-2 h-7 w-full rounded border border-white/10 bg-black/40 px-1 text-[11px] text-slate-200">
            <option value="">Default camera</option>
            {devices.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>)}
          </select>
          <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">Resolution</div>
          <div className="mb-2 flex gap-1">
            {(["auto", "720p", "1080p"] as Quality[]).map((q) => (
              <button key={q} type="button" onClick={() => setQuality(q)} className={cn("flex-1 rounded border px-1.5 py-1 text-[10px] uppercase", quality === q ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-slate-400 hover:bg-white/5")}>{q}</button>
            ))}
          </div>
          <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-cyan-400/60">Presets</div>
          <div className="grid grid-cols-2 gap-1">
            <button type="button" onClick={() => applyPreset(1, false)} className="rounded border border-white/10 px-2 py-1 text-[10px] uppercase text-slate-300 hover:bg-white/5">Wide</button>
            <button type="button" onClick={() => applyPreset(6, false)} className="rounded border border-white/10 px-2 py-1 text-[10px] uppercase text-slate-300 hover:bg-white/5">Track</button>
            <button type="button" onClick={() => applyPreset(3, true)} className="flex items-center justify-center gap-1 rounded border border-white/10 px-2 py-1 text-[10px] uppercase text-slate-300 hover:bg-white/5"><ScanSearch className="h-3 w-3" />Scan</button>
            <button type="button" onClick={() => setAuto((a) => !a)} className={cn("rounded border px-2 py-1 text-[10px] uppercase", auto ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-200" : "border-white/10 text-slate-300 hover:bg-white/5")}>Auto {auto ? "•" : ""}</button>
          </div>
          <div className="mt-2 text-[9px] leading-relaxed text-slate-500">Presets are the scaffold for profiled / templated / automated camera behavior.</div>
        </div>
      )}

      {/* bearing tape */}
      <div className="absolute left-0 right-0 top-2 z-10 flex justify-center">
        <div className="rounded border border-cyan-500/20 bg-black/40 px-3 py-0.5 font-mono text-xs text-cyan-200">BRG {brg.toString().padStart(3, "0")}°</div>
      </div>

      {/* crosshair */}
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
        <g stroke="rgba(34,211,238,0.5)" strokeWidth="1" fill="none">
          <line x1="50%" y1="42%" x2="50%" y2="58%" />
          <line x1="42%" y1="50%" x2="58%" y2="50%" />
          <circle cx="50%" cy="50%" r="28" />
        </g>
      </svg>

      {showWebcam && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded border border-red-500/40 bg-black/50 px-2 py-1 font-mono text-[11px] text-red-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> LIVE · {label ?? "webcam"}
        </div>
      )}
      {src === "tower" && !towerErr && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded border border-cyan-500/40 bg-black/50 px-2 py-1 font-mono text-[11px] text-cyan-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" /> TOWER · CAM0
        </div>
      )}

      {/* zoom control (right edge) */}
      <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-lg border border-cyan-500/20 bg-black/45 p-1.5 backdrop-blur-sm">
        <button type="button" onClick={() => applyZoom(zoom + 1)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><Plus className="h-4 w-4" /></button>
        <div className="font-mono text-[11px] font-bold text-cyan-100">{zoom.toFixed(zoom < 10 ? 1 : 0)}×</div>
        <input type="range" min={1} max={30} step={0.5} value={zoom} onChange={(e) => applyZoom(parseFloat(e.target.value))} className="h-24 w-1 cursor-pointer accent-cyan-400" style={{ writingMode: "vertical-lr" as any, direction: "rtl" }} />
        <button type="button" onClick={() => applyZoom(zoom - 1)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><Minus className="h-4 w-4" /></button>
        <button type="button" onClick={resetPtz} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/10" title="Reset PTZ"><Maximize2 className="h-3.5 w-3.5" /></button>
      </div>

      {/* PTZ d-pad (bottom-right) */}
      <div className="absolute bottom-3 right-3 z-20 grid grid-cols-3 grid-rows-3 gap-0.5 rounded-lg border border-cyan-500/20 bg-black/45 p-1 backdrop-blur-sm">
        <span />
        <button type="button" onClick={() => nudgePan(0, -0.18)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><ChevronUp className="h-4 w-4" /></button>
        <span />
        <button type="button" onClick={() => nudgePan(-0.18, 0)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={resetPtz} className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-white/10"><Dot className="h-4 w-4" /></button>
        <button type="button" onClick={() => nudgePan(0.18, 0)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><ChevronRight className="h-4 w-4" /></button>
        <span />
        <button type="button" onClick={() => nudgePan(0, 0.18)} className="flex h-7 w-7 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/15"><ChevronDown className="h-4 w-4" /></button>
        <span />
      </div>

      {/* readouts */}
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-4 font-mono text-[11px] text-cyan-200/90">
        <span>ZOOM {zoom.toFixed(1)}×{src === "webcam" ? " DIG" : ""}</span>
        <span>PAN {Math.round(pan.x * 45)}°</span>
        <span>TILT {tiltDeg}°</span>
        {auto && <span className="text-cyan-300">⟳ AUTO-SCAN</span>}
      </div>

      {/* webcam error / recovery */}
      {src === "webcam" && err && (
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

      {src === "tower" && towerErr && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/55 text-center">
          <Video className="h-7 w-7 text-amber-300/80" />
          <div className="text-sm font-bold uppercase tracking-[0.15em] text-amber-300">No Tower Feed</div>
          <div className="max-w-md px-4 text-[12px] leading-relaxed text-slate-300">
            Awaiting the Jetson CAM0 stream. Serve CAM0 as MJPEG/HTTP on the Jetson and set{" "}
            <span className="font-mono text-cyan-200">PSATHYRELLA_TOWER_CAM_URL</span>, then reconnect.
          </div>
          <button onClick={reconnectTower} className="mt-1 flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase text-cyan-100 hover:bg-cyan-500/20">
            <RefreshCw className="h-3.5 w-3.5" /> Reconnect
          </button>
        </div>
      )}
    </div>
  );
}
