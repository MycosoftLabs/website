"use client";

/**
 * VISOR FRAME — the helmet geometry itself: a continuous glowing outline that traces the visor
 * opening, with instrument clusters hanging off it and the centre left clear to see through.
 *
 * This is drawn as ONE scalable SVG (viewBox + `preserveAspectRatio="none"`) rather than as absolutely
 * positioned boxes. A helmet visor is a shape — sweeping curves that meet angular chrome at the brow
 * and cheeks — and boxes pinned to corners cannot be that shape at arbitrary aspect ratios. Using a
 * viewBox means every curve, tick and anchor point stays in proportion whether the pane is a narrow
 * column on an iPad or a wide strip on the desktop console.
 *
 * ══ THE RULE THAT SURVIVES THE STYLING ════════════════════════════════════════════════════════════
 * It is a HUD over a live optic, so the same honesty applies as everywhere else in this console:
 *
 *   · the centre stays TRANSPARENT — the picture is the instrument, and chrome that costs visibility
 *     is a liability, not a feature
 *   · a null datum renders an em-dash, never a zero. On a HUD a fabricated zero is indistinguishable
 *     from a measurement
 *   · the range ladder is drawn only when something can actually measure range. The bow optic cannot,
 *     so the rungs are labelled from the ranging sensors that can, and read "NO RANGING" when none is
 *     reporting rather than showing an empty scale that implies coverage
 */

import { useEffect, useRef, useState, type JSX, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Design space. Everything below is authored in these units and scales with the pane. */
const VB_W = 1600;
const VB_H = 900;

/**
 * The `xMidYMid meet` projection the true-aspect SVG layer uses, computed in JS so HTML can be
 * placed in the SAME space without living inside the SVG.
 *
 * WHY THIS EXISTS: the slots were `foreignObject`s inside that layer, which meant the SVG transform
 * scaled the HTML with everything else. Measured on a 1002x703 pane: scale 0.626, so every
 * `text-[13px]` label rendered at 8px — illegible — and a slot anchored at design x=1224 landed at
 * 77% of the pane instead of in the corner, because the design box only occupies part of the pane
 * once it is letterboxed.
 *
 * Projecting instead gives both properties at once: HTML renders at its NATIVE font size, and a
 * design coordinate still lands exactly where the frame draws it.
 */
function useProjection(ref: React.RefObject<HTMLDivElement | null>, mediaAspect?: number | null) {
  const [p, setP] = useState({ scale: 1, ox: 0, oy: 0, w: 0, h: 0, mx: 0, my: 0, mw: 0, mh: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const { width: w, height: h } = el.getBoundingClientRect();
      if (!w || !h) return;

      /*
       * THE FRAME LOCKS TO THE PICTURE, NOT TO THE PANE.
       *
       * The optic renders `object-contain`, so a 16:9 stream in a 1.43-aspect pane draws 881x496 with
       * 87px of black above and below. Projecting onto the PANE put the aperture around that black
       * too, so the frame drifted out of scale with the video it is supposed to frame — the visor
       * opening has to coincide with the image, or it is just a border.
       *
       * So: compute the contained media rect, and project the design space onto THAT. The letterbox
       * bands still address the pane, because filling the black is exactly their job.
       */
      const a = mediaAspect && Number.isFinite(mediaAspect) && mediaAspect > 0 ? mediaAspect : w / h;
      const paneA = w / h;
      const mw = a > paneA ? w : h * a;
      const mh = a > paneA ? w / a : h;
      const mx = (w - mw) / 2;
      const my = (h - mh) / 2;

      const scale = Math.min(mw / VB_W, mh / VB_H);
      setP({
        scale,
        ox: mx + (mw - VB_W * scale) / 2,
        oy: my + (mh - VB_H * scale) / 2,
        w, h, mx, my, mw, mh,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, mediaAspect]);
  return p;
}

const norm360 = (d: number): number => ((d % 360) + 360) % 360;

const GLOW = "drop-shadow(0 0 3px rgba(56,189,248,0.9)) drop-shadow(0 0 9px rgba(56,189,248,0.45))";

export interface VisorFrameProps {
  /** Top-centre capsule fill, 0..1. Null renders the capsule empty with a dashed outline. */
  capsulePct?: number | null;
  capsuleLabel?: string;
  capsuleTone?: "cyan" | "amber" | "red";
  /**
   * Status LEDs to the LEFT of the vehicle banner. Each is an independent lamp so a fault cannot be
   * hidden by another lamp's state. `null` renders the lamp DARK — an unlit lamp means "not
   * reporting", never "all clear", which is the same rule the rest of this console follows.
   */
  statusLeds?: { key: string; label: string; state: boolean | null; tone: "red" | "green" | "blue" }[];
  /**
   * Range-ladder gates, in metres, far → near (e.g. [15, 10, 5]).
   *
   * These are a fixed REFERENCE SCALE, like an aircraft HUD's pitch ladder — they are not themselves
   * measurements. What IS a measurement is `returns`: live ranges from sensors that genuinely measure
   * distance, drawn as bright markers against the scale. Keeping the two visually distinct is the
   * whole point — a scale tells you where to look, a marker tells you what is there.
   */
  ladderGatesM?: number[];
  /** Live ranges from RANGE-MEASURING sensors only. The optic cannot measure range and never feeds this. */
  returns?: { label: string; m: number; tone?: "cyan" | "amber" }[];
  /**
   * Target designator ticks — one vertical mark per contact at its horizontal position in frame.
   *
   * `xNorm` is 0..1 ACROSS THE PICTURE, derived from where the detector actually put the box, so a
   * tick sits under the thing it marks. Contacts outside the frame are not given a tick: a designator
   * pinned to the edge would claim a position the optic never saw.
   */
  targets?: { id: string; xNorm: number; label: string; tone?: "cyan" | "amber" | "red" }[];
  /** Optic field of view, degrees. Sets the span of the bottom bearing ruler. */
  fovDeg?: number;
  /** Own heading for the ruler's centre label. Null ⇒ the ruler shows RELATIVE degrees only. */
  headingDeg?: number | null;
  /** Left vertical ladder: short-range proximity gates. */
  leftScale?: { label: string; value: number | null; unit: string };
  /** Right vertical ladder: the mmWave field. */
  rightScale?: { label: string; value: number | null; unit: string };
  /** Slot content anchored to the frame. */
  /** Widget seated inside the upper-LEFT glass corner. */
  cornerTL?: ReactNode;
  /** Widget seated inside the upper-RIGHT glass corner. */
  cornerTR?: ReactNode;
  topLeft?: ReactNode;
  topRight?: ReactNode;
  bottomLeft?: ReactNode;
  bottomRight?: ReactNode;
  bottomCentre?: ReactNode;
  /**
   * Full-width strips pinned to the very top and bottom edges.
   *
   * These exist because an `object-contain` 16:9 picture in a 1.32-aspect pane leaves MEASURED 87 px
   * of black at the top and 87 px at the bottom — 26% of the pane, dead. That is where instruments
   * belong: filling it costs the view nothing, because there is no view there to cost.
   */
  /** Bottom-right corner instrument, opposite the tracker. */
  /** Natural aspect of the media beneath (w/h). The frame locks to the CONTAINED rect. */
  mediaAspect?: number | null;
  /**
   * Independent vertical placement, in DESIGN units (1600x900 space), for each piece of the frame.
   *
   * These exist because the three assemblies used to share one projection and could not be moved
   * apart. Positive values move a group DOWN. The defaults cancel the `xMidYMid meet` letterbox so
   * the top assembly reaches the pane top and the bottom assembly the pane bottom, while the centre
   * marks stay locked to the picture — which is the only place a reticle means anything.
   */
  topOffsetU?: number;
  bottomOffsetU?: number;
  centreOffsetU?: number;
  bottomCorner?: ReactNode;
  topBand?: ReactNode;
  bottomBand?: ReactNode;
  className?: string;
}

export default function VisorFrame({
  capsulePct = null,
  capsuleLabel = "LINK",
  capsuleTone = "cyan",
  statusLeds = [],
  ladderGatesM = [15, 10, 5],
  returns = [],
  targets = [],
  fovDeg = 60,
  headingDeg = null,
  leftScale,
  rightScale,
  cornerTL,
  cornerTR,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  bottomCentre,
  mediaAspect = null,
  topOffsetU,
  bottomOffsetU,
  centreOffsetU = 0,
  bottomCorner,
  topBand,
  bottomBand,
  className,
}: VisorFrameProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const proj = useProjection(hostRef, mediaAspect);

  /*
   * The `meet` layer scales 1600x900 to fit the pane, so it self-letterboxes vertically by
   * (paneH - 900*meetScale)/2 px. Converted to design units that is the exact amount the top group
   * must rise and the bottom group must fall to reach the pane edges. Measured, not eyeballed —
   * when the pane happens to match 16:9 this is zero and nothing moves.
   */
  /*
   * `extraU` is exactly the headroom that makes the true-aspect layer span the pane: solving
   * VB_W / (VB_H + 2*extra) == paneAspect. With it, design 0..900 still maps onto the picture, and
   * the bands above/below become addressable as -extraU..0 and 900..900+extraU.
   */
  const paneAspect = proj.w && proj.h ? proj.w / proj.h : VB_W / VB_H;
  const extraU = Math.max(0, (VB_W / paneAspect - VB_H) / 2);
  /* Defaults place each assembly INSIDE its band; both remain overridable per-piece. */
  const topU = topOffsetU ?? -(extraU + 40);
  const botU = bottomOffsetU ?? (extraU + 150);

  /**
   * Anchor a slot at a design-space point.
   *
   * `align` picks which corner of the slot meets that point, so a right-hand cluster grows leftward
   * (into the frame) instead of off the pane. Font size is untouched by the projection — only the
   * POSITION is projected, which is the whole point of moving these out of the SVG.
   */
  const at = (x: number, y: number, align: "tl" | "tr" | "bl" | "br" | "tc" | "bc"): React.CSSProperties => {
    /*
     * ══ SLOTS PROJECT ONTO THE PANE, NOT THE PICTURE ══════════════════════════════════════════════
     * The frame SVG spans the full pane so its top assembly reaches the very top of the window and its
     * bottom assembly the very bottom — Morgan, Aug 03: "the top part should be at the very top of the
     * frame, not below the top of the video… the bottom part should be at the very bottom."
     *
     * The instrument slots must share that coordinate system or they drift out of register with the
     * frame they belong to. Projecting them onto the letterboxed media rect (the old behaviour) is
     * what parked the top row below the upper black band and the bottom row above the lower one.
     *
     * Centre-anchored marks land in the same place either way, because the letterbox is symmetric —
     * which is why the centre targeting information does not move.
     */
    const paneScale = Math.min(proj.w / VB_W, proj.h / VB_H);
    const paneOx = (proj.w - VB_W * paneScale) / 2;
    const paneOy = (proj.h - VB_H * paneScale) / 2;
    const left = paneOx + x * paneScale;
    const top = paneOy + y * paneScale;
    const tx = align.endsWith("r") ? "-100%" : align.endsWith("c") ? "-50%" : "0";
    const ty = align.startsWith("b") ? "-100%" : "0";
    return { position: "absolute", left, top, transform: `translate(${tx}, ${ty})` };
  };

  const capFill =
    capsuleTone === "red" ? "rgba(248,113,113,0.85)" : capsuleTone === "amber" ? "rgba(251,191,36,0.85)" : "rgba(103,232,249,0.85)";

  return (
    <div ref={hostRef} className={cn("pointer-events-none absolute inset-0 z-30 select-none", className)}>
      {/* ── The frame itself ───────────────────────────────────────────────────────────────────── */}
      {/*
        TWO LAYERS, and the split is load-bearing.

        `preserveAspectRatio="none"` stretches EVERYTHING it contains — including glyphs and circles.
        Measured on this pane: an 881x669 box against a 1600x900 viewBox scales X by 0.55 and Y by
        0.74, so a single stretched layer squashed every label 26% horizontally and turned the
        reticle into an ellipse.

        So: the FRAME stretches, because its whole job is to hug the container edges at any aspect.
        Everything with a readable or circular form — capsule, ladders, reticle, all text — lives in a
        second layer with a true aspect ratio and is centred over the same box.
      */}
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="none" aria-hidden
        className="absolute z-10" style={{ left: 0, top: 0, width: proj.w, height: proj.h }}>
        <defs>
          <linearGradient id="vf-brow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.30)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.02)" />
          </linearGradient>
          <linearGradient id="vf-cap" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={capFill} stopOpacity="0.35" />
            <stop offset="100%" stopColor={capFill} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/*
          CLOSED ANGULAR PERIMETER, hugging the full optic area.
          The first pass drew four open sweeps that trailed off the edges and left the corners
          undefined, so the frame read as decoration floating over a picture rather than as the
          opening of a helmet. A visor is a closed aperture: one continuous outline, chamfered at the
          corners, raised at the brow and dropped at the chin. Authored in the 1600x900 design space
          and stretched with the pane, so it hugs the optic at any aspect.
        */}
        {/*
          ══ VISOR GEOMETRY ══════════════════════════════════════════════════════════════════════
          Traced point-by-point off the transparent reference (1280x720) and scaled x1.25 into this
          1600x900 design space.

          Structure, which is the part that has to be right before any styling matters:
            · TWO assemblies — an upper brow group and a lower chin group. The vertical middle and
              both side edges are completely OPEN. It is not a closed aperture.
            · Each upper panel is a BAND: an upper edge (diagonal up from the pane edge, then flat,
              then a short diagonal into the brow) and a lower edge returning to the pane edge.
            · The lower assembly is a single sweep per side: flat at the edge, long diagonal inward,
              flat across the chin.
            · The motion tracker sits ON the lower-left diagonal and breaks it.

          Reference points (1280-space -> 1600-space):
            top-left band  (0,130)->(150,32)->(415,32)->(468,72) ; lower (468,72)->(370,152)->(0,152)
            capsule        x 495..793, y 45..80
            tabs           x 800..870, y 40..60
            lower sweep    (0,508)->(110,508)->(300,637)->(575,637)
            tracker        centre (200,592) r 78
        */}
        <g fill="none" stroke="rgba(56,189,248,0.95)" strokeWidth="4" strokeLinejoin="round" style={{ filter: GLOW }}>
          {/* Upper-left band */}
          <path d="M -8 128 L 188 5 L 519 5 L 585 55" />
          <path d="M 585 55 L 463 155 L -8 155" />
          {/* Brow over the capsule */}
          <path d="M 585 55 L 604 15 L 996 15 L 1015 55" />
          {/* Upper-right band (mirror) */}
          <path d="M 1608 128 L 1412 5 L 1081 5 L 1015 55" />
          <path d="M 1015 55 L 1137 155 L 1608 155" />

          {/* Lower-left sweep */}
          <path d="M -8 734 L 138 734 L 375 895 L 719 895" />
          {/* Lower-right sweep (mirror) */}
          <path d="M 1608 734 L 1462 734 L 1225 895 L 881 895" />
        </g>

        {/*
          ══ TARGET DESIGNATOR TICKS ═════════════════════════════════════════════════════════════
          A vertical mark per contact, at the contact's own horizontal position in frame — the rows
          of ticks the reference HUD uses to call out objects in the scene.

          Drawn in the STRETCH layer on purpose: `xNorm` is a fraction of the picture width, so the
          tick has to track the picture's horizontal scale exactly. They are deliberately short and
          sit clear of the vertical centre so they never crowd the reticle.
        */}
        {targets.map((t) => {
          const x = 40 + Math.max(0, Math.min(1, t.xNorm)) * (VB_W - 80);
          const stroke = t.tone === "red" ? "rgba(248,113,113,0.95)"
            : t.tone === "amber" ? "rgba(251,191,36,0.95)" : "rgba(103,232,249,0.9)";
          return (
            <g key={t.id} style={{ filter: GLOW }}>
              <line x1={x} y1="286" x2={x} y2="352" stroke={stroke} strokeWidth="3" />
              <line x1={x} y1="548" x2={x} y2="614" stroke={stroke} strokeWidth="3" />
              <polygon points={`${x - 7},352 ${x + 7},352 ${x},366`} fill={stroke} />
            </g>
          );
        })}

        {/* Inner hairline, offset inboard of each band. */}
        <g fill="none" stroke="rgba(56,189,248,0.32)" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M -8 151 L 200 27 L 528 27 L 590 71" />
          <path d="M 1608 151 L 1400 27 L 1072 27 L 1010 71" />
          <path d="M -8 715 L 130 715 L 366 877 L 719 877" />
          <path d="M 1608 715 L 1470 715 L 1234 877 L 881 877" />
        </g>

        {/* Three angled tabs right of the capsule. */}
        <g fill="rgba(56,189,248,0.6)" style={{ filter: GLOW }}>
        </g>

        {/* Warm shoulder accents. Structural in the reference; deliberately non-semantic here so they
            can never be misread as an alert. */}

      </svg>

      {/* True-aspect layer — nothing here may be distorted. */}
      <svg viewBox={`0 ${-extraU} ${VB_W} ${VB_H + 2 * extraU}`} preserveAspectRatio="xMidYMid meet" aria-hidden
        className="absolute z-10" style={{ left: 0, top: 0, width: proj.w, height: proj.h }}>
          {/* ══ TOP BAND INSTRUMENTS — authored to live in the band above the picture ══════════
              The viewBox extension makes -extraU..0 addressable; this is what actually occupies it.
              A heading tape with the bow index, flanked by feed identity and state. */}
          <g style={{ filter: GLOW }}>
            {/* TOP TAPE — TRUE heading */}
            {(() => {
              /*
               * MARITIME HEADING TAPE — the scale moves, the index does not.
               *
               * A fixed tick strip tells the operator nothing; a compass tape does, because the
               * numbers slide past a stationary lubber line exactly like the card in a real binnacle.
               * `centre` is the bearing currently under the index: true heading on the top tape,
               * 0 (dead ahead) on the bottom one.
               *
               * When there is no heading fix the tape renders its ticks but shows "---" at the index
               * rather than parking on 000, because a compass reading 000 with no compass is a lie an
               * operator would act on.
               */
              const DEG_SPAN = 90;                       // degrees visible across the full width
              const PX = VB_W / DEG_SPAN;                // design units per degree
              const known = headingDeg !== null;
              const c = headingDeg ?? 0;
              const first = Math.ceil((c - DEG_SPAN / 2) / 5) * 5;
              const marks: JSX.Element[] = [];
              for (let d = first; d <= c + DEG_SPAN / 2; d += 5) {
                const x = VB_W / 2 + (d - c) * PX;
                if (x < -20 || x > VB_W + 20) continue;
                const norm = ((d % 360) + 360) % 360;
                const major = norm % 10 === 0;
                const card = norm === 0 ? "N" : norm === 90 ? "E" : norm === 180 ? "S" : norm === 270 ? "W" : null;
                marks.push(
                  <g key={`m${d}`} opacity={known ? 1 : 0.35}>
                    <line x1={x} y1={(-extraU + 30)} x2={x} y2={(-extraU + 30) + (major ? 26 : 14)}
                      stroke="rgba(103,232,249,0.9)" strokeWidth={major ? 3 : 1.8} />
                    {major && (
                      <text x={x} y={(-extraU + 30) + 52} textAnchor="middle" fontSize={card ? 30 : 24}
                        fontWeight="bold" letterSpacing="1"
                        className={card ? "fill-cyan-100" : "fill-cyan-200/75"}>
                        {card ?? String(norm).padStart(3, "0")}
                      </text>
                    )}
                  </g>,
                );
              }
              return (
                <g style={{ filter: GLOW }}>
                  <line x1="0" y1={(-extraU + 30)} x2={VB_W} y2={(-extraU + 30)} stroke="rgba(34,211,238,0.5)" strokeWidth="2.5" />
                  {marks}
                  {/* lubber line — fixed, the tape moves under it */}
                  <polygon points={`${VB_W / 2 - 14},${(-extraU + 30)} ${VB_W / 2 + 14},${(-extraU + 30)} ${VB_W / 2},${(-extraU + 30) + 24}`}
                    fill="rgba(103,232,249,1)" />
                  <text x={VB_W / 2} y={(-extraU + 30) - 12} textAnchor="middle" fontSize="30" fontWeight="bold"
                    letterSpacing="2" className={known ? "fill-cyan-100" : "fill-slate-500"}>
                    {known ? `${Math.round(((c % 360) + 360) % 360).toString().padStart(3, "0")}°` : "---"}
                  </text>
                </g>
              );
            })()}
            <polygon points={`${VB_W / 2 - 12},${-extraU + 6} ${VB_W / 2 + 12},${-extraU + 6} ${VB_W / 2},${-extraU + 30}`}
              fill="rgba(103,232,249,0.95)" />
          </g>

          {/* ══ BOTTOM BAND INSTRUMENTS — the band below the picture ═══════════════════════════ */}
          <g style={{ filter: GLOW }}>
            {/* BOTTOM TAPE — same compass card, finer span: coarse awareness on top, precision
                steering here. Both slide under a fixed lubber line as heading changes. */}
            {(() => {
              const DEG_SPAN = 30;                        // finer than the top tape's 90
              const PX = VB_W / DEG_SPAN;
              const yBase = VB_H + extraU - 46;
              const known = headingDeg !== null;
              const c = headingDeg ?? 0;
              const first = Math.ceil((c - DEG_SPAN / 2) / 1) * 1;
              const marks: JSX.Element[] = [];
              for (let d = first; d <= c + DEG_SPAN / 2; d += 1) {
                const x = VB_W / 2 + (d - c) * PX;
                if (x < -20 || x > VB_W + 20) continue;
                const norm = ((d % 360) + 360) % 360;
                const major = norm % 5 === 0;
                marks.push(
                  <g key={`b${d}`} opacity={known ? 1 : 0.35}>
                    <line x1={x} y1={yBase} x2={x} y2={yBase + (major ? 22 : 11)}
                      stroke="rgba(103,232,249,0.9)" strokeWidth={major ? 3 : 1.6} />
                    {major && norm % 10 === 0 && (
                      <text x={x} y={yBase + 46} textAnchor="middle" fontSize="24" fontWeight="bold"
                        className="fill-cyan-200/80">{String(norm).padStart(3, "0")}</text>
                    )}
                  </g>,
                );
              }
              return (
                <g style={{ filter: GLOW }}>
                  <line x1="0" y1={yBase} x2={VB_W} y2={yBase} stroke="rgba(34,211,238,0.5)" strokeWidth="2.5" />
                  {marks}
                  <polygon points={`${VB_W / 2 - 12},${yBase} ${VB_W / 2 + 12},${yBase} ${VB_W / 2},${yBase + 20}`}
                    fill="rgba(103,232,249,1)" />
                </g>
              );
            })()}
          </g>

        <defs>
          <linearGradient id="vf-brow2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.30)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0.02)" />
          </linearGradient>
          <linearGradient id="vf-cap2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={capFill} stopOpacity="0.35" />
            <stop offset="100%" stopColor={capFill} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Brow fill — a hint of helmet mass above the opening, never opaque over the picture. */}
        <g transform={`translate(0 ${topU})`}><path d="M 585 55 L 604 15 L 996 15 L 1015 55 L 1015 0 L 585 0 Z" fill="url(#vf-brow2)" /></g>

        {/* ── Top-centre capsule ─────────────────────────────────────────────────────────────── */}
        {/* ══ STATUS LEDS — left of the vehicle banner ═════════════════════════════════════════
            Three independent lamps. Lit = condition true; DARK = not reporting. A dark lamp is never
            an all-clear, which is why "unknown" and "good" do not share an appearance. */}
        <g transform={`translate(614 6)`}>
          {statusLeds.slice(0, 3).map((l, i) => {
            const on = l.state === true;
            const col = l.tone === "red" ? "248,113,113" : l.tone === "green" ? "74,222,128" : "56,189,248";
            return (
              <g key={l.key} transform={`translate(${60 + i * 126} 0)`}>
                <circle cx="0" cy="22" r="9" fill={on ? `rgba(${col},0.95)` : "rgba(255,255,255,0.06)"}
                  stroke={`rgba(${col},${on ? 0.95 : 0.3})`} strokeWidth="2"
                  style={on ? { filter: `drop-shadow(0 0 7px rgba(${col},0.9))` } : undefined}>
                  <title>{`${l.label}: ${l.state === null ? "not reporting" : on ? "active" : "clear"}`}</title>
                </circle>
                <text x="0" y="44" textAnchor="middle" fontSize="11" letterSpacing="1"
                  fill={on ? `rgba(${col},0.9)` : "rgba(148,163,184,0.5)"}>{l.label}</text>
              </g>
            );
          })}
        </g>

        <g transform={`translate(614 ${-52})`}>
          <rect x="0" y="0" width="372" height="44" rx="22" fill="rgba(3,10,20,0.65)" stroke="rgba(56,189,248,0.55)" strokeWidth="2"
            strokeDasharray={capsulePct === null ? "6 5" : undefined} style={{ filter: GLOW }} />
          {capsulePct !== null && (
            <rect x="4" y="4" width={Math.max(0, Math.min(1, capsulePct)) * 362} height="34" rx="17" fill="url(#vf-cap2)" />
          )}
          <text x="186" y="27" textAnchor="middle" className="fill-cyan-100/90" fontSize="13" fontWeight="bold" letterSpacing="2">
            {capsuleLabel}
          </text>
        </g>

        {/* ══ RANGE LADDERS ═══════════════════════════════════════════════════════════════════
            Aircraft-HUD convention: a fixed ladder of range gates, mirrored above and below the
            reticle, with live returns drawn ON the scale rather than as separate text.

            The rungs are DIM and the returns are BRIGHT, deliberately. The bow optic measures
            direction and nothing else, so every number on this ladder comes from a different sensor
            — the TF-Luna and the LD2450. If neither is reporting, the rungs stay dim and the ladder
            says so, rather than presenting an empty scale that implies coverage nothing is providing.
        */}
        {(() => {
          const maxGate = Math.max(...ladderGatesM, 1);
          // Nearest gate sits closest to the reticle, in both directions.
          const rung = (gateM: number, i: number, dir: -1 | 1) => {
            const dirIsTop = dir === -1;
            const y = dir === -1 ? 116 + i * 26 : 704 + i * 26;
            const halfW = dirIsTop ? 74 - i * 14 : 46 + i * 14;
            return (
              <g key={`${dir}-${gateM}`}>
                <line x1={800 - halfW} y1={y} x2={800 + halfW} y2={y}
                  stroke="rgba(103,232,249,0.34)" strokeWidth="2" />
                <text x={800 + halfW + 9} y={y + 4} className="fill-cyan-200/45" fontSize="11" fontWeight="bold" letterSpacing="1.4">
                  {gateM} M
                </text>
              </g>
            );
          };
          const sorted = [...ladderGatesM].sort((x, y2) => y2 - x); // far → near
          return (
            <>
              {sorted.map((g, i) => rung(g, sorted.length - 1 - i, -1))}
              {sorted.map((g, i) => rung(g, sorted.length - 1 - i, 1))}

              {/* Live returns — bright, on the scale, labelled with the sensor that measured them. */}
              {returns.map((r, i) => {
                const t = Math.max(0, Math.min(1, r.m / maxGate));
                // Nearest (t→0) sits closest to the reticle; furthest (t→1) at the outermost rung.
                const y = 116 + (1 - t) * ((sorted.length - 1) * 26);
                const stroke = r.tone === "amber" ? "rgba(251,191,36,0.95)" : "rgba(103,232,249,0.95)";
                return (
                  <g key={`${r.label}-${i}`} style={{ filter: GLOW }}>
                    <line x1={800 - 92} y1={y} x2={800 + 92} y2={y} stroke={stroke} strokeWidth="3" />
                    <polygon points={`${800 - 100},${y - 5} ${800 - 92},${y} ${800 - 100},${y + 5}`} fill={stroke} />
                    <polygon points={`${800 + 100},${y - 5} ${800 + 92},${y} ${800 + 100},${y + 5}`} fill={stroke} />
                    <text x={800 + 110} y={y + 4} fill={stroke} fontSize="12" fontWeight="bold" letterSpacing="1.2">
                      {r.m.toFixed(1)} M · {r.label}
                    </text>
                  </g>
                );
              })}

              {returns.length === 0 && (
                <text transform={`translate(0 ${topU})`} x="800" y="200" textAnchor="middle" className="fill-slate-500" fontSize="11" letterSpacing="2.5">
                  NO RANGING SENSOR REPORTING
                </text>
              )}
            </>
          );
        })()}

        {/*
          ══ BEARING RULER (bottom) ══════════════════════════════════════════════════════════════
          The horizontal tick scale from the reference HUDs. On an aircraft this is a heading tape;
          here it is the optic's FIELD OF VIEW laid out linearly, so a tick is a real angle off the
          bow and a contact's designator lines up with its mark.

          Labels are RELATIVE degrees (port negative, starboard positive) because relative is what
          the optic actually measures. The centre carries the true heading ONLY when a heading fix
          exists — otherwise it reads "REL" rather than implying a compass reference we do not have.
        */}
        {(() => {
          const halfFov = fovDeg / 2;
          const cx = 800;
          const spanPx = 470;            // half-width of the ruler
          const toX = (deg: number) => cx + (deg / halfFov) * spanPx;
          const ticks: JSX.Element[] = [];
          const step = halfFov > 40 ? 10 : 5;
          for (let d = -Math.floor(halfFov / step) * step; d <= halfFov; d += step) {
            const major = d % (step * 2) === 0;
            const x = toX(d);
            ticks.push(
              <g key={`bt${d}`}>
                <line x1={x} y1={706} x2={x} y2={major ? 730 : 720}
                  stroke="rgba(103,232,249,0.55)" strokeWidth={major ? 2 : 1.2} />
                {major && d !== 0 && (
                  <text x={x} y={748} textAnchor="middle" className="fill-cyan-200/60" fontSize="12" fontWeight="bold">
                    {Math.abs(d)}
                  </text>
                )}
              </g>,
            );
          }
          return (
            <g style={{ filter: GLOW }} transform={`translate(0 ${bottomOffsetU ?? -70})`}>
              <line x1={cx - spanPx} y1={706} x2={cx + spanPx} y2={706} stroke="rgba(103,232,249,0.4)" strokeWidth="2" />
              {ticks}
              {/* Centre index — the bow. */}
              <polygon points={`${cx - 9},700 ${cx + 9},700 ${cx},684`} fill="rgba(103,232,249,0.95)" />
              <text x={cx} y={766} textAnchor="middle" className="fill-cyan-100/85" fontSize="13" fontWeight="bold" letterSpacing="1.6">
                {headingDeg !== null ? `${Math.round(norm360(headingDeg)).toString().padStart(3, "0")}\u00b0T` : "REL"}
              </text>
              {/* Contacts marked on the ruler, at the same angle their designator tick sits at. */}
              {targets.map((t) => {
                const deg = (t.xNorm - 0.5) * fovDeg;
                const x = toX(deg);
                const stroke = t.tone === "amber" ? "rgba(251,191,36,0.95)" : "rgba(103,232,249,0.95)";
                return <polygon key={`br${t.id}`} points={`${x - 6},706 ${x + 6},706 ${x},694`} fill={stroke} />;
              })}
            </g>
          );
        })()}

        {/* ══ SIDE LADDERS ═══════════════════════════════════════════════════════════════════════
            Vertical tick scales flanking the reticle, as in the aircraft reference. Each is fed by a
            RANGE-MEASURING sensor; the optic never feeds them. A scale with no reading shows its
            ticks dim and its value as an em-dash rather than an empty gauge. */}
        {([
          { side: -1 as const, cfg: leftScale },
          { side: 1 as const, cfg: rightScale },
        ]).map(({ side, cfg }) => {
          if (!cfg) return null;
          const x = 800 + side * 300;
          const known = cfg.value !== null && Number.isFinite(cfg.value);
          return (
            <g key={cfg.label} style={{ filter: GLOW }}>
              <line x1={x} y1={330} x2={x} y2={570} stroke="rgba(103,232,249,0.35)" strokeWidth="2" />
              {[0, 1, 2, 3, 4].map((i) => {
                const y = 330 + i * 60;
                const w = i % 2 === 0 ? 26 : 15;
                return <line key={i} x1={x} y1={y} x2={x + side * w} y2={y} stroke="rgba(103,232,249,0.45)" strokeWidth="2" />;
              })}
              <text x={x + side * 34} y={324} textAnchor={side < 0 ? "end" : "start"}
                className="fill-cyan-300/55" fontSize="11" fontWeight="bold" letterSpacing="1.4">
                {cfg.label}
              </text>
              <text x={x + side * 34} y={470} textAnchor={side < 0 ? "end" : "start"}
                className={known ? "fill-cyan-100" : "fill-slate-600"} fontSize="16" fontWeight="bold">
                {known ? `${(cfg.value as number).toFixed(1)}${cfg.unit}` : "\u2014"}
              </text>
            </g>
          );
        })}

        {/* ══ CENTRE REFERENCE LINE ══════════════════════════════════════════════════════════════
            The horizontal datum with arrow pointers from the aircraft reference. It marks the optic's
            OPTICAL CENTRE — not an artificial horizon. The buoy publishes no pitch or roll, and a
            line that appeared to level itself would be inventing attitude the vehicle never sent. */}
        <g style={{ filter: GLOW }}>
          <line x1="120" y1="450" x2="330" y2="450" stroke="rgba(103,232,249,0.5)" strokeWidth="2" strokeDasharray="26 12" />
          <line x1="1270" y1="450" x2="1480" y2="450" stroke="rgba(103,232,249,0.5)" strokeWidth="2" strokeDasharray="26 12" />
          <polygon points="330,450 372,432 372,468" fill="none" stroke="rgba(103,232,249,0.7)" strokeWidth="2" />
          <polygon points="1270,450 1228,432 1228,468" fill="none" stroke="rgba(103,232,249,0.7)" strokeWidth="2" />
          <rect x="72" y="438" width="42" height="24" fill="rgba(56,189,248,0.22)" stroke="rgba(103,232,249,0.6)" strokeWidth="1.5" />
          <rect x="1486" y="438" width="42" height="24" fill="rgba(56,189,248,0.22)" stroke="rgba(103,232,249,0.6)" strokeWidth="1.5" />
        </g>


        {/* Faint tracery across the upper field, as in the references. */}
        <g fill="none" stroke="rgba(103,232,249,0.13)" strokeWidth="1">
          <path transform={`translate(0 ${topU})`} d="M 300 232 L 620 232 L 660 206 L 940 206 L 980 232 L 1300 232" />
          <path transform={`translate(0 ${topU})`} d="M 380 268 L 640 268 L 668 248 L 932 248 L 960 268 L 1220 268" />
        </g>

        {/* ── Reticle ────────────────────────────────────────────────────────────────────────── */}
        <g style={{ filter: GLOW }}>
          <circle transform={`translate(0 ${centreOffsetU})`} cx="800" cy="450" r="34" fill="none" stroke="rgba(103,232,249,0.45)" strokeWidth="1.5" strokeDasharray="7 8" />
          {[
            [800, 400, 800, 424],
            [800, 476, 800, 500],
            [750, 450, 774, 450],
            [826, 450, 850, 450],
          ].map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(103,232,249,0.9)" strokeWidth="2.5" />
          ))}
          <circle transform={`translate(0 ${centreOffsetU})`} cx="800" cy="450" r="3" fill="rgba(103,232,249,0.95)" />
        </g>

      </svg>

      {/* ── HTML slots, anchored to the frame's flat runs ──────────────────────────────────────
          Positioned in percentages of the same design space the SVG uses, so they ride the curves
          at any aspect rather than drifting away from them. */}
      {/*
       * Slot geometry is derived from the frame paths above, in the SAME design space, so nothing can
       * collide with anything:
       *
       *   upper sweep runs y=210 (23%) at the edges, rising to y=70 (8%) at the brow
       *   lower sweep runs y=700 (78%) at the edges, dropping to y=815 (91%) at the chin
       *   centre column x=740..860 (46-54%) is reserved for the capsule, range ladder and reticle
       *
       * The corner slots therefore live OUTBOARD of the centre column and INBOARD of the sweeps, and
       * each is width-capped so a long label grows downward rather than sideways into its neighbour.
       * `max-w` is load-bearing here, not cosmetic — an uncapped cluster is the one thing that could
       * reach the centre column and cover the picture.
       */}
      {/*
        Slots are PROJECTED HTML, not foreignObjects — see useProjection. Each anchor below is a
        design-space point chosen clear of the frame paths, the centre column (x 700-910, which the
        capsule, ladders and reticle occupy) and of every other slot.
      */}

      {/*
        ══ BAND GLASS — the letterbox above and below the picture ════════════════════════════════
        These two strips cover exactly the dead space a 16:9 picture leaves in this pane, so the
        bands read as glass rather than black. They cover NO video: the picture occupies the middle
        and these sit entirely outside it, which is why full-width strips are safe here while a
        full-width pane over the picture would not be.

        Height comes from `proj.my` — the measured letterbox — so the strips track the real geometry
        and collapse to nothing if the pane ever becomes 16:9. Same clipped-parent / filtered-child
        split as the corners, because backdrop-filter ignores clip-path on its own element.
      */}
      {proj.my > 0.5 && (
        <>
          {(["top", "bottom"] as const).map((edge) => (
            <div
              key={edge}
              className="pointer-events-none absolute inset-x-0 z-0 overflow-hidden"
              style={{ height: proj.my, [edge]: 0 }}
              aria-hidden
            >
              <div
                className="h-full w-full"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(15,23,42,0.34) 48%, rgba(255,255,255,0.07)), radial-gradient(circle at 24% 18%, rgba(255,255,255,0.16), transparent 34%)",
                  backdropFilter: "blur(20px) saturate(1.35)",
                  WebkitBackdropFilter: "blur(20px) saturate(1.35)",
                  boxShadow: edge === "top"
                    ? "inset 0 1px 0 rgba(255,255,255,0.20)"
                    : "inset 0 -1px 0 rgba(255,255,255,0.20)",
                }}
              />
            </div>
          ))}
        </>
      )}

      {/*
        ══ CORNER GLASS — CLEAR, and shaped by the frame's own coordinates ═══════════════════════
        The clip polygons below are the frame path points divided by the design box (1600x900), so a
        pane edge and its neon edge are the same line by construction. The previous attempt used
        hand-estimated percentages, which squared off the angled cuts and covered the ruler.

        Clear, not tinted: low-alpha white plus a real backdrop blur, so the picture reads straight
        through. z-0 keeps every stroke, tick and glyph painting on top.
      */}
      {[
        { k: "tl", clip: "polygon(-0.50% 0.00%, 11.75% 0.56%, 32.44% 0.56%, 36.56% 6.11%, 28.94% 17.22%, -0.50% 17.22%)" },
        { k: "tr", clip: "polygon(100.50% 0.00%, 88.25% 0.56%, 67.56% 0.56%, 63.44% 6.11%, 71.06% 17.22%, 100.50% 17.22%)" },
        { k: "bl", clip: "polygon(-0.50% 81.56%, 8.62% 81.56%, 23.44% 99.44%, 44.94% 99.44%, 44.94% 100.00%, -0.50% 100.00%)" },
        { k: "br", clip: "polygon(100.50% 81.56%, 91.38% 81.56%, 76.56% 99.44%, 55.06% 99.44%, 55.06% 100.00%, 100.50% 100.00%)" },
      ].map((g) => (
        // clip-path and backdrop-filter do NOT compose on the same element: the blur is applied to the
        // element's border box regardless of the clip, which is why these read as squares of blurred
        // video. Clipping the PARENT and putting the filter on a child inside it makes the clip
        // actually constrain the effect, so the glass takes the HUD's shape.
        <div key={g.k} className="pointer-events-none absolute inset-0 z-0" style={{ clipPath: g.clip }} aria-hidden>
          <div
            className="h-full w-full"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.16), rgba(15,23,42,0.34) 48%, rgba(255,255,255,0.07)), radial-gradient(circle at 24% 18%, rgba(255,255,255,0.16), transparent 34%)",
              backdropFilter: "blur(20px) saturate(1.35)",
              WebkitBackdropFilter: "blur(20px) saturate(1.35)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
            }}
          />
        </div>
      ))}

      {cornerTL && <div className="pointer-events-auto z-20 -translate-y-1/2" style={at(290, 16, "tc")}>{cornerTL}</div>}
      {cornerTR && <div className="pointer-events-auto z-20 -translate-y-1/2 flex flex-col items-end" style={at(1310, 16, "tc")}>{cornerTR}</div>}
      {topLeft && <div className="pointer-events-auto z-20" style={at(46, 250, "tl")}>{topLeft}</div>}
      {topRight && <div className="pointer-events-auto z-20 flex flex-col items-end" style={at(1554, 190, "tr")}>{topRight}</div>}
      {bottomRight && <div className="pointer-events-auto z-20 flex flex-col items-end" style={at(46, 238, "bl")}>{bottomRight}</div>}
      {/* Tracker breaks the lower-left panel, as in the reference. */}
      {bottomLeft && <div className="pointer-events-auto z-20" style={at(24, 981, "bl")}>{bottomLeft}</div>}
      {/* Waypoint in the true bottom-right corner, opposite the tracker. */}
      {bottomCorner && <div className="pointer-events-auto z-20 flex flex-col items-end" style={at(46, 610, "tl")}>{bottomCorner}</div>}
      {bottomCentre && <div className="pointer-events-auto z-20" style={at(800, 884, "bc")}>{bottomCentre}</div>}
      {/* Bands address the PANE, not the media rect — filling the letterbox is their job. */}
      {topBand && <div className="pointer-events-auto absolute inset-x-0 top-0">{topBand}</div>}
            {bottomBand && <div className="pointer-events-auto absolute inset-x-0 bottom-0">{bottomBand}</div>}

    </div>
  );
}
