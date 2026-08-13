"use client";

/**
 * LiveFeedSurface — ONE proxied camera stream plus the REAL detection overlay for that stream.
 *
 * Extracted so the small camera windows elsewhere in the GCS (BlueSight's quad) get the same
 * discipline the full-size camera views already have, instead of growing a second, divergent
 * implementation. It is deliberately a thin composition of the pipeline that already exists:
 *
 *  - PIXELS come from the same-origin owner-gated proxy (never a raw Jetson IP) so HTTPS/iPad work.
 *  - BOXES come ONLY from useCameraDetections for the feed whose COORDINATE SPACE this surface is
 *    showing, and are drawn by DetectionOverlay with the SAME `fit` the <img> uses. Nothing here
 *    synthesizes a detection, a confidence, a class or a box — no detector, no overlay. A drawn box
 *    is always a box the backend reported.
 *  - Every box passes through the maritime ontology before the operator sees it, so a COCO leaf
 *    ("bottle" is what this buoy most often calls its OWN tower hardware) arrives demoted to
 *    "Unclassified contact" rather than as a named contact.
 *  - PROVENANCE is shown, never assumed: the engine string is whatever the frame reported, and the
 *    R&D badge is FAIL-SAFE — it appears unless the backend affirmatively declares the running model
 *    validated/production. Absence of a validation claim is not a validation.
 *
 * ANTI-FLAP (this cost a full day once): the rig status poll rides the same flaky link as the video.
 * A single failed poll flipping `online` to false must NEVER unmount the <img> — that tears down the
 * live MJPEG socket and reads to the operator as "the camera turned itself off". We hold the element
 * mounted through a grace window and show a RECONNECTING chip; only a sustained outage with no
 * frames earns the honest offline card.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import DetectionOverlay, { type OverlayFit } from "./DetectionOverlay";
import { useCameraDetections } from "@/lib/psathyrella/useCameraDetections";
import { classifyDetection, shouldSurface } from "@/lib/psathyrella/maritimeOntology";

/** Sustained outage before a live surface is declared dead (matches Quad360View / TargetView). */
const OFFLINE_GRACE_MS = 20000;
/** First load has its own, shorter grace — the rig poll has not answered yet, so `online` is still
 *  its default false and a hard "OFFLINE" for the first seconds of every page load is a lie. */
const CONNECT_GRACE_MS = 9000;
/** A stalled/dropped socket re-opens on a fresh nonce; the proxy retries upstream for us. */
const RETRY_MS = 2000;

export interface LiveFeedSurfaceProps {
  /** Operator-visible name of this surface, e.g. "360° Panorama". */
  title: string;
  /** Same-origin proxy path from the rig contract. null = the backend offered no URL for it. */
  src: string | null;
  /** The rig status poll's opinion. ADVISORY ONLY — see the anti-flap note above. */
  online: boolean;
  /** How the <img> presents the frame. The overlay inverts this SAME fit, so they cannot disagree. */
  fit: OverlayFit;
  /** Detection feed id — MUST be the space the boxes were computed in ("quad360" | "front" | "pano" | "bev"). */
  feedId: string;
  /** Operator's AI toggle. The hook is additionally dark unless NEXT_PUBLIC_PSATHYRELLA_CAM_AI=1. */
  showAi: boolean;
  /** Parent visibility — stops detection polling and error-retries while this surface is not on screen. */
  active: boolean;
  /** Backend-declared frame dims, used only as a fallback when the stream hasn't reported its own. */
  srcW?: number | null;
  srcH?: number | null;
  /** Re-poll the rig (parent SWR) so a camera that just came up on the Jetson is picked up. */
  onReconnect?: () => void;
  /** Fired once when this surface is declared hard-offline, so a parent can fall back to another one. */
  onUnavailable?: () => void;
  /** Shown when the rig never offered a URL at all. */
  unavailableHint?: string;
  className?: string;
}

export default function LiveFeedSurface({
  title,
  src,
  online,
  fit,
  feedId,
  showAi,
  active,
  srcW = null,
  srcH = null,
  onReconnect,
  onUnavailable,
  unavailableHint,
  className,
}: LiveFeedSurfaceProps) {
  const [imgErr, setImgErr] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [everLive, setEverLive] = useState(false);
  const [hardOffline, setHardOffline] = useState(false);
  const [measured, setMeasured] = useState<{ w: number | null; h: number | null }>({ w: null, h: null });
  const lastFrameAtRef = useRef(0);
  const mountedAtRef = useRef(0);
  if (mountedAtRef.current === 0) mountedAtRef.current = Date.now();

  // Anti-flap, URL edition: hold the last non-null URL the rig gave us. A poll that answers late (or
  // errors while SWR still holds an empty rig) must not null the src and tear down a working stream.
  const [heldSrc, setHeldSrc] = useState<string | null>(src);
  useEffect(() => {
    if (src && src !== heldSrc) setHeldSrc(src);
  }, [src, heldSrc]);
  const base = src ?? heldSrc;
  /*
   * Gated on `active`: an INACTIVE surface must not hold an MJPEG socket open.
   *
   * CenterViewport keeps every view mounted and merely applies `invisible`, and `visibility: hidden`
   * does not stop a stream. So BlueSight's pano + target surfaces kept streaming for the whole
   * session while the operator was on another tab, on top of FusionPlot's own pano strip.
   *
   * Measured Aug 03 with the console idle on one tab: FIVE concurrent MJPEG connections to the one
   * Jetson camera service and FIFTEEN connections held open on the Next dev server. Those streams
   * never complete, so they occupy the single-process dev server indefinitely and every other route
   * queues behind them — `/api/psathyrella/camera` took 15–21 s and link-status/telemetry exceeded
   * 30 s, while the SAME upstreams answered in 8–25 ms by curl. That starvation is what put the
   * "WiFi DOWN" lamp on a healthy radio, emptied the signal bars, stalled telemetry, and cycled the
   * video — one cause behind four symptoms that each looked like separate hardware faults.
   *
   * This is NOT a retreat from the anti-flap rule: that forbids a flaky STATUS POLL from tearing
   * down live video. This responds to the operator navigating away, which is a deliberate signal.
   * Cost is one reconnect when the surface comes back.
   */
  const streamSrc = active && base ? `${base}?n=${nonce}` : null;

  // A genuinely DIFFERENT source (the parent swapped this surface from the pano to the raw ring
  // composite, say — not a reconnect nonce) invalidates everything we learned about the old one.
  // The frame dims matter most: normalizing a 1920×1080 composite box against the pano's 3840×540
  // would place a contact on the wrong bearing for as long as the stale dims survive.
  const prevBaseRef = useRef(base);
  useEffect(() => {
    if (prevBaseRef.current === base) return;
    prevBaseRef.current = base;
    setMeasured({ w: null, h: null });
    setEverLive(false);
    setImgErr(false);
    setHardOffline(false);
    mountedAtRef.current = Date.now();
  }, [base]);

  const live = online && !imgErr;

  useEffect(() => {
    if (live) { setHardOffline(false); return; }
    if (!everLive) {
      const waited = Date.now() - mountedAtRef.current;
      if (waited >= CONNECT_GRACE_MS) { setHardOffline(true); return; }
      const t = window.setTimeout(() => setHardOffline(true), CONNECT_GRACE_MS - waited);
      return () => clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      // Frames still arriving ⇒ the status poll was lying, not the camera.
      setHardOffline(Date.now() - lastFrameAtRef.current >= OFFLINE_GRACE_MS);
    }, OFFLINE_GRACE_MS);
    return () => clearTimeout(t);
  }, [live, everLive]);

  // Tell the parent ONCE per outage, so a fallback (e.g. pano → raw composite) can be chosen without
  // the callback identity re-firing it every render.
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (!hardOffline) { notifiedRef.current = false; return; }
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    onUnavailable?.();
  }, [hardOffline, onUnavailable]);

  useEffect(() => {
    if (!imgErr || !active) return;
    const t = window.setTimeout(() => { setImgErr(false); setNonce((n) => n + 1); }, RETRY_MS);
    return () => clearTimeout(t);
  }, [imgErr, active]);

  // MEASURED dims win over the rig's declared width/height: they describe the bytes actually on
  // screen, and a box normalized against a stale configured resolution sits on the wrong bearing.
  const frameW = measured.w ?? srcW;
  const frameH = measured.h ?? srcH;

  const ai = useCameraDetections(feedId, { enabled: showAi && active, frameW, frameH });
  const dets = useMemo(
    () =>
      (ai.frame?.detections ?? [])
        .map((d) => ({ d, c: classifyDetection(d.cls) }))
        .filter(({ c }) => shouldSurface(c))
        .map(({ d, c }) => ({ ...d, cls: c.displayLabel })),
    [ai.frame],
  );
  // FAIL-SAFE: badge unless the backend affirmatively claims the model is validated/production.
  const unvalidated = !ai.license || !/validated|production/i.test(ai.license);
  const engine = ai.frame?.model ?? null;

  const reconnect = () => {
    setImgErr(false);
    setHardOffline(false);
    mountedAtRef.current = Date.now();
    setNonce((n) => n + 1);
    onReconnect?.();
  };

  const chipBase = "pointer-events-none rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide";

  if (!base) {
    return (
      <div className={cn("relative flex h-full w-full flex-col items-center justify-center gap-1 bg-black px-3 text-center", className)}>
        <Video className="h-4 w-4 text-slate-600" />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{title} · no feed</span>
        {unavailableHint && <span className="max-w-[22rem] text-[9px] leading-relaxed text-slate-600">{unavailableHint}</span>}
      </div>
    );
  }

  if (hardOffline) {
    return (
      <div className={cn("relative flex h-full w-full flex-col items-center justify-center gap-1.5 bg-black px-3 text-center", className)}>
        <Video className="h-4 w-4 text-amber-300/70" />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300">{title} offline</span>
        {unavailableHint && <span className="max-w-[22rem] text-[9px] leading-relaxed text-slate-500">{unavailableHint}</span>}
        <button
          type="button"
          onClick={reconnect}
          className="mt-0.5 flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-cyan-100 hover:bg-cyan-500/20"
        >
          <RefreshCw className="h-2.5 w-2.5" /> Reconnect
        </button>
      </div>
    );
  }

  const connecting = !everLive;
  const reconnecting = everLive && !live;

  return (
    // position:relative is REQUIRED — DetectionOverlay renders absolute/inset-0 against this box.
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      {streamSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={streamSrc}
          src={streamSrc}
          alt={title}
          className={cn("h-full w-full", fit === "cover" ? "object-cover" : "object-contain")}
          onError={() => setImgErr(true)}
          onLoad={(e) => {
            lastFrameAtRef.current = Date.now();
            if (!everLive) setEverLive(true);
            const el = e.currentTarget;
            if (el.naturalWidth > 0 && (measured.w !== el.naturalWidth || measured.h !== el.naturalHeight)) {
              setMeasured({ w: el.naturalWidth, h: el.naturalHeight });
            }
          }}
        />
      )}

      {/* Real boxes only. Empty payload ⇒ empty overlay — never a placeholder. */}
      {showAi && ai.enabled && dets.length > 0 && (
        <DetectionOverlay detections={dets} srcW={frameW} srcH={frameH} fit={fit} />
      )}

      <span className="pointer-events-none absolute left-1 top-1 z-20 rounded bg-black/65 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-cyan-300/85">
        {title}
      </span>

      {(connecting || reconnecting) && (
        <span className={cn(chipBase, "absolute right-1 top-1 z-20 flex items-center gap-1 border-amber-400/40 bg-amber-500/15 text-amber-200")}>
          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
          {connecting ? "Connecting" : "Reconnecting"}
        </span>
      )}

      {/* ── MODEL PROVENANCE — what actually produced these boxes, or an honest standby. ── */}
      <div className="pointer-events-none absolute bottom-1 left-1 z-20 flex flex-wrap items-center gap-1">
        {!showAi ? null : !ai.enabled ? (
          <span className={cn(chipBase, "border-white/10 bg-black/60 text-slate-500")} title="Set NEXT_PUBLIC_PSATHYRELLA_CAM_AI=1 to enable the detector overlay.">
            AI off
          </span>
        ) : !ai.connected ? (
          <span className={cn(chipBase, "border-amber-400/40 bg-black/70 text-amber-200/90")}>Detector unreachable</span>
        ) : (
          <>
            <span className={cn(chipBase, "border-cyan-500/30 bg-black/70 text-cyan-200/90")}>
              {dets.length} det{engine ? ` · ${engine}` : " · engine unreported"}
            </span>
            {unvalidated && (
              <span
                className={cn(chipBase, "pointer-events-auto border-amber-400/50 bg-amber-500/20 text-amber-200")}
                title={`${ai.license ?? "Backend reported no model licence/validation status."}

Model: ${engine ?? "unknown"}
Unvalidated R&D weights — treat every classification as a hypothesis, not an identification.`}
              >
                R&D model
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
