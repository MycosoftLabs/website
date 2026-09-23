/** In-view plant/rock boxes. Fast appear, hard drop. Never a sticky layer. */

import { PXL_DURATION_S } from "@/lib/fusarium/bluesight/trail-ar"

export const BOX_TTL_S = 1.0
export const ROCK_INVIEW_CAP = 12
export const PLANT_INVIEW_CAP = 12

export type FovKind = "rock" | "plant" | "tree" | "bush" | "fungus"

export interface FovBox {
  id: string
  kind: FovKind
  x: number
  y: number
  w: number
  h: number
  area: number
  range_m: number
  title: string
  mineral: string
  last_hit_s: number
  in_fov: true
}

export interface FovCatalogEntry {
  id: string
  kind: FovKind
  enter_s: number
  exit_s: number
  x0: number
  y0: number
  w: number
  h: number
  range0: number
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function iou(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w)
  const y2 = Math.min(a.y + a.h, b.y + b.h)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = a.w * a.h + b.w * b.h - inter
  return union <= 0 ? 0 : inter / union
}

/** Staggered trail instances. Visible only while the walk is looking at them. */
export function buildFovCatalog(): FovCatalogEntry[] {
  const rocks: FovCatalogEntry[] = []
  const plants: FovCatalogEntry[] = []
  for (let i = 0; i < 28; i += 1) {
    const enter = (i * 0.48) % (PXL_DURATION_S - 0.9)
    const span = 0.55 + (i % 4) * 0.12
    rocks.push({
      id: `rock-${i}`,
      kind: "rock",
      enter_s: enter,
      exit_s: enter + span,
      x0: 0.18 + ((i * 17) % 62) / 100,
      y0: 0.42 + ((i * 11) % 28) / 100,
      w: 0.1 + (i % 5) * 0.028,
      h: 0.08 + (i % 4) * 0.022,
      range0: 1.4 + (i % 7) * 0.7,
    })
  }
  for (let i = 0; i < 22; i += 1) {
    const enter = (i * 0.58 + 0.2) % (PXL_DURATION_S - 0.9)
    const span = 0.5 + (i % 3) * 0.14
    plants.push({
      id: i % 5 === 0 ? `tree-${i}` : `plant-${i}`,
      kind: i % 5 === 0 ? "tree" : "plant",
      enter_s: enter,
      exit_s: enter + span,
      x0: i % 2 === 0 ? 0.04 + (i % 6) * 0.03 : 0.62 + (i % 5) * 0.04,
      y0: 0.08 + ((i * 9) % 36) / 100,
      w: 0.14 + (i % 4) * 0.03,
      h: 0.16 + (i % 3) * 0.04,
      range0: 2.6 + (i % 6) * 0.9,
    })
  }
  return [...rocks, ...plants]
}

const CATALOG = buildFovCatalog()

function project(entry: FovCatalogEntry, timeS: number) {
  const u = clamp((timeS - entry.enter_s) / Math.max(0.2, entry.exit_s - entry.enter_s), 0, 1)
  const y = clamp(entry.y0 + u * 0.28, 0.04, 0.92)
  const grow = 1 + u * 0.35
  return {
    x: clamp(entry.x0 - (grow - 1) * entry.w * 0.2, 0, 0.94),
    y,
    w: clamp(entry.w * grow, 0.06, 0.42),
    h: clamp(entry.h * grow, 0.05, 0.4),
    range_m: clamp(entry.range0 * (1 - u * 0.35), 0.3, 25),
  }
}

export function candidatesAtTime(timeS: number): FovBox[] {
  const t = clamp(timeS, 0, PXL_DURATION_S)
  const hits: FovBox[] = []
  for (const entry of CATALOG) {
    if (t < entry.enter_s || t > entry.exit_s) continue
    const box = project(entry, t)
    hits.push({
      id: entry.id,
      kind: entry.kind,
      ...box,
      area: box.w * box.h,
      title: entry.kind === "rock" ? "ROCK" : entry.kind === "tree" ? "TREE" : "PLANT",
      mineral: entry.kind === "rock" ? "unknown mineral" : "unknown plant",
      last_hit_s: t,
      in_fov: true,
    })
  }
  return hits
}

function labelBox(hit: FovBox, labels: Record<string, string>): FovBox {
  const kindLabel = hit.kind === "rock" ? labels.rock : hit.kind === "tree" ? labels.tree : labels.plant
  const mineral = hit.kind === "rock" ? labels.mineral || "unknown mineral" : kindLabel || "unknown plant"
  return {
    ...hit,
    title: hit.kind === "rock" ? "ROCK" : hit.kind === "tree" ? "TREE" : "PLANT",
    mineral,
  }
}

/** Fresh hit → box now. Leave FOV → drop now. Miss while in-view → drop after BOX_TTL_S (1.0s). */
export function refreshFovBoxes(timeS: number, prev: FovBox[], labels: Record<string, string>): FovBox[] {
  const now = clamp(timeS, 0, PXL_DURATION_S)
  const fresh = candidatesAtTime(now)
  const next: FovBox[] = []
  const seen = new Set<string>()

  for (const hit of fresh) {
    seen.add(hit.id)
    next.push(labelBox({ ...hit, last_hit_s: now }, labels))
  }

  for (const prior of prev) {
    if (seen.has(prior.id)) continue
    const stillCatalog = CATALOG.some((e) => e.id === prior.id && now >= e.enter_s && now <= e.exit_s)
    if (!stillCatalog) continue
    if (now - prior.last_hit_s > BOX_TTL_S) continue
    if (iou(prior, { x: 0, y: 0, w: 1, h: 1 }) <= 0) continue
    next.push(prior)
  }

  const plantCap = Math.max(6, PLANT_INVIEW_CAP - Math.floor((labels.loop_n ? Number(labels.loop_n) : 0) * 2))
  const rocks = next.filter((b) => b.kind === "rock").sort((a, b) => b.area - a.area).slice(0, ROCK_INVIEW_CAP)
  const flora = next.filter((b) => b.kind !== "rock").sort((a, b) => b.area - a.area).slice(0, plantCap)
  return [...rocks, ...flora]
}

export const OVERHEAD_HOOKS = [
  "/fusarium/bluesight/trail-overhead.jpg",
  "/fusarium/bluesight/trail-overhead.png",
  "/fusarium/bluesight/trail-overhead.webp",
]
