"use client";

/**
 * Tower camera viewport. Two real feeds plus a dev-only webcam.
 *
 *  - "quad360" (360°) — the four IMX519 ring cameras. ONE composite MJPEG stream is decoded once and
 *    software-stitched into four canvas tiles (Quad360View), rather than four sockets.
 *  - "front" (TARGET) — the IMX477 HQ forward optic, the Sony 30x stand-in, carrying the visor HUD.
 *    PTZ is digital today (CSS crop) and becomes optical when the Sony lands; same commands either way.
 *  - "webcam" — this machine's getUserMedia. A DEV-ONLY bench aid, hidden off localhost.
 *
 * ══ WHY THIS FILE WAS REBUILT (Aug 04) ═══════════════════════════════════════════════════════════
 * This is the wiring that mounts Quad360View and TargetView. It was lost when a git operation in the
 * shared worktree reverted TRACKED files to their branch copy. The ten untracked component files
 * (Quad360View, TargetView, VisorFrame, VisorHud, FusionPlot, SensorsPanel, CompassRose,
 * DetectionOverlay, SensorStatsPanel, FilterControls — ~5,900 lines) survived untouched precisely
 * BECAUSE they were untracked; this one did not, because it was tracked and uncommitted.
 *
 * The lesson worth keeping: uncommitted work in a tree another agent commits to has no protection.
 * This console belongs on its own branch, committed.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from "swr";
import {
  emptyCameraRig,
  type BuoyCommand,
  type BuoyTelemetry,
  type CameraFeed,
  type CameraRig,
} from "@/lib/psathyrella/contract";
import { ViewBadge } from "@/components/psathyrella/ui";
import Quad360View from "./Quad360View";
import TargetView from "./TargetView";

type CamTab = "quad360" | "front" | "webcam";

const fetcher = (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json());

/** Resolve a feed by id without depending on array order — the rig can come back in any order. */
function pickFeed(feeds: CameraFeed[], id: string): CameraFeed {
  const fallback = emptyCameraRig().feeds;
  return feeds.find((f) => f.id === id) ?? fallback.find((f) => f.id === id) ?? fallback[0];
}

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
  const { data: rig, mutate: mutateRig } = useSWR<CameraRig>("/api/psathyrella/camera", fetcher, {
    refreshInterval: 8000,
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const feeds = rig?.feeds ?? emptyCameraRig().feeds;
  const quadFeed = pickFeed(feeds, "quad360");
  const frontFeed = pickFeed(feeds, "front");

  /*
   * The webcam is a bench aid, not a vehicle sensor. Offering it in the field would put a laptop
   * camera one click from the operator's optic selector, so it is gated to localhost or a flag.
   */
  const devWebcam = useMemo(() => {
    if (typeof window === "undefined") return false;
    if (process.env.NEXT_PUBLIC_PSATHYRELLA_CAM_DEV === "1") return true;
    return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  }, []);

  const [tab, setTab] = useState<CamTab>("quad360");
  useEffect(() => {
    if (tab === "webcam" && !devWebcam) setTab("front");
  }, [tab, devWebcam]);

  const TABS: { id: CamTab; label: string }[] = [
    { id: "quad360", label: "360°" },
    { id: "front", label: "Target" },
    ...(devWebcam ? [{ id: "webcam" as CamTab, label: "Webcam" }] : []),
  ];

  // ── dev webcam ────────────────────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startWebcam = useCallback(async () => {
    setCamErr(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCamErr("Camera API unavailable in this context (needs HTTPS or localhost).");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      setCamErr((err as Error).message);
    }
  }, []);

  /*
   * Release the capture device whenever the webcam is not the visible tab. `visibility: hidden` does
   * NOT stop a getUserMedia stream, and a camera LED that stays lit while the operator is on another
   * view is both a privacy problem and alarming on a shared bench.
   */
  useEffect(() => {
    if (tab === "webcam" && visible) void startWebcam();
    else stopWebcam();
    return () => stopWebcam();
  }, [tab, visible, startWebcam, stopWebcam]);

  const onReconnect = useCallback(() => void mutateRig(), [mutateRig]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-[#04070e]", className)}>
      <ViewBadge>
        {tab === "quad360" ? "360° Ring" : tab === "front" ? "Target · IMX477" : "Webcam · dev"}
      </ViewBadge>

      {/*
        Optic selector at z-[70], deliberately: it must sit above the Target view's own toolbar
        (z-60) and its HUD (z-50). A control that switches views must never be occluded by the view
        it switches into — that exact regression cost a debugging round already.
      */}
      <div className="absolute right-3 top-[4px] z-[70] flex items-center gap-2">
        <div className="flex overflow-hidden rounded-md border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wide">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-2.5 py-1 transition-colors",
                tab === t.id ? "bg-cyan-500/20 text-cyan-100" : "bg-black/40 text-slate-400 hover:text-slate-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/*
        Both real views stay MOUNTED and hide with `invisible`, so switching tabs does not tear down
        and re-establish an MJPEG connection each time. `active` is what actually gates their polling
        and streams — visibility alone does not stop a stream.
      */}
      <div className={cn("absolute inset-0", tab === "quad360" ? "" : "pointer-events-none invisible")}>
        <Quad360View
          feed={quadFeed}
          telemetry={telemetry}
          active={visible && tab === "quad360"}
          onReconnect={onReconnect}
        />
      </div>

      <div className={cn("absolute inset-0", tab === "front" ? "" : "pointer-events-none invisible")}>
        <TargetView
          feed={frontFeed}
          telemetry={telemetry}
          active={visible && tab === "front"}
          sendCommand={sendCommand}
          onReconnect={onReconnect}
        />
      </div>

      {tab === "webcam" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          {camErr ? (
            <div className="max-w-md px-6 text-center">
              <VideoOff className="mx-auto mb-3 h-8 w-8 text-amber-300/80" />
              <p className="text-sm font-bold uppercase tracking-wider text-amber-200">Webcam unavailable</p>
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-400">{camErr}</p>
              <button
                type="button"
                onClick={() => void startWebcam()}
                className="mt-4 inline-flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-cyan-100"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry
              </button>
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
              <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded border border-amber-400/40 bg-amber-500/15 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-200">
                <Video className="mr-1 inline h-3 w-3" />
                Dev webcam — not a vehicle sensor
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
