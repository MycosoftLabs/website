"use client";

import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import useSWR from "swr";
import { RefreshCw, Video, Grid2x2, PanelTop, Radar, Plus, Minus, Sliders, ScanSearch, Maximize2, Minimize2, EyeOff, Activity, Layers } from "lucide-react";
import { RING_FACES, type BuoyTelemetry, type CameraFeed } from "@/lib/fusarium/gcs/contract";
import { cn } from "@/lib/utils";
import { cssFilter, DEFAULT_FILTER_STATE, isFilterActive, filterSummary, type VideoFilterState } from "@/lib/fusarium/gcs/videoFilters";
import FilterControls from "@/components/fusarium/gcs/camera/FilterControls";
import DetectionOverlay from "@/components/fusarium/gcs/camera/DetectionOverlay";
import { useCameraDetections } from "@/lib/fusarium/gcs/useCameraDetections";
import { classifyDetection, shouldSurface } from "@/lib/fusarium/gcs/maritimeOntology";
import { useContactIntel } from "@/lib/fusarium/gcs/useContactIntel";
import { useMotionDetect } from "@/lib/fusarium/gcs/useMotionDetect";
import { useModelComparison } from "@/lib/fusarium/gcs/useModelComparison";
import { useMagnetometer } from "@/lib/fusarium/gcs/useMagnetometer";
import { fuseModels } from "@/lib/fusarium/gcs/modelFusion";
import ModelComparisonPanel from "@/components/fusarium/gcs/camera/ModelComparisonPanel";

/**
 * 360° ring view — the four IMX519 tower cameras (mounted 90° apart: bow/stbd/aft/port).
 *
 * LAYOUT (one window, nothing hidden behind a tab): the Jetson-stitched surround view sits ON TOP,
 * the four raw camera tiles sit BELOW it, and every surface carries its own controls. The operator
 * sees the whole ring and the individual faces at once — switching between them was costing context.
 *
 * WHERE THE PIXELS COME FROM:
 *  - tiles  — the Camarray HAT frame-syncs all four sensors into ONE composite MIPI stream, so we open
 *    a SINGLE connection (one hidden <img> MJPEG) and blit the four sub-tiles to four canvases: one
 *    decode, four crops. Near-zero cost, no calibration, always available.
 *  - pano / bev — stitched ON THE JETSON (CUDA). The browser only displays them. Heavy warp+blend
 *    belongs on the GPU next to the sensor, not in a canvas over a WAN.
 *
 * AI overlay: boxes come from the Jetson detector and are drawn ONLY on the surface whose coordinate
 * space they were computed in (today: the ring composite → the tiles). We do not re-project ring boxes
 * onto the pano/BEV — the stitch geometry is the Jetson's and guessing it would put a contact on the
 * wrong bearing. When the backend reports pano/BEV-space boxes, they light up there too.
 */

/**
 * ══ COMBAT-HUD PRIMITIVES ═════════════════════════════════════════════════════════════════════
 * Angular, glowing, monospaced — the visual language of a vehicle head-up display rather than a
 * dashboard widget. Chamfered corners come from a clip-path so they stay crisp at any size.
 *
 * THE ONE RULE THESE ENFORCE: a null datum renders as an em-dash, never as a zero. On a HUD an
 * invented number is indistinguishable from a measured one, and "0 kn" versus "we do not know the
 * speed" are different facts. This console has already deleted one feature for blurring that line.
 */
const HUD_CHAMFER = "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)";

function HudCell({ label, value, unit, tone, title, wide }: {
  label: string; value: string | number | null; unit?: string; tone?: string; title?: string; wide?: boolean;
}): JSX.Element {
  const known = value !== null && value !== undefined && value !== "";
  return (
    <div className={cn("flex min-w-0 flex-col leading-none", wide && "min-w-[76px]")} title={title}>
      <span className="text-[7px] font-bold tracking-[0.2em] text-cyan-300/50">{label}</span>
      <span
        className={cn(
          "mt-0.5 truncate font-mono text-[13px] font-bold tabular-nums",
          known ? (tone ?? "text-cyan-100") : "text-slate-600",
        )}
        style={known ? { textShadow: "0 0 8px rgba(34,211,238,0.55)" } : undefined}
      >
        {known ? value : "\u2014"}
        {known && unit ? <span className="ml-0.5 text-[8px] font-normal text-cyan-300/55">{unit}</span> : null}
      </span>
    </div>
  );
}

/** Segmented bar — reads as a gauge at a glance, and shows NOTHING when the value is unknown. */
function HudBar({ pct, tone }: { pct: number | null; tone?: string }): JSX.Element {
  const segs = 8;
  const lit = pct === null ? -1 : Math.round((Math.max(0, Math.min(100, pct)) / 100) * segs);
  return (
    <div className="mt-1 flex gap-[2px]" aria-hidden>
      {Array.from({ length: segs }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-[3px] w-[5px] skew-x-[-20deg]",
            pct === null ? "bg-slate-700/60" : i < lit ? (tone ?? "bg-cyan-400") : "bg-cyan-400/15",
          )}
          style={pct !== null && i < lit ? { boxShadow: "0 0 5px rgba(34,211,238,0.7)" } : undefined}
        />
      ))}
    </div>
  );
}

/** Thin bracketed divider between HUD groups. */
function HudDiv(): JSX.Element {
  return <span className="h-7 w-px shrink-0 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent" aria-hidden />;
}


/**
 * Ranging sensors for the HUD: TF-Luna single-point ToF and the LD2450 mmWave.
 *
 * These are the only readouts on this screen that say what is physically AROUND the buoy, which is
 * exactly what a 360° camera view is for. Heading/speed live on the nav compass, thrusters on the
 * nav panel, radios on the comms rail, power on the status bar — repeating any of those here would
 * spend the most valuable strip on the console saying something already on it.
 *
 * Both endpoints are honest-empty by contract, and this hook preserves that: a sensor that is present
 * but reporting no usable return is NOT the same as an absent one, and neither is "clear".
 */
function useHudSensors(active: boolean) {
  const probe = async (u: string) => {
    const r = await fetch(u, { cache: "no-store" });
    return { status: r.status, body: (await r.json().catch(() => null)) as unknown };
  };
  const opts = { refreshInterval: 4000, revalidateOnFocus: false, dedupingInterval: 3500, keepPreviousData: true };
  const { data: tof } = useSWR(active ? "/api/fusarium/gcs/fusion-sensors/points" : null, probe, opts);
  const { data: mmw } = useSWR(active ? "/api/fusarium/gcs/fusion-sensors/mmwave" : null, probe, opts);

  const rec = (p: typeof tof) => (p && p.status === 200 && typeof p.body === "object" && p.body !== null ? (p.body as Record<string, unknown>) : null);
  const tb = rec(tof);
  const mb = rec(mmw);

  const tofPts = tb && Array.isArray(tb.points) ? (tb.points as Record<string, unknown>[]) : [];
  const tofValid = tofPts.filter((p) => typeof p.rangeM === "number");
  const mmTargets = mb && Array.isArray(mb.targets) ? (mb.targets as Record<string, unknown>[]) : [];
  const mmValid = mmTargets.filter((t) => t.valid === true && typeof t.rangeM === "number");

  return {
    tofPresent: tb?.hardware === "present",
    tofRangeM: tofValid.length ? (tofValid[0].rangeM as number) : null,
    tofReason: tofPts.length ? ((tofPts[0].invalidReason as string) ?? null) : null,
    mmPresent: mb?.hardware === "present",
    mmMaxRangeM: typeof mb?.maxRangeM === "number" ? (mb.maxRangeM as number) : 6,
    mmContacts: mmValid.map((t) => ({ bearingDeg: t.bearingDeg as number | null, rangeM: t.rangeM as number })),
  };
}

type StitchMode = "pano" | "bev" | "off";
type TileFit = "fill" | "fit";

interface TileState {
  zoom: number;
  fit: TileFit;
  filter: VideoFilterState;
  hidden: boolean;
}
const newTile = (): TileState => ({ zoom: 1, fit: "fill", filter: { ...DEFAULT_FILTER_STATE }, hidden: false });

export default function Quad360View({
  feed,
  telemetry,
  active,
  onReconnect,
}: {
  feed: CameraFeed;
  telemetry: BuoyTelemetry;
  active: boolean;
  /** Re-poll the rig (parent SWR) so a camera that just came up on the Jetson is picked up. */
  onReconnect?: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const stitchImgRef = useRef<HTMLImageElement>(null);
  const tileRefs = useRef<Array<HTMLCanvasElement | null>>([null, null, null, null]);
  const [imgErr, setImgErr] = useState(false);
  const [stitchErr, setStitchErr] = useState(false);
  const [nonce, setNonce] = useState(0);
  const heading = Math.round(telemetry.pose.headingDeg ?? 0);

  const cols = feed.quad?.cols ?? 2;
  const rows = feed.quad?.rows ?? 2;
  // Memoized: a bare `?? [1,3,2,0]` literal is a NEW array every render, which would re-run the blit
  // effect (and tear down its timer) on every single render while video is streaming.
  const quadOrder = feed.quad?.tileOrder;
  const tileOrder = useMemo(() => quadOrder ?? [1, 3, 2, 0], [quadOrder]);
  const feedMounts = feed.mountBearingsDeg;
  const mounts = useMemo(() => feedMounts ?? [0, 90, 180, 270], [feedMounts]);
  const online = feed.online && !imgErr;
  /**
   * Gated on `active` so a HIDDEN tab stops streaming.
   *
   * CenterViewport keeps every view mounted and merely applies `invisible` — and `visibility: hidden`
   * does NOT stop an MJPEG stream. So this surface used to hold its socket open for the entire
   * session while the operator was on another tab. Measured Aug 03: four concurrent MJPEG
   * connections to the one Jetson camera service, including this one rendered at 1×1 px. Camera
   * services cap concurrent clients, and over that cap tiles blank and flicker — which is exactly
   * what was reported, and was very nearly blamed on the rig.
   *
   * This is NOT a retreat from the anti-flap rule below. That rule forbids a flaky STATUS POLL from
   * tearing down live video; this responds to the operator deliberately navigating away, which is a
   * real, intentional signal. Cost is one reconnect on tab switch — far cheaper than starving every
   * surface at once.
   */
  const compositeSrc = active && feed.streamUrl ? `${feed.streamUrl}?n=${nonce}` : null;

  // ── Per-surface operator state ──
  const [tiles, setTiles] = useState<TileState[]>(() => [newTile(), newTile(), newTile(), newTile()]);
  const [soloTile, setSoloTile] = useState<number | null>(null);
  const [openPanel, setOpenPanel] = useState<string | null>(null); // which filter popover is open
  const [stitchFilter, setStitchFilter] = useState<VideoFilterState>({ ...DEFAULT_FILTER_STATE });
  const [showAi, setShowAi] = useState(true);
  // Live BMM150 for the HUD field readout. Shares the SWR cache with the nav panel, so this
  // is one poll for the whole console rather than a second one.
  const { magnetometer } = useMagnetometer(active);
  const hud = useHudSensors(active);
  const [srcDims, setSrcDims] = useState<{ w: number | null; h: number | null }>({ w: null, h: null });

  const patchTile = (i: number, patch: Partial<TileState>) =>
    setTiles((prev) => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  // Which stitched views the Jetson is actually serving (calibrated + URL present).
  //
  // STICKY, for the same reason the video is: `calibrated` comes from the rig health probe, and that
  // probe rides the flaky dev-PC→Jetson link. One failed probe used to reset calibrated→false, which
  // pulled the Pano/BEV chips out of the toolbar and let the fallback effect below knock the mode to
  // "off" — the surround view would silently disappear mid-session and not come back. Once the Jetson
  // has told us a view is real, we keep offering it; a genuinely dead stream shows its own error.
  // Availability = the Jetson is SERVING the stream. Calibration quality is badged, never a gate —
  // hiding a provisional surround view is worse than showing it with an honest caveat.
  const livePano = Boolean(feed.stitch?.panoUrl);
  const liveBev = Boolean(feed.stitch?.bevUrl);
  const provisional = feed.stitch != null && feed.stitch.calibrated !== true;
  const [sawPano, setSawPano] = useState(false);
  const [sawBev, setSawBev] = useState(false);
  useEffect(() => { if (livePano) setSawPano(true); }, [livePano]);
  useEffect(() => { if (liveBev) setSawBev(true); }, [liveBev]);
  const hasPano = livePano || sawPano;
  const hasBev = liveBev || sawBev;

  const [stitchMode, setStitchMode] = useState<StitchMode>("pano");
  useEffect(() => {
    // Fall back only when a view was NEVER available — not when it transiently drops out.
    if (stitchMode === "pano" && !hasPano) setStitchMode(hasBev ? "bev" : "off");
    else if (stitchMode === "bev" && !hasBev) setStitchMode(hasPano ? "pano" : "off");
  }, [stitchMode, hasPano, hasBev]);

  const stitchUrl = stitchMode === "pano" ? feed.stitch?.panoUrl : stitchMode === "bev" ? feed.stitch?.bevUrl : null;
  const stitchSrc = stitchUrl ? `${stitchUrl}?n=${nonce}` : null;
  const stitchVisible = stitchMode !== "off" && Boolean(stitchSrc) && !stitchErr;

  // ── AI detections (dark unless NEXT_PUBLIC_FUSARIUM_GCS_CAM_AI=1). Boxes arrive in PIXELS on the
  // composite, so the hook needs the live frame dims to normalize — no dims, no boxes. ──
  const ai = useCameraDetections("quad360", { enabled: showAi && active, frameW: srcDims.w, frameH: srcDims.h });
  // Run every box through the maritime ontology before it reaches the operator: the COCO-80 detector
  // force-maps unfamiliar shapes onto indoor classes (it calls our own tower hardware "bottle"), and an
  // operator console must not present those as identified contacts. Raw class is kept for audit.
  const dets = useMemo(() => (ai.frame?.detections ?? [])
    .map((d) => ({ d, c: classifyDetection(d.cls) }))
    .filter(({ c }) => shouldSurface(c))
    .map(({ d, c }) => ({ ...d, cls: c.displayLabel })), [ai.frame]);

  // Detections computed ON the stitched surface itself. We deliberately do NOT re-project ring-composite
  // boxes onto the pano/BEV — that stitch geometry belongs to the Jetson, and guessing it would put a
  // contact on the wrong bearing. These only appear once the backend tags boxes with that source.
  const stitchAi = useCameraDetections(stitchMode === "off" ? "quad360" : stitchMode, {
    enabled: showAi && active && stitchMode !== "off",
  });
  const stitchDets = useMemo(() => (stitchMode === "off" ? [] : (stitchAi.frame?.detections ?? [])
    .map((d) => ({ d, c: classifyDetection(d.cls) }))
    .filter(({ c }) => shouldSurface(c))
    .map(({ d, c }) => ({ ...d, cls: c.displayLabel }))), [stitchAi.frame, stitchMode]);

  // ── MODEL-FREE MOTION ──────────────────────────────────────────────────────────────────────
  // The classifier can only report things it has words for. A spinning object with no matching class
  // was invisible to the ENTIRE pipeline, because every other layer keys off a detection box. This
  // watches the panorama for change directly — no model, no vocabulary — so an UNKNOWN mover (which is
  // usually the more interesting one) still reaches the operator. It reports motion, never identity.
  const [showMotion, setShowMotion] = useState(true);
  const motion = useMotionDetect(() => stitchImgRef.current, {
    enabled: showMotion && active && stitchVisible,
  });

  // ── MULTI-MODEL ENSEMBLE ───────────────────────────────────────────────────────────────────
  // One model cannot know it is hallucinating — ours reported "bird" at 0.95 indoors. Independent
  // agreement between differently-trained models IS evidence; a detection only one model sees is a
  // hypothesis. fuseModels corroborates ACROSS vocabularies via the maritime ontology, so RF-DETR's
  // "vessel" and COCO's "boat" count as the same object rather than two.
  const [showModels, setShowModels] = useState(false);
  const cmp = useModelComparison("quad360", { enabled: showModels && active });
  const fusion = useMemo(() => fuseModels(cmp.results), [cmp.results]);

  // ── Tactical picture: fold the stateless 1 Hz frames into persistent contacts ──
  // This is where the console stops being a box-viewer: temporal confirmation kills flicker, moored
  // scenery (our own tower) is learned and suppressed from observation, and a constant bearing with a
  // growing box is escalated as CBDR collision geometry rather than dismissed as background.
  const intelGeometry = useMemo(() => ({
    frameW: srcDims.w ?? 0, frameH: srcDims.h ?? 0, cols, rows, tileOrder,
    mountBearingsDeg: mounts, fovDeg: feed.fovDeg, headingDeg: telemetry.pose.headingDeg ?? null,
  }), [srcDims.w, srcDims.h, cols, rows, tileOrder, mounts, feed.fovDeg, telemetry.pose.headingDeg]);
  const intel = useContactIntel({
    tMs: ai.frame?.tMs ?? null,
    detections: ai.frame?.detections ?? [],
    source: "quad360",
    geometry: intelGeometry,
    enabled: showAi && ai.enabled && active,
  });

  // ── Anti-flap ──────────────────────────────────────────────────────────────────────────────
  // The rig status poll rides the same flaky dev-PC→Jetson link as the video, and a SINGLE failed poll
  // used to flip feed.online=false → unmount the <img> → kill the live MJPEG socket → remount on the
  // next good poll. That churn IS the "cameras turning on and off": the video was never down, the
  // status probe was. Once the ring has produced frames we hold the <img> mounted through a transient
  // outage and show a RECONNECTING chip instead of tearing down.
  const OFFLINE_GRACE_MS = 20000;
  // First load needs its own (shorter) grace: the rig poll hasn't answered yet, so `online` is still
  // the default false. Without this the operator sees a hard "RING OFFLINE" for the first few seconds
  // of every page load — worst on the iPad over WiFi, where it's the first thing on screen.
  const CONNECT_GRACE_MS = 9000;
  const [hardOffline, setHardOffline] = useState(false);
  const [everLive, setEverLive] = useState(false);
  const lastFrameAtRef = useRef(0);
  const mountedAtRef = useRef(0);
  if (mountedAtRef.current === 0) mountedAtRef.current = Date.now();

  useEffect(() => {
    if (online) { setHardOffline(false); return; }
    if (!everLive) {
      // Never had a frame: wait out the connect grace before calling it offline.
      const waited = Date.now() - mountedAtRef.current;
      if (waited >= CONNECT_GRACE_MS) { setHardOffline(true); return; }
      const t = window.setTimeout(() => setHardOffline(true), CONNECT_GRACE_MS - waited);
      return () => clearTimeout(t);
    }
    const t = window.setTimeout(() => {
      const framesRecently = Date.now() - lastFrameAtRef.current < OFFLINE_GRACE_MS;
      setHardOffline(!framesRecently); // frames still arriving ⇒ the status poll was lying
    }, OFFLINE_GRACE_MS);
    return () => clearTimeout(t);
  }, [online, everLive]);

  const streamMounted = !hardOffline;
  const reconnecting = streamMounted && !online;

  // A transient <img> error (stall / dropped socket) re-opens the stream rather than going offline —
  // the proxy already retries fresh upstream, so a new nonce gets a healthy connection.
  useEffect(() => {
    if (!imgErr || !active) return;
    const t = window.setTimeout(() => { setImgErr(false); setNonce((n) => n + 1); }, 2000);
    return () => clearTimeout(t);
  }, [imgErr, active]);

  // ── Tile blit loop ─ draw each ring tile's sub-rect of the composite while visible. Gated on
  // streamMounted (not `online`) so tiles keep painting through a transient status-poll outage. ──
  useEffect(() => {
    if (!active || !streamMounted) return;
    let timer = 0;
    let stop = false;
    const draw = () => {
      const img = imgRef.current;
      if (img && img.naturalWidth > 0 && !document.hidden) {
        lastFrameAtRef.current = Date.now();
        if (!everLive) setEverLive(true);
        if (srcDims.w !== img.naturalWidth || srcDims.h !== img.naturalHeight) {
          setSrcDims({ w: img.naturalWidth, h: img.naturalHeight });
        }
        const sw = img.naturalWidth / cols;
        const sh = img.naturalHeight / rows;
        for (let i = 0; i < 4; i++) {
          const cv = tileRefs.current[i];
          if (!cv || tiles[i]?.hidden) continue;
          const tileIdx = tileOrder[i] ?? i;
          const sx = (tileIdx % cols) * sw;
          const sy = Math.floor(tileIdx / cols) * sh;
          const ctx = cv.getContext("2d");
          if (!ctx) continue;
          const w = cv.clientWidth || 320;
          const h = cv.clientHeight || 240;
          // Size the BACKING STORE in device pixels, not CSS pixels. Without this the canvas renders at
          // 1x and the browser upscales it on a HiDPI display — the source of the "blurry tiles" (the
          // panorama looked sharper because it's an <img>, which the browser scales natively).
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
          if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
          ctx.imageSmoothingQuality = "high";

          const srcA = sw / sh, dstA = bw / bh;
          let cw = sw, ch = sh, cx = sx, cy = sy;
          if (tiles[i]?.fit === "fit") {
            // CONTAIN — letterbox, show the sensor's whole field of view, crop nothing.
            ctx.clearRect(0, 0, bw, bh);
            let dw = bw, dh = bh;
            if (srcA > dstA) dh = Math.round(bw / srcA); else dw = Math.round(bh * srcA);
            const dx = Math.round((bw - dw) / 2), dy = Math.round((bh - dh) / 2);
            const z = tiles[i]?.zoom ?? 1;
            if (z > 1) { const zw = cw / z, zh = ch / z; cx += (cw - zw) / 2; cy += (ch - zh) / 2; cw = zw; ch = zh; }
            try { ctx.drawImage(img, cx, cy, cw, ch, dx, dy, dw, dh); } catch { /* frame not ready */ }
          } else {
            // COVER — fill the tile, centre-cropping whichever axis overflows.
            if (srcA > dstA) { cw = sh * dstA; cx = sx + (sw - cw) / 2; }
            else { ch = sw / dstA; cy = sy + (sh - ch) / 2; }
            const z = tiles[i]?.zoom ?? 1;
            if (z > 1) { const zw = cw / z, zh = ch / z; cx += (cw - zw) / 2; cy += (ch - zh) / 2; cw = zw; ch = zh; }
            try { ctx.drawImage(img, cx, cy, cw, ch, 0, 0, bw, bh); } catch { /* frame not ready */ }
          }
        }
      }
      if (!stop) timer = window.setTimeout(() => requestAnimationFrame(draw), 50) as unknown as number;
    };
    draw();
    return () => { stop = true; clearTimeout(timer); };
  }, [active, streamMounted, everLive, cols, rows, tileOrder, tiles, srcDims.w, srcDims.h]);

  const reconnect = () => { setImgErr(false); setStitchErr(false); setNonce((n) => n + 1); onReconnect?.(); };

  if (hardOffline) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-[#0a1626] to-[#05080e] text-center">
        <Video className="h-7 w-7 text-amber-300/80" />
        <div className="text-sm font-bold uppercase tracking-[0.15em] text-amber-300">360° Ring Offline</div>
        <div className="max-w-md px-4 text-[12px] leading-relaxed text-slate-300">
          {feed.error ? feed.error : (
            <>Serve the 4× IMX519 Camarray composite on the Jetson and set{" "}
            <span className="font-mono text-cyan-200">PSATHYRELLA_CAM_QUAD360_URL</span> (or the{" "}
            <span className="font-mono text-cyan-200">:8792</span> service), then reconnect.</>
          )}
        </div>
        <button onClick={reconnect} className="mt-1 flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase text-cyan-100 hover:bg-cyan-500/20">
          <RefreshCw className="h-3.5 w-3.5" /> Reconnect
        </button>
      </div>
    );
  }

  // Connecting = mounted, no frame yet, not yet declared offline. Honest interim state (not "offline",
  // not a fake feed) so a slow first load reads as "working on it" rather than "the camera is dead".
  const connecting = !everLive && !hardOffline;

  const chip = "flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors";
  const chipOn = "border-cyan-500/50 bg-cyan-500/20 text-cyan-100";
  const chipOff = "border-white/10 bg-black/40 text-slate-400 hover:text-slate-200";

  return (
    <div className="relative flex h-full w-full flex-col bg-black" onClick={() => setOpenPanel(null)}>
      {/* the ONE composite stream connection — hidden; canvases read from it */}
      {compositeSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={imgRef} key={compositeSrc} src={compositeSrc} alt="" crossOrigin="anonymous" className="pointer-events-none absolute h-px w-px opacity-0" onError={() => setImgErr(true)} />
      )}

      {/* ── TOOLBAR — in-flow, so nothing is ever hidden underneath the tab buttons ── */}
      <div className="z-30 flex flex-wrap items-center gap-1.5 border-b border-cyan-500/15 bg-[#070d18]/95 px-2 py-1.5 pr-28">
        <span className="mr-1 text-[9px] font-bold uppercase tracking-wider text-cyan-400/60">Surround</span>
        {([["pano", "Pano", PanelTop, hasPano], ["bev", "BEV", Radar, hasBev], ["off", "Tiles only", Grid2x2, true]] as [StitchMode, string, typeof Grid2x2, boolean][])
          .filter(([, , , avail]) => avail)
          .map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={(e) => { e.stopPropagation(); setStitchMode(id); setStitchErr(false); }}
              className={cn(chip, stitchMode === id ? chipOn : chipOff)}>
              <Icon className="h-3 w-3" />{label}
            </button>
          ))}

        <span className="mx-1 h-3 w-px bg-white/10" />

        <button type="button" onClick={(e) => { e.stopPropagation(); setShowAi((v) => !v); }}
          className={cn(chip, showAi && ai.enabled ? chipOn : chipOff)}
          title={ai.enabled ? "Toggle AI detection boxes" : "AI overlay is off — set NEXT_PUBLIC_FUSARIUM_GCS_CAM_AI=1"}>
          <ScanSearch className="h-3 w-3" />AI{!ai.enabled && " off"}
        </button>
        {ai.enabled && showAi && (
          <span className="font-mono text-[9px] text-slate-500">
            {ai.connected ? `${dets.length} det${ai.frame?.model ? ` · ${ai.frame.model}` : ""}` : "detector unreachable"}
          </span>
        )}
        {ai.enabled && showAi && ai.license && !/validated|production/i.test(ai.license) && (
          // FAIL-SAFE: warn UNLESS the backend affirmatively declares the model validated. Absence of a
          // validation claim is not a validation. The live checkpoint is an RF-DETR fine-tune seeded from
          // 36 auto-labelled same-scene frames — pointed at an indoor room it reports "bird" at 0.95 and
          // "vessel" at 0.55. Those classes are legitimate maritime vocabulary, so the ontology layer
          // (which catches implausible COCO nouns) CANNOT demote them. This badge is what stops a
          // confidently-wrong contact from reading as a trustworthy one.
          <span className="rounded border border-amber-400/50 bg-amber-500/20 px-1 py-0.5 text-[8px] font-bold uppercase text-amber-200"
            title={`${ai.license}

Model: ${ai.frame?.model ?? "unknown"}
Unvalidated R&D weights — treat every classification as a hypothesis, not an identification.`}>
            R&D model
          </span>
        )}
        {ai.enabled && showAi && ai.connected && (
          <span className="flex items-center gap-1 font-mono text-[9px]">
            <span className="text-cyan-300/80">{intel.summary.confirmed} confirmed</span>
            {intel.summary.static > 0 && <span className="text-slate-500" title="Held a constant true bearing without growing — treated as moored scenery. Verify visually before dismissing.">{intel.summary.static} scenery</span>}
            {intel.summary.threats > 0 && (
              <span className={cn("rounded border px-1 py-0.5 font-bold uppercase",
                intel.summary.highest === "collision_risk" ? "border-red-500/60 bg-red-500/25 text-red-100" : "border-amber-400/50 bg-amber-500/20 text-amber-100")}>
                {intel.summary.highest === "collision_risk" ? "COLLISION RISK" : intel.summary.highest} ({intel.summary.threats})
              </span>
            )}
          </span>
        )}

        <span className="mx-1 h-3 w-px bg-white/10" />
        <button type="button" onClick={(e) => { e.stopPropagation(); setShowModels((v) => !v); }}
          className={cn(chip, showModels ? chipOn : chipOff)}
          title="Run detectors head-to-head. Agreement between independent models is evidence; a single-model detection is a hypothesis.">
          <Layers className="h-3 w-3" />Models{showModels && fusion.modelsRan > 0 ? ` ${fusion.modelsRan}` : ""}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); setShowMotion((v) => !v); }}
          className={cn(chip, showMotion ? chipOn : chipOff)}
          title="Model-free motion detection — finds movers the classifier has no class for. Reports motion, never identity.">
          <Activity className="h-3 w-3" />Motion
        </button>
        {showMotion && stitchVisible && (
          <span className="font-mono text-[9px] text-amber-200/80">
            {!motion.enabled ? "motion n/a"
              : motion.globalMotion ? "view moved"
              : motion.movers.length > 0 ? `${motion.movers.length} mover${motion.movers.length === 1 ? "" : "s"}`
              : "no motion"}
          </span>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); setTiles([newTile(), newTile(), newTile(), newTile()]); setStitchFilter({ ...DEFAULT_FILTER_STATE }); setSoloTile(null); }}
          className={cn(chip, chipOff)} title="Reset all tile zoom/fit/filters">
          <RefreshCw className="h-3 w-3" />Reset
        </button>
        {(reconnecting || connecting) && (
          <span className="ml-auto flex items-center gap-1 rounded border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-200">
            <RefreshCw className="h-3 w-3 animate-spin" />{connecting ? "Connecting" : "Reconnecting"}
          </span>
        )}
      </div>

      {/* ── STITCHED SURROUND VIEW (Jetson CUDA) — above the tiles, same window ──
           Height is 34%, not 44%: the two HUD bands are now IN FLOW inside this container and take a
           fixed ~60px between them, so the pano viewport is the remainder. At 34% that remainder
           lands close to the panorama's own 7:1 height at this width — which both fills the black
           space the pano used to letterbox AND hands the extra third to the 2×2 tile grid, where
           four 16:9 cameras actually need the room. */}
      {stitchMode !== "off" && (
        <div className="relative flex shrink-0 flex-col border-b border-cyan-500/15 bg-black" style={{ height: soloTile !== null ? "0" : "34%" }}>
          {/* ══ HUD — UPPER BAND: WHAT IS AROUND THE BUOY ═══════════════════════════
              Deliberately NOT a repeat of the rest of the console. Heading and speed are on the nav
              compass, thrusters on the nav panel, radios on the comms rail, power on the status bar
              — duplicating any of them here would spend the most valuable strip on the screen saying
              something already on it. This strip carries the one thing only the 360° view can frame:
              the picture around the hull.

              Every value is measured or counted. A present-but-silent sensor reads differently from
              an absent one, and neither reads as "clear". */}
          <div className="relative flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-cyan-400/25 bg-[#050a12] px-3 py-1"
            style={{ boxShadow: "inset 0 1px 0 rgba(34,211,238,0.22)" }}>

            {/* Source + calibration + FX live HERE, not pinned over the panorama.
                They used to be `absolute left-2 top-2` / `right-2 top-2` INSIDE the video, so every
                badge covered part of the only picture this pane exists to show. With the HUD bands in
                flow there is a proper home for them, and the video is left clean. */}
            <span className="shrink-0 border border-cyan-400/30 bg-black/50 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-200">
              {stitchMode === "pano" ? "360\u00b0 PANO" : "BEV"}
            </span>
            {provisional && (
              <span className="shrink-0 border border-amber-400/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200"
                title={feed.stitch?.qualityNote ?? "Geometric approximation \u2014 not a measured ground-plane calibration."}>
                PROVISIONAL
              </span>
            )}
            {isFilterActive(stitchFilter) && (
              <span className="shrink-0 border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                {filterSummary(stitchFilter)}
              </span>
            )}
            <button type="button" onClick={(e) => { e.stopPropagation(); setOpenPanel(openPanel === "stitch" ? null : "stitch"); }}
              className={cn("shrink-0 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                openPanel === "stitch" ? "border-cyan-400/60 bg-cyan-500/25 text-cyan-100" : "border-white/10 bg-black/40 text-slate-400 hover:text-slate-100")}
              title="Image adjustment">
              FX
            </button>
            {openPanel === "stitch" && (
              <div className="absolute right-3 top-full z-40 mt-1" onClick={(e) => e.stopPropagation()}>
                <FilterControls state={stitchFilter} onChange={setStitchFilter} onReset={() => setStitchFilter({ ...DEFAULT_FILTER_STATE })} />
              </div>
            )}

            <HudDiv />

            {/* mmWave — measures bearing AND range, so contacts are given as both. Movement only:
                a stationary hull or piling is invisible to it, which the empty state says out loud. */}
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-[7px] font-bold tracking-[0.2em] text-cyan-300/50">MMWAVE</span>
              {!hud.mmPresent ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-600">not framing</span>
              ) : hud.mmContacts.length === 0 ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500" title={`No movement inside ${hud.mmMaxRangeM} m. Static objects are invisible to this sensor — this is not an all-clear.`}>
                  no movement · {hud.mmMaxRangeM} m
                </span>
              ) : (
                hud.mmContacts.slice(0, 3).map((c, i) => (
                  <span key={i} className="skew-x-[-12deg] border border-amber-400/50 bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-amber-100"
                    style={{ boxShadow: "0 0 8px rgba(251,191,36,0.35)" }}>
                    <span className="inline-block skew-x-[12deg]">
                      {c.bearingDeg != null ? `${Math.round(c.bearingDeg)}°` : "—"} @ {c.rangeM.toFixed(1)}m
                    </span>
                  </span>
                ))
              )}
            </div>

            <HudDiv />

            {/* TF-Luna — single point, one fixed bearing. Range only when the strength gate passes. */}
            <HudCell label="PROX" wide
              value={hud.tofRangeM != null ? hud.tofRangeM.toFixed(2) : null} unit="m"
              tone={hud.tofRangeM != null && hud.tofRangeM < 1 ? "text-amber-300" : undefined}
              title={hud.tofPresent
                ? (hud.tofRangeM != null ? "TF-Luna range on its fixed bearing" : `TF-Luna present but no usable return${hud.tofReason ? ` · ${hud.tofReason}` : ""} — not a clear reading`)
                : "TF-Luna not fitted"} />

            <HudDiv />

            <HudCell label="TRACKS" value={intel.summary.confirmed} title="Temporally confirmed contacts" />
            <HudCell label="MOTION" value={motion.movers.length || null} tone="text-amber-300"
              title="Model-free frame differencing — movement with no class attached" />
            {intel.summary.static > 0 && (
              <HudCell label="SCENERY" value={intel.summary.static} tone="text-slate-400"
                title="Held a constant true bearing without growing — treated as moored scenery. Verify visually before dismissing." />
            )}
            {intel.summary.threats > 0 && (
              <span className={cn("skew-x-[-12deg] self-center border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]",
                intel.summary.highest === "collision_risk" ? "border-red-500/70 bg-red-500/30 text-red-100" : "border-amber-400/60 bg-amber-500/25 text-amber-100")}
                style={{ boxShadow: "0 0 10px rgba(239,68,68,0.45)" }}>
                <span className="inline-block skew-x-[12deg]">
                  {intel.summary.highest === "collision_risk" ? "COLLISION RISK" : intel.summary.highest} ({intel.summary.threats})
                </span>
              </span>
            )}

            <span className="ml-auto flex items-center gap-1.5 self-center">
              <span className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-green-400" : "bg-red-500")}
                style={{ boxShadow: online ? "0 0 7px rgba(74,222,128,0.9)" : "0 0 7px rgba(239,68,68,0.9)" }} />
              <span className={cn("font-mono text-[9px] font-bold uppercase tracking-[0.18em]", online ? "text-green-300/90" : "text-red-300")}>
                {online ? "RING LIVE" : "RING DOWN"}
              </span>
            </span>
          </div>

          {/* The view itself. `relative` so the badges/overlays inside keep anchoring to the
              PANO, not to the whole container — that is what stopped them colliding with the
              HUD bands. */}
          <div className="relative min-h-0 flex-1">
          {stitchVisible && stitchSrc ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img ref={stitchImgRef} key={stitchSrc} src={stitchSrc} alt={stitchMode === "pano" ? "360 panorama" : "bird's-eye view"}
                className="absolute inset-0 h-full w-full object-contain" style={{ filter: cssFilter(stitchFilter) }}
                onError={() => setStitchErr(true)} />
              {showMotion && motion.movers.length > 0 && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                  {motion.movers.map((m, i) => (
                    <g key={i}>
                      <rect x={`${m.x * 100}%`} y={`${m.y * 100}%`} width={`${m.w * 100}%`} height={`${m.h * 100}%`}
                        fill="none" stroke="rgba(251,191,36,0.9)" strokeWidth="1.5" strokeDasharray="5 4" />
                      <text x={`${m.x * 100}%`} y={`${m.y * 100}%`} dy="-3" className="font-mono" fontSize="9" fill="rgb(253,230,138)">MOTION</text>
                    </g>
                  ))}
                </svg>
              )}
              {showAi && stitchAi.enabled && stitchDets.length > 0 && (
                <DetectionOverlay detections={stitchDets} srcW={stitchAi.frame?.frameW ?? null} srcH={stitchAi.frame?.frameH ?? null} fit="contain" />
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center">
              <Video className="h-5 w-5 text-amber-300/70" />
              <div className="text-[11px] font-bold uppercase tracking-wide text-amber-300">
                {stitchMode === "pano" ? "Panorama" : "Bird's-eye view"} not available
              </div>
              <div className="max-w-md text-[10px] leading-relaxed text-slate-400">
                Stitched on the Jetson (CUDA undistort → ground-plane projection → seam blend). Shows here
                the moment the service serves it and reports the calibration as loaded.
              </div>
            </div>
          )}
          </div>

          {/* ══ HUD — LOWER BAND: THE PICTURE + LOCAL ENVIRONMENT ══════════════════════
              What the detector classified, with its provenance, and the environmental sensors that
              have no other home on this screen. Again: nothing here is duplicated from another panel. */}
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-cyan-400/25 bg-[#050a12] px-3 py-1"
            style={{ boxShadow: "inset 0 -1px 0 rgba(34,211,238,0.22)" }}>

            <div className="flex min-w-0 items-center gap-1.5">
              <span className="text-[7px] font-bold tracking-[0.2em] text-cyan-300/50">SEEING</span>
              {!showAi || !stitchAi.enabled ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">AI overlay off — detector not asked</span>
              ) : !stitchAi.connected ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300/90">detector unreachable — not an all-clear</span>
              ) : stitchDets.length === 0 ? (
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">nothing classified</span>
              ) : (
                <>
                  {stitchDets.slice(0, 5).map((d, i) => (
                    <span key={`${d.cls}-${i}`} className="skew-x-[-12deg] border border-cyan-400/40 bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-cyan-100"
                      style={{ boxShadow: "0 0 6px rgba(34,211,238,0.3)" }}>
                      <span className="inline-block skew-x-[12deg]">
                        {d.cls}<span className="ml-1 tabular-nums text-cyan-300/70">{Math.round((d.conf ?? 0) * 100)}%</span>
                      </span>
                    </span>
                  ))}
                  {stitchDets.length > 5 && <span className="font-mono text-[10px] text-slate-500">+{stitchDets.length - 5}</span>}
                </>
              )}
            </div>

            <HudDiv />

            {/* Environmental — live BME688 and the BMM150 field magnitude. Earth's field is 25–65 µT;
                outside that band the reading is dominated by local iron, so it is toned amber rather
                than presented as clean. */}
            <HudCell label="AIR" value={telemetry.bme.a?.temperature != null ? telemetry.bme.a.temperature.toFixed(1) : null} unit="°C" title="BME688 ambient temperature" />
            <HudCell label="RH" value={telemetry.bme.a?.humidity != null ? Math.round(telemetry.bme.a.humidity) : null} unit="%" title="BME688 relative humidity" />
            <HudCell label="IAQ" value={telemetry.bme.a?.iaq ?? null}
              tone={telemetry.bme.a?.iaqAccuracy === 0 ? "text-slate-400" : undefined}
              title={telemetry.bme.a?.iaqAccuracy === 0 ? "BSEC still calibrating — IAQ accuracy 0" : "BME688 air quality index"} />
            {magnetometer?.present && magnetometer.magnitudeUt != null && (
              <HudCell label="MAG" value={magnetometer.magnitudeUt.toFixed(0)} unit="µT"
                tone={magnetometer.magnitudeUt < 25 || magnetometer.magnitudeUt > 65 ? "text-amber-300" : undefined}
                title={magnetometer.magnitudeUt < 25 || magnetometer.magnitudeUt > 65
                  ? "Outside Earth's 25–65 µT band — local iron dominating, no direction derivable"
                  : "BMM150 total field magnitude"} />
            )}

            {/* Provenance travels with the picture: these weights are a 36-frame fine-tune that
                reported "bird 0.95" indoors, so the badge is not decoration. */}
            <div className="ml-auto flex items-center gap-1.5 self-center">
              {stitchAi.connected && stitchAi.frame?.latencyMs != null && (
                <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{Math.round(stitchAi.frame.latencyMs)} ms</span>
              )}
              {stitchAi.frame?.model && (
                <span className="border border-amber-400/50 bg-amber-500/20 px-1 font-mono text-[9px] font-bold text-amber-200" title={stitchAi.frame.model}>R&amp;D</span>
              )}
            </div>
          </div>
        </div>
      )}

      {showModels && (
        <div className="absolute right-2 top-11 z-50 max-h-[70%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <ModelComparisonPanel fusion={fusion} connected={cmp.connected} />
        </div>
      )}

      {/* ── RING TILES — each with its own controls ── */}
      {/* 2x2, not a 4-wide strip. Four 16:9 tiles side by side in a narrow viewport left each one
         tiny and letterboxed with dead space above and below; a 2x2 grid gives each roughly 4x the
         area for the same footprint. Cells FILL their slot — the blit re-sizes the canvas backing
         store from the CSS box every frame, so a bigger cell means a genuinely sharper tile, not an
         upscaled one. */}
      <div className="relative grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-1 p-1">
        {RING_FACES.map((face, i) => {
          if (soloTile !== null && soloTile !== i) return null;
          const t = tiles[i] ?? newTile();
          const trueBrg = (((heading + (mounts[i] ?? i * 90)) % 360) + 360) % 360;
          const panelId = `tile${i}`;
          return (
            // aspect-video, NOT aspect-square: one composite quadrant is 960x540 (16:9). Forcing a 16:9
            // source into a square tile cover-cropped ~44% of each camera's field of view away — that is
            // why tiles read "too zoomed in" while the panorama (full frames) looked right.
            <div key={face} className={cn("group relative min-h-0 min-w-0 overflow-hidden rounded border border-cyan-500/20 bg-black", soloTile === i ? "col-span-2 row-span-2" : "")}>
              {t.hidden ? (
                <button type="button" onClick={() => patchTile(i, { hidden: false })} className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300">
                  <EyeOff className="h-4 w-4" /><span className="text-[9px] uppercase">{face} hidden</span>
                </button>
              ) : (
                <>
                  <canvas ref={(el) => { tileRefs.current[i] = el; }} className="h-full w-full" style={{ filter: cssFilter(t.filter) }} />

                  {/* AI boxes — drawn in the coordinate space they were computed in (the composite). */}
                  {showAi && ai.enabled && dets.length > 0 && (
                    <DetectionOverlay detections={dets} srcW={srcDims.w} srcH={srcDims.h} fit="cover"
                      tile={i} cols={cols} rows={rows} tileOrder={tileOrder} zoom={t.zoom} />
                  )}

                  {/* optional reticle */}
                  {t.filter.grid && (
                    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                      <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(34,211,238,0.18)" strokeWidth="1" />
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(34,211,238,0.18)" strokeWidth="1" />
                    </svg>
                  )}

                  {/* bearing label */}
                  <div className="pointer-events-none absolute left-1/2 top-1.5 -translate-x-1/2 rounded border border-cyan-500/25 bg-black/60 px-2 py-0.5 font-mono text-[10px] text-cyan-200">
                    {face.toUpperCase()} · {trueBrg.toString().padStart(3, "0")}°
                    {t.zoom > 1 && <span className="ml-1 text-cyan-400">{t.zoom.toFixed(1)}×</span>}
                    {isFilterActive(t.filter) && <span className="ml-1 text-amber-300">FX</span>}
                  </div>

                  {/* PER-TILE CONTROLS — always present on touch, emphasised on hover */}
                  {/* WRAPS rather than clips: six controls don't fit one row on a narrow tile (iPad at
                      1024 gave a 97px cluster for ~130px of buttons). Clipping would silently hide the
                      solo/hide controls; wrapping keeps every control reachable at any tile size. */}
                  {/* 24px (h-6/w-6) is a FLOOR, not a style preference. This console is driven on an
                      iPad with the cluster "always present on touch", and these are hand-rolled buttons
                      that bypass TacButton (which already enforces min-h-9). At the previous 20px with a
                      2px gap they failed WCAG 2.2 SC 2.5.8 both ways — under the size minimum, and too
                      close together to claim the undersized-target spacing exception. There is also no
                      fallback: the `psa-field` glove mode advertised as the escape hatch has no CSS rule
                      anywhere in the repo, so it enlarges nothing.
                      The gap deliberately STAYS at 0.5 (2px): at 24px the targets clear the minimum on
                      size alone, and every extra pixel of gap buys a second wrapped row that covers the
                      camera image this cluster floats over — which is the constraint the wrap comment
                      above is really about. Budget: 5×24 + a 24px fit toggle + 5×2 ≈ 154px, still one
                      row on a ~158px laptop tile, and the same two rows as before at iPad width. */}
                  <div className="absolute bottom-1.5 left-1/2 z-20 flex max-w-[calc(100%-8px)] -translate-x-1/2 flex-wrap items-center justify-center gap-0.5 rounded-md border border-cyan-500/20 bg-black/70 px-0.5 py-0.5 opacity-70 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => patchTile(i, { zoom: Math.max(1, Math.round((t.zoom - 0.5) * 10) / 10) })}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/20" title="Zoom out"><Minus className="h-3 w-3" /></button>
                    <button type="button" onClick={() => patchTile(i, { zoom: Math.min(6, Math.round((t.zoom + 0.5) * 10) / 10) })}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/20" title="Zoom in"><Plus className="h-3 w-3" /></button>
                    <button type="button" onClick={() => patchTile(i, { fit: t.fit === "fill" ? "fit" : "fill" })}
                      className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded text-[8px] font-bold uppercase text-cyan-200 hover:bg-cyan-500/20" title="Fill (crop) vs Fit (whole frame)">{t.fit}</button>
                    <button type="button" onClick={() => setOpenPanel(openPanel === panelId ? null : panelId)}
                      className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded hover:bg-cyan-500/20", openPanel === panelId ? "text-cyan-100" : "text-cyan-200")} title="Image adjustment"><Sliders className="h-3 w-3" /></button>
                    <button type="button" onClick={() => setSoloTile(soloTile === i ? null : i)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-cyan-200 hover:bg-cyan-500/20" title={soloTile === i ? "Back to ring" : "Expand this camera"}>
                      {soloTile === i ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                    </button>
                    <button type="button" onClick={() => patchTile(i, { hidden: true })}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white/10" title="Hide this tile"><EyeOff className="h-3 w-3" /></button>
                  </div>

                  {openPanel === panelId && (
                    // bottom-10 (40px), not 9: the control cluster below now stands 34px tall (6px offset
                    // + 4px padding + a 24px row), so bottom-9 would leave the popover 2px off it.
                    <div className="absolute bottom-10 left-1/2 z-40 -translate-x-1/2" onClick={(e) => e.stopPropagation()}>
                      <FilterControls compact state={t.filter} onChange={(f) => patchTile(i, { filter: f })} onReset={() => patchTile(i, { filter: { ...DEFAULT_FILTER_STATE } })} />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
