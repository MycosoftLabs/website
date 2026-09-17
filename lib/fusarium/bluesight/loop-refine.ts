/**
 * Loop-refined recursive learning — session last-good perimeters.
 * IoU is computed. forecast_p stays null. No fake F1 / 0.85.
 */

import { contourMaskIou, type ContourBox } from "@/lib/fusarium/bluesight/trail-contours"

export const LOOP_STABILITY_LO = 0.72
export const LOOP_IMPROVE_EPS = 0.02

export interface LastGoodContour {
  key: string
  kind: string
  pts: [number, number][]
  box: ContourBox
  iou: number | null
  loop: number
}

export interface LoopLearnRow {
  schema: "itdx-loop-refine/v1"
  live: false
  forecast_p: null
  at: string
  t: number
  loop: number
  instance_id: string
  class: string
  contour_n: number
  bbox: ContourBox
  iou: number | null
  iou_delta: number | null
  accepted: boolean
  decision: "accept" | "reject" | "seed"
  reason: string
  source_fps: number
  overlay_hz: number
}

export interface LoopRefineTotals {
  loop: number
  accepts: number
  rejects: number
  seeds: number
  last_iou: number | null
  last_iou_delta: number | null
  logged: number
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v))
}

export function instanceKey(kind: string, box: ContourBox): string {
  const cx = Math.round((box.x + box.w * 0.5) * 8)
  const cy = Math.round((box.y + box.h * 0.5) * 8)
  return `${kind}@${cx},${cy}`
}

export function emptyLoopTotals(loop = 0): LoopRefineTotals {
  return {
    loop,
    accepts: 0,
    rejects: 0,
    seeds: 0,
    last_iou: null,
    last_iou_delta: null,
    logged: 0,
  }
}

export function decideVsLastGood(
  candidate: [number, number][],
  last: LastGoodContour | undefined,
  loopN: number,
): { decision: LoopLearnRow["decision"]; pts: [number, number][]; iou: number | null; iouDelta: number | null; reason: string } {
  if (!last || last.pts.length < 3) {
    return {
      decision: "seed",
      pts: candidate,
      iou: null,
      iouDelta: null,
      reason: loopN === 0 ? "first lock this session" : "no last-good for this instance",
    }
  }
  const iou = contourMaskIou(candidate, last.pts)
  if (iou == null) {
    return {
      decision: "reject",
      pts: last.pts,
      iou: null,
      iouDelta: null,
      reason: "IoU not yet scored — kept last-good perimeter",
    }
  }
  const prior = last.iou
  const iouDelta = prior == null ? null : iou - prior
  const improved = prior == null ? iou >= LOOP_STABILITY_LO : iou + 1e-9 >= prior - LOOP_IMPROVE_EPS
  const stable = iou >= LOOP_STABILITY_LO
  if (improved || stable) {
    return {
      decision: "accept",
      pts: candidate,
      iou,
      iouDelta,
      reason: improved && prior != null ? "IoU improved or held vs last-good" : "IoU in stability band",
    }
  }
  return {
    decision: "reject",
    pts: last.pts,
    iou,
    iouDelta,
    reason: "IoU worsened vs last-good — kept last-good perimeter",
  }
}

export function applyLoopDecision(
  lastGood: Map<string, LastGoodContour>,
  totals: LoopRefineTotals,
  input: {
    id: string
    kind: string
    box: ContourBox
    candidate: [number, number][]
    loop: number
    t: number
    sourceFps: number
    overlayHz: number
  },
): { pts: [number, number][]; row: LoopLearnRow } {
  const key = instanceKey(input.kind, input.box)
  const last = lastGood.get(key)
  const judged = decideVsLastGood(input.candidate, last, input.loop)
  if (judged.decision === "accept" || judged.decision === "seed") {
    lastGood.set(key, {
      key,
      kind: input.kind,
      pts: judged.pts,
      box: { ...input.box },
      iou: judged.iou,
      loop: input.loop,
    })
    if (judged.decision === "seed") totals.seeds += 1
    else totals.accepts += 1
  } else {
    totals.rejects += 1
  }
  totals.loop = input.loop
  totals.last_iou = judged.iou
  totals.last_iou_delta = judged.iouDelta
  totals.logged += 1
  const row: LoopLearnRow = {
    schema: "itdx-loop-refine/v1",
    live: false,
    forecast_p: null,
    at: new Date().toISOString(),
    t: input.t,
    loop: input.loop,
    instance_id: input.id,
    class: input.kind,
    contour_n: judged.pts.length,
    bbox: {
      x: clamp01(input.box.x),
      y: clamp01(input.box.y),
      w: clamp01(input.box.w),
      h: clamp01(input.box.h),
    },
    iou: judged.iou,
    iou_delta: judged.iouDelta,
    accepted: judged.decision !== "reject",
    decision: judged.decision,
    reason: judged.reason,
    source_fps: input.sourceFps,
    overlay_hz: input.overlayHz,
  }
  return { pts: judged.pts, row }
}
