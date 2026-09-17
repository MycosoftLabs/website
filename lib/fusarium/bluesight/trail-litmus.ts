/** Laptop-lab visual receipt: handheld elf ear on this exact PXL file. Not live YOLO. */

import { PXL_DURATION_S } from "@/lib/fusarium/bluesight/trail-ar"
import type { FovBox } from "@/lib/fusarium/bluesight/trail-fov"

export const FUNGUS_LITMUS = {
  id: "litmus-elf-ear-pxl-20260913",
  enter_s: 8.85,
  exit_s: 10.15,
  peak_s: 9.50,
  note: "PXL_20260913_211840104.mp4 frames ~9.0–10.1s: right palm holds brown cup fungus. ADE20K earth/path miss this close-up.",
} as const

export function fungusInFrame(timeS: number) {
  return timeS >= FUNGUS_LITMUS.enter_s && timeS <= FUNGUS_LITMUS.exit_s
}

/**
 * Tight fruiting-body box on the palm — not the whole forearm.
 * range_m stays null: DA-V2 unbound, do not invent meters.
 */
export function fungusLitmusBox(timeS: number, label: { common: string; taxon: string; source: string }): FovBox | null {
  if (!fungusInFrame(timeS) || timeS > PXL_DURATION_S) return null
  const u = (timeS - FUNGUS_LITMUS.enter_s) / (FUNGUS_LITMUS.exit_s - FUNGUS_LITMUS.enter_s)
  const x = 0.3 + u * 0.05
  const y = 0.58 + u * 0.12
  const w = 0.2
  const h = 0.16
  const taxonHit = label.source.startsWith("MINDEX") && !label.taxon.startsWith("unknown")
  return {
    id: FUNGUS_LITMUS.id,
    kind: "fungus",
    x,
    y,
    w,
    h,
    area: w * h,
    range_m: Number.NaN,
    title: taxonHit ? label.taxon : "elf ear",
    mineral: taxonHit ? label.taxon : "fungus · unknown",
    last_hit_s: timeS,
    in_fov: true,
  }
}

export const FUNGUS_LABEL_FALLBACK = {
  common: "elf ear / wood ear",
  taxon: "unknown species",
  source: "visual receipt · MINDEX unbound",
}
