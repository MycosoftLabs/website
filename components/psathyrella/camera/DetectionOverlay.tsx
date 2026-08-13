"use client";

/**
 * DetectionOverlay — draws the Jetson's YOLO26 / SAHI / DeepStream-nvtracker boxes over a live
 * video surface. It is a PURE RENDERER: it never invents a detection, never smooths, never
 * extrapolates. Empty payload → empty overlay.
 *
 * WHY SVG and not canvas: the boxes are sparse (tens per frame) and mostly static between
 * inference ticks, so a retained-mode tree costs less than repainting a canvas at video rate; it
 * stays vector-crisp on HiDPI/iPad without a devicePixelRatio dance, and an operator (or a bug
 * report screenshot / DOM dump) can inspect the exact box and class straight out of the tree.
 *
 * WHY the transform lives here: detections arrive normalized (0..1) to the SOURCE frame, but the
 * GCS presents that frame three different ways. Draw the same normalized box with the wrong
 * transform and it drifts off its object — which on a defense console reads as a false contact.
 * So each surface tells us how it is fitting the pixels and we invert exactly that:
 *
 *   RING TILE  (`tile` set) — Quad360View crops one quadrant of the Camarray composite and blits it
 *              COVER into a square tile. The crop math below MIRRORS that component line-for-line;
 *              if you change one, change both. `fit` is ignored here — the tile stitch is always
 *              cover.
 *   CONTAIN    — pano / BEV: a single <img object-contain>, i.e. letterboxed with black bars.
 *   COVER      — target cam: <img object-cover>, centre-cropped, optionally with a CSS
 *              `transform: scale(zoom)` digital PTZ we replay via `zoom`/`panX`/`panY`.
 *
 * PLACEMENT: renders `position:absolute; inset:0`, so THE PARENT MUST BE `position: relative`
 * (or otherwise a containing block). It is `pointer-events-none` — it never steals a click from
 * the video surface or the controls layered above it.
 *
 * ZOOM/PAN CAVEAT: pass `zoom`/`panX`/`panY` only when this overlay sits OUTSIDE the CSS-
 * transformed element. If you nest it inside that element the browser already applies the
 * transform, and passing them again would double it.
 */

// React 19 dropped the ambient global JSX namespace — `JSX.Element` now comes from the package.
import { useEffect, useRef, useState, type JSX } from "react";
import { cn } from "@/lib/utils";
import type { CameraDetection } from "@/lib/psathyrella/contract";

export type OverlayFit = "cover" | "contain";

/**
 * Stable per-class palette. Keyed by a hash of the class string rather than an incrementing
 * counter so "boat" is the SAME colour on every tile, every session, every reload — operators
 * learn the colour, and two screenshots of the same scene compare cleanly.
 */
const CLASS_COLORS = [
  "#22d3ee", // cyan
  "#f59e0b", // amber
  "#a855f7", // violet
  "#4ade80", // green
  "#38bdf8", // sky
  "#f472b6", // pink
  "#facc15", // yellow
  "#fb7185", // rose
] as const;

function classColor(cls: string): string {
  // FNV-1a — cheap, stable across engines (unlike anything derived from object order).
  let hash = 0x811c9dc5;
  const key = cls.toLowerCase();
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return CLASS_COLORS[hash % CLASS_COLORS.length];
}

/** One detection resolved into rendered-element pixels. */
interface PlacedBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  /** Confidence drives stroke opacity so a marginal detection reads as marginal. */
  strokeOpacity: number;
  label: string;
}

const LABEL_FONT_PX = 9;
const LABEL_CHIP_H = 13;
/** 9px in a monospace face is ~5.4px/char; we pad the chip rather than measure (no reflow). */
const LABEL_CHAR_PX = 5.4;

export default function DetectionOverlay({
  detections,
  srcW,
  srcH,
  fit,
  className,
  tile,
  cols,
  rows,
  tileOrder,
  tileNormalized,
  zoom,
  panX,
  panY,
  showLabels = true,
  showTrackIds = true,
  minConf = 0.25,
}: {
  detections: CameraDetection[];
  srcW: number | null;
  srcH: number | null; // source frame dims; if null, render nothing (honest)
  fit: OverlayFit;
  className?: string;
  /** ring-tile mode: which tile this overlay covers + the composite layout */
  tile?: number;
  cols?: number;
  rows?: number;
  tileOrder?: number[];
  /** true when incoming bboxes are normalized to the TILE, false/undefined = normalized to the whole composite */
  tileNormalized?: boolean;
  zoom?: number;
  panX?: number;
  panY?: number;
  showLabels?: boolean;
  showTrackIds?: boolean;
  minConf?: number;
}): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  // The ONLY state in this component. Everything else is derived during render, so a 20fps
  // detection stream causes zero extra React work beyond the parent's own re-render.
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Bail out of the state update when nothing meaningfully moved — a ResizeObserver that
      // sets state unconditionally can feed itself and spin during panel drags.
      setSize((prev) =>
        Math.abs(prev.w - rect.width) < 0.5 && Math.abs(prev.h - rect.height) < 0.5
          ? prev
          : { w: rect.width, h: rect.height },
      );
    };
    measure();
    // Coalesce resize bursts to one measurement per frame (splitter drags fire dozens).
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const boxes = placeDetections({
    detections,
    srcW,
    srcH,
    fit,
    viewW: size.w,
    viewH: size.h,
    tile,
    cols,
    rows,
    tileOrder,
    tileNormalized,
    zoom,
    panX,
    panY,
    showTrackIds,
    minConf,
  });

  return (
    <svg
      ref={svgRef}
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden="true"
    >
      {boxes.map((b) => {
        const chipW = b.label.length * LABEL_CHAR_PX + 8;
        // Keep the chip on screen, and drop it inside the box when there is no room above.
        const chipX = Math.max(0, Math.min(b.x, size.w - chipW));
        const chipY = b.y >= LABEL_CHIP_H + 2 ? b.y - LABEL_CHIP_H - 2 : b.y + 2;
        return (
          <g key={b.id}>
            {/* Dark under-stroke: a thin cyan line vanishes over bright water/sky in daylight. */}
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill="none"
              stroke="#000000"
              strokeOpacity={0.45}
              strokeWidth={3}
              rx={2}
            />
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill="none"
              stroke={b.color}
              strokeOpacity={b.strokeOpacity}
              strokeWidth={1.5}
              rx={2}
            />
            {showLabels && (
              <>
                <rect
                  x={chipX}
                  y={chipY}
                  width={chipW}
                  height={LABEL_CHIP_H}
                  fill="#000000"
                  fillOpacity={0.6}
                  stroke={b.color}
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  rx={2}
                />
                <text
                  x={chipX + 4}
                  y={chipY + LABEL_CHIP_H - 4}
                  fill={b.color}
                  fontSize={LABEL_FONT_PX}
                  fontFamily="ui-monospace, SFMono-Regular, monospace"
                  letterSpacing="0.04em"
                >
                  {b.label}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

interface PlaceArgs {
  detections: CameraDetection[];
  srcW: number | null;
  srcH: number | null;
  fit: OverlayFit;
  viewW: number;
  viewH: number;
  tile?: number;
  cols?: number;
  rows?: number;
  tileOrder?: number[];
  tileNormalized?: boolean;
  zoom?: number;
  panX?: number;
  panY?: number;
  showTrackIds: boolean;
  minConf: number;
}

/**
 * Resolve normalized source-frame boxes into rendered-element pixels.
 *
 * Every surface reduces to ONE axis-aligned affine (ax + srcPx*kx), so the three fits differ only
 * in how (ax, kx) are derived — no per-mode drawing branches downstream.
 */
function placeDetections(args: PlaceArgs): PlacedBox[] {
  const { detections, srcW, srcH, viewW, viewH, minConf, showTrackIds } = args;

  // Honest empties: no frame dims reported, nothing measured yet, or nothing detected. We render
  // an empty <svg> rather than any placeholder — a fake box on this console is a false contact.
  if (!detections.length) return [];
  if (srcW === null || srcH === null || srcW <= 0 || srcH <= 0) return [];
  if (viewW <= 1 || viewH <= 1) return [];

  // Ring position (0 bow, 1 stbd, 2 aft, 3 port); -1 = not a ring tile.
  const ringIdx = args.tile ?? -1;
  const tileMode = ringIdx >= 0;

  // The source sub-rect the normalized bbox spans, in source-frame pixels.
  let normOriginX = 0;
  let normOriginY = 0;
  let normSpanX = srcW;
  let normSpanY = srcH;
  let kx: number;
  let ky: number;
  let ax: number;
  let ay: number;

  if (tileMode) {
    // ── COVER-CROP, mirrored from Quad360View's tile stitch. Do not re-derive. ──
    const cols = Math.max(1, args.cols ?? 2);
    const rows = Math.max(1, args.rows ?? 2);
    // tileOrder maps ring position → composite tile index, so a swapped ribbon is fixed in config
    // (same lookup Quad360View does: `tileOrder[i] ?? i`).
    const tileIdx = args.tileOrder?.[ringIdx] ?? ringIdx;
    const sw = srcW / cols;
    const sh = srcH / rows;
    const sx = (tileIdx % cols) * sw;
    const sy = Math.floor(tileIdx / cols) * sh;
    const srcA = sw / sh;
    const dstA = viewW / viewH;
    let cw = sw;
    let ch = sh;
    let cx = sx;
    let cy = sy;
    if (srcA > dstA) {
      cw = sh * dstA;
      cx = sx + (sw - cw) / 2;
    } else {
      ch = sw / dstA;
      cy = sy + (sh - ch) / 2;
    }
    if (cw <= 0 || ch <= 0) return [];
    kx = viewW / cw;
    ky = viewH / ch;
    ax = -cx * kx;
    ay = -cy * ky;
    if (args.tileNormalized) {
      normOriginX = sx;
      normOriginY = sy;
      normSpanX = sw;
      normSpanY = sh;
    }
  } else {
    // ── LETTERBOX (object-contain) or CENTRE-CROP (object-cover) of the whole frame. ──
    const k =
      args.fit === "contain"
        ? Math.min(viewW / srcW, viewH / srcH)
        : Math.max(viewW / srcW, viewH / srcH);
    kx = k;
    ky = k;
    // Bars (contain) or overflow (cover) are split evenly — object-fit centres by default.
    ax = (viewW - srcW * k) / 2;
    ay = (viewH - srcH * k) / 2;
  }

  // ── Digital PTZ: replay the surface's CSS `transform: scale(zoom)` about its transformOrigin. ──
  // A scale about (ox, oy) is x' = x*z + ox*(1 - z), which folds straight into the affine.
  const z = args.zoom ?? 1;
  if (z !== 1) {
    const originX = ((50 + (args.panX ?? 0) * 45) / 100) * viewW;
    const originY = ((50 + (args.panY ?? 0) * 45) / 100) * viewH;
    ax = ax * z + originX * (1 - z);
    ay = ay * z + originY * (1 - z);
    kx *= z;
    ky *= z;
  }

  const out: PlacedBox[] = [];
  for (const d of detections) {
    if (!(d.conf >= minConf)) continue; // also drops NaN confidences

    if (tileMode) {
      const dTile = d.tile ?? null;
      // Tile-normalized boxes are unplaceable without a tile id — drop rather than guess.
      if (args.tileNormalized && dTile === null) continue;
      if (dTile !== null && dTile !== ringIdx) continue;
      // Composite-normalized boxes with no tile id need no filter: the crop + cull below places
      // them on whichever tile actually contains them.
    }

    const x = ax + (normOriginX + d.bbox.x * normSpanX) * kx;
    const y = ay + (normOriginY + d.bbox.y * normSpanY) * ky;
    const w = d.bbox.w * normSpanX * kx;
    const h = d.bbox.h * normSpanY * ky;
    if (w <= 0 || h <= 0) continue;
    // Cull anything fully outside the visible crop (the other three quadrants, letterbox bars,
    // whatever the digital zoom pushed off-screen).
    if (x + w <= 0 || x >= viewW || y + h <= 0 || y >= viewH) continue;

    const conf = Math.max(0, Math.min(1, d.conf));
    const trackSuffix = showTrackIds && d.trackId ? ` #${d.trackId}` : "";
    out.push({
      id: d.id,
      x,
      y,
      w,
      h,
      color: classColor(d.cls),
      strokeOpacity: 0.45 + conf * 0.5,
      label: `${d.cls.toUpperCase()} ${conf.toFixed(2)}${trackSuffix}`,
    });
  }
  return out;
}
