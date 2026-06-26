"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RefreshCw, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BuoyTelemetry } from "@/lib/psathyrella/contract";
import { NoFeed, ViewBadge } from "@/components/psathyrella/ui";

/**
 * Camera viewport. Sources:
 *  - "tower": the real buoy feed via Jetson (telemetry.camera.streamUrl).
 *  - "webcam": this machine's camera via getUserMedia — a plug-in test of the
 *    HUD-over-video path. getUserMedia needs a SECURE CONTEXT (https or
 *    http://localhost) and, if the page is embedded, an iframe with allow="camera".
 */
type Src = "tower" | "webcam";

export default function CameraView({ telemetry, className }: { telemetry: BuoyTelemetry; className?: string }) {
  const cam = telemetry.camera;
  const brg = Math.round(cam.bearingDeg ?? telemetry.pose.headingDeg ?? 0);
  const tilt = cam.tiltDeg ?? 0;

  const [src, setSrc] = useState<Src>("tower");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [err, setErr] = useState<{ msg: string; hint?: string; iframe?: boolean } | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [active, setActive] = useState(false);

  const inIframe = typeof window !== "undefined" && window.self !== window.top;
  const secure = typeof window !== "undefined" ? window.isSecureContext : true;

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setErr(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErr({
        msg: !secure ? "Insecure context" : "Camera API unavailable",
        hint: !secure
          ? "Camera needs HTTPS or http://localhost. On iPad over the LAN IP it's blocked — use a localhost tunnel / HTTPS, or the deployed site."
          : "This browser blocks getUserMedia here.",
        iframe: inIframe,
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      });
      streamRef.current = stream;
      setLabel(stream.getVideoTracks()[0]?.label || "webcam");
      setActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      // labels populate only after permission is granted
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices(list.filter((d) => d.kind === "videoinput"));
      } catch {
        /* ignore */
      }
    } catch (e) {
      const name = (e as { name?: string })?.name;
      if (name === "NotAllowedError") {
        setErr({
          msg: "Camera permission denied",
          hint: inIframe
            ? "This page is embedded in a preview frame that can't access the camera. Open it in a real browser tab."
            : "The browser blocked the camera for this site. Click the camera icon in the address bar → Allow → reload.",
          iframe: inIframe,
        });
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setErr({ msg: "No camera found", hint: "No video input is available (or the selected device is gone)." });
      } else if (name === "NotReadableError") {
        setErr({ msg: "Camera busy", hint: "Another app is using the camera. Close it and retry." });
      } else {
        setErr({ msg: "Camera unavailable", hint: (e as Error)?.message });
      }
    }
  }, [deviceId, inIframe, secure]);

  useEffect(() => {
    if (src === "webcam") start();
    return () => stop();
  }, [src, start, stop]);

  const showWebcam = src === "webcam" && active && !err;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-gradient-to-b from-[#0a1626] via-[#0a1018] to-[#05080e]", className)}>
      <ViewBadge>Camera · {src === "webcam" ? "Local webcam (test)" : "Tower 30X optic"}</ViewBadge>

      {/* source selector + device picker */}
      <div className="absolute right-3 top-3 z-20 flex items-center gap-2">
        {src === "webcam" && devices.length > 1 && (
          <select
            value={deviceId ?? ""}
            onChange={(e) => setDeviceId(e.target.value || undefined)}
            className="h-7 max-w-[140px] rounded border border-cyan-500/20 bg-black/60 px-1 text-[10px] text-cyan-100"
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
            ))}
          </select>
        )}
        <div className="flex overflow-hidden rounded-md border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wide">
          {(["tower", "webcam"] as Src[]).map((s) => (
            <button key={s} type="button" onClick={() => setSrc(s)} className={cn("px-2.5 py-1 transition-colors", src === s ? "bg-cyan-500/20 text-cyan-100" : "bg-black/40 text-slate-400 hover:text-slate-200")}>
              {s === "tower" ? "Tower" : "Webcam"}
            </button>
          ))}
        </div>
      </div>

      {/* feed */}
      {showWebcam ? (
        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" />
      ) : cam.active && cam.streamUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cam.streamUrl} alt="Psathyrella tower camera" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-px w-[180%] bg-cyan-400/25" style={{ transform: `translate(-50%,-50%) rotate(${tilt}deg)` }} />
        </div>
      )}

      {/* bearing */}
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

      <div className="absolute bottom-3 right-3 z-10 flex gap-4 font-mono text-[11px] text-cyan-200/90">
        <span>ZOOM {src === "webcam" ? "1x" : cam.zoom ? `${cam.zoom}x` : "—"}</span>
        <span>TILT {Math.round(tilt)}°</span>
      </div>

      {/* webcam error / recovery panel */}
      {src === "webcam" && err && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/55 text-center">
          <Video className="h-7 w-7 text-amber-300/80" />
          <div className="text-sm font-bold uppercase tracking-[0.15em] text-amber-300">{err.msg}</div>
          {err.hint && <div className="max-w-md px-4 text-[12px] leading-relaxed text-slate-300">{err.hint}</div>}
          <div className="mt-1 flex gap-2">
            <button onClick={() => start()} className="flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase text-cyan-100 hover:bg-cyan-500/20">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
            {err.iframe && (
              <button onClick={() => window.open(window.location.href, "_blank", "noopener")} className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase text-amber-100 hover:bg-amber-500/20">
                <ExternalLink className="h-3.5 w-3.5" /> Open in tab
              </button>
            )}
          </div>
        </div>
      )}

      {src === "tower" && !cam.active && <NoFeed label="No Camera Feed" sub="Sony 30X telescopic — awaiting Jetson video" />}
    </div>
  );
}
