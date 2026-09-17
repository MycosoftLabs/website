/**
 * Contact HUD — boot soles on the trail bed, not screen stamps.
 * DA-V2 depth is unbound in this Next process. Placement is inverse-width
 * ground scale on the L/R path mask; persistence is block optical flow on
 * those path pixels, then snap back between corridor edges.
 */

import type { PathCorridor } from "@/lib/fusarium/bluesight/path-corridor"
import { STEP_CHAIN_CAP, STEP_SPACING_M } from "@/lib/fusarium/bluesight/trail-route"

export type ContactTone = "GREEN" | "CYAN" | "RED"
export type ContactFoot = "L" | "R"

export interface ContactQuad {
  /** toeL, toeR, heelR, heelL — normalized video */
  corners: [[number, number], [number, number], [number, number], [number, number]]
  cx: number
  cy: number
}

export interface ContactPatch {
  id: string
  foot: ContactFoot
  slot: number
  quad: ContactQuad
  meters: number
  tone: ContactTone
  label: string
  xCode: string | null
  flicker_ms: number
}

export interface ContactHud {
  source: "path-mask-flow"
  depth_bind: "UNBOUND"
  heading_rad: number
  swing: ContactFoot
  boots: { L: [number, number]; R: [number, number] }
  patches: ContactPatch[]
  commit: ContactPatch | null
  banner: { line: string; search: string; pips: number }
  xIndex: number
}

export interface ContactMemory {
  gray: Uint8ClampedArray | null
  width: number
  height: number
  patches: ContactPatch[]
  commit: ContactPatch | null
  xIndex: number
  cyanUntil: Map<string, number>
  lastGreenId: string | null
  spawnSeq: number
  lastPlaceMs: number
}

interface Row {
  y: number
  left: number
  right: number
  center: number
  width: number
}

const TRAIL_WIDTH_M = 0.88
/** Slow clock: new foothold placement + CYAN/RED score only. Flow stays on rAF. */
export const STEP_PLACE_MS = 280
const CYAN_FLICKER_MS = STEP_PLACE_MS
const STEP_VISIBLE_CAP = 3

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function emptyContactMemory(): ContactMemory {
  return {
    gray: null,
    width: 0,
    height: 0,
    patches: [],
    commit: null,
    xIndex: 0,
    cyanUntil: new Map(),
    lastGreenId: null,
    spawnSeq: 0,
    lastPlaceMs: 0,
  }
}

function toGray(data: Uint8ClampedArray, w: number, h: number) {
  const g = new Uint8ClampedArray(w * h)
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4
    g[i] = (data[o] * 30 + data[o + 1] * 59 + data[o + 2] * 11) / 100
  }
  return g
}

function rowsFrom(corridor: PathCorridor | null): Row[] {
  if (!corridor) return []
  const n = Math.min(corridor.left.length, corridor.right.length)
  const rows: Row[] = []
  for (let i = 0; i < n; i += 1) {
    const left = corridor.left[i][0]
    const right = corridor.right[i][0]
    const y = (corridor.left[i][1] + corridor.right[i][1]) / 2
    rows.push({ y, left, right, center: (left + right) / 2, width: Math.max(0.04, right - left) })
  }
  rows.sort((a, b) => b.y - a.y)
  return rows
}

function mixRow(a: Row, b: Row, t: number): Row {
  return {
    y: a.y + (b.y - a.y) * t,
    left: a.left + (b.left - a.left) * t,
    right: a.right + (b.right - a.right) * t,
    center: a.center + (b.center - a.center) * t,
    width: a.width + (b.width - a.width) * t,
  }
}

function rowAt(rows: Row[], y: number): Row | null {
  if (!rows.length) return null
  if (y >= rows[0].y) return rows[0]
  if (y <= rows[rows.length - 1].y) return rows[rows.length - 1]
  for (let i = 0; i < rows.length - 1; i += 1) {
    if (y <= rows[i].y && y >= rows[i + 1].y) {
      const span = rows[i].y - rows[i + 1].y || 1
      return mixRow(rows[i], rows[i + 1], (rows[i].y - y) / span)
    }
  }
  return rows[0]
}

function mPerNorm(row: Row) {
  return TRAIL_WIDTH_M / Math.max(0.06, row.width)
}

function ds(a: Row, b: Row) {
  const m = (mPerNorm(a) + mPerNorm(b)) * 0.5
  return Math.hypot((b.center - a.center) * m, (a.y - b.y) * m * 1.18)
}

function pointAtMeters(rows: Row[], startY: number, meters: number): { x: number; y: number; row: Row } | null {
  if (rows.length < 2) return null
  let acc = 0
  let a = rowAt(rows, startY)
  if (!a) return null
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].y >= startY - 0.002) continue
    const b = rows[i]
    const step = ds(a, b)
    if (acc + step >= meters) {
      const t = step <= 1e-6 ? 1 : (meters - acc) / step
      const row = mixRow(a, b, t)
      return { x: row.center, y: row.y, row }
    }
    acc += step
    a = b
  }
  const last = rows[rows.length - 1]
  return { x: last.center, y: last.y, row: last }
}

function headingOf(corridor: PathCorridor | null, rows: Row[]) {
  if (corridor) return corridor.heading_rad
  if (rows.length >= 2) return Math.atan2(rows[rows.length - 1].center - rows[0].center, rows[0].y - rows[rows.length - 1].y)
  return 0
}


function soleQuad(cx: number, cy: number, heading: number, row: Row): ContactQuad {
  const mnx = mPerNorm(row)
  const mny = mnx * 1.18
  const halfW = Math.max(0.052, 0.07 / mnx)
  const halfL = Math.max(0.07, 0.16 / mny)
  const ux = Math.sin(heading)
  const uy = -Math.cos(heading)
  const px = Math.cos(heading)
  const py = Math.sin(heading)
  const corner = (ax: number, ay: number): [number, number] => [
    clamp(cx + ax, row.left + 0.01, row.right - 0.01),
    clamp(cy + ay, 0.08, 0.97),
  ]
  return {
    corners: [
      corner(ux * halfL - px * halfW, uy * halfL - py * halfW),
      corner(ux * halfL + px * halfW, uy * halfL + py * halfW),
      corner(-ux * halfL + px * halfW, -uy * halfL + py * halfW),
      corner(-ux * halfL - px * halfW, -uy * halfL - py * halfW),
    ],
    cx,
    cy,
  }
}

function findBoots(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  rows: Row[],
): { L: [number, number]; R: [number, number]; swing: ContactFoot } {
  const near = rows[0] ?? { y: 0.9, left: 0.28, right: 0.72, center: 0.5, width: 0.44 }
  let lx = 0
  let ly = 0
  let ln = 0
  let rx = 0
  let ry = 0
  let rn = 0
  const y0 = Math.round(0.74 * (h - 1))
  const y1 = Math.round(0.97 * (h - 1))
  const x0 = Math.round(clamp(near.left - 0.06, 0, 1) * (w - 1))
  const x1 = Math.round(clamp(near.right + 0.06, 0, 1) * (w - 1))
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const o = (y * w + x) * 4
      const r = data[o]
      const g = data[o + 1]
      const b = data[o + 2]
      const l = (r + g + b) / 3
      const ge = g - (r + b) * 0.5
      if (l > 78 || ge > 14) continue
      const xn = x / w
      const yn = y / h
      if (xn < near.center) {
        lx += xn
        ly += yn
        ln += 1
      } else {
        rx += xn
        ry += yn
        rn += 1
      }
    }
  }
  const L: [number, number] = ln > 10 ? [lx / ln, ly / ln] : [near.center - near.width * 0.22, 0.9]
  const R: [number, number] = rn > 10 ? [rx / rn, ry / rn] : [near.center + near.width * 0.22, 0.9]
  const swing: ContactFoot = L[1] < R[1] - 0.008 ? "L" : R[1] < L[1] - 0.008 ? "R" : L[0] < near.center ? "L" : "R"
  return { L, R, swing }
}

function flowAt(
  prev: Uint8ClampedArray,
  next: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
) {
  const px = clamp(Math.round(cx * (w - 1)), 5, w - 6)
  const py = clamp(Math.round(cy * (h - 1)), 5, h - 6)
  let best = Number.POSITIVE_INFINITY
  let bdx = 0
  let bdy = 0
  for (let dy = -7; dy <= 7; dy += 1) {
    for (let dx = -5; dx <= 5; dx += 1) {
      let sad = 0
      for (let j = -3; j <= 3; j += 1) {
        for (let i = -3; i <= 3; i += 1) {
          const ax = px + i
          const ay = py + j
          const bx = clamp(px + i + dx, 0, w - 1)
          const by = clamp(py + j + dy, 0, h - 1)
          sad += Math.abs(prev[ay * w + ax] - next[by * w + bx])
        }
      }
      if (sad < best) {
        best = sad
        bdx = dx
        bdy = dy
      }
    }
  }
  return { dx: bdx / w, dy: bdy / h }
}

function sampleScores(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  cx: number,
  cy: number,
  row: Row,
  foot: ContactFoot,
) {
  let lum = 0
  let ge = 0
  let contrast = 0
  let n = 0
  const x0 = clamp(Math.round((cx - 0.035) * (w - 1)), 1, w - 2)
  const x1 = clamp(Math.round((cx + 0.035) * (w - 1)), 1, w - 2)
  const y0 = clamp(Math.round((cy - 0.022) * (h - 1)), 1, h - 2)
  const y1 = clamp(Math.round((cy + 0.022) * (h - 1)), 1, h - 2)
  let last = -1
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const o = (y * w + x) * 4
      const l = (data[o] + data[o + 1] + data[o + 2]) / 3
      lum += l
      ge += data[o + 1] - (data[o] + data[o + 2]) * 0.5
      if (last >= 0) contrast += Math.abs(l - last)
      last = l
      n += 1
    }
  }
  const meanL = n ? lum / n : 80
  const meanGe = n ? ge / n : 0
  const meanC = n > 1 ? contrast / (n - 1) : 0
  const distL = (cx - row.left) / row.width
  const distR = (row.right - cx) / row.width
  const edgeDist = Math.min(distL, distR)
  const cliffSide = foot === "R" ? distR : distL
  const veg = meanGe > 20
  const drop = meanL < 28 && meanC < 6
  let edge = 0.1
  if (cliffSide < 0.18 || edgeDist < 0.12) edge = 0.88
  else if (foot === "R" && distR < 0.28) edge = 0.72
  else if (edgeDist < 0.22) edge = 0.5
  const slip = drop || meanL < 38 ? 0.8 : meanL < 50 && meanGe < 6 ? 0.58 : 0.16
  const slope = row.width < 0.13 ? 0.78 : row.width < 0.18 ? 0.6 : foot === "R" && distR < 0.32 ? 0.58 : 0.22
  const grip = veg ? 0.48 : meanC < 5 ? 0.4 : meanL > 125 ? 0.36 : 0.2
  return { edge, slip, slope, grip, veg, drop }
}

function decide(
  scores: { edge: number; slip: number; slope: number; grip: number },
  foot: ContactFoot,
  slot: number,
): { tone: ContactTone; label: string } {
  if (scores.edge > 0.65) return { tone: "RED", label: `${foot}${slot} REJECT EDGE 25%` }
  if (scores.slip > 0.65) return { tone: "RED", label: `${foot}${slot} REJECT SLIP 27%` }
  if (scores.slope > 0.55) {
    const pct = Math.round(47 + clamp(scores.slope, 0, 1) * 45)
    return { tone: "CYAN", label: `${foot}${slot} SLOPE CHECK ${pct}%` }
  }
  if (scores.grip > 0.34 && scores.grip < 0.63) {
    const pct = Math.round(47 + (scores.grip - 0.34) * 50)
    return { tone: "CYAN", label: `${foot}${slot} GRIP CHECK ${clamp(pct, 47, 62)}%` }
  }
  return { tone: "GREEN", label: `${foot}` }
}

function snapToPath(x: number, y: number, rows: Row[], heading: number): { x: number; y: number; row: Row; quad: ContactQuad } | null {
  const row = rowAt(rows, y)
  if (!row) return null
  const pad = row.width * 0.12
  const sx = clamp(x, row.left + pad, row.right - pad)
  const sy = clamp(y, rows[rows.length - 1].y, rows[0].y)
  return { x: sx, y: sy, row, quad: soleQuad(sx, sy, heading, row) }
}

function pathLengthM(rows: Row[]) {
  let acc = 0
  for (let i = 0; i < rows.length - 1; i += 1) acc += ds(rows[i], rows[i + 1])
  return acc
}

function spawnChain(
  rows: Row[],
  heading: number,
  swing: ContactFoot,
  bootY: number,
): ContactPatch[] {
  const other: ContactFoot = swing === "L" ? "R" : "L"
  const farY = rows[rows.length - 1].y
  const maxM = Math.min(pathLengthM(rows) - 0.15, STEP_SPACING_M * STEP_CHAIN_CAP)
  const out: ContactPatch[] = []
  let meters = 0.4
  let slot = 1
  while (meters <= maxM && out.length < STEP_CHAIN_CAP) {
    const hit = pointAtMeters(rows, bootY, meters)
    if (!hit || hit.y <= farY + 0.01) break
    const foot: ContactFoot = slot % 2 === 1 ? swing : other
    const inward = hit.row.width * (foot === "R" ? 0.22 : 0.26)
    const x = clamp(
      foot === "L" ? hit.row.left + inward : hit.row.right - inward,
      hit.row.left + hit.row.width * 0.08,
      hit.row.right - hit.row.width * 0.08,
    )
    out.push({
      id: `chain-${slot}`,
      foot,
      slot,
      quad: soleQuad(x, hit.y, heading, hit.row),
      meters,
      tone: "CYAN",
      label: `${foot}${slot} CONTACT`,
      xCode: null,
      flicker_ms: 0,
    })
    meters += STEP_SPACING_M
    slot += 1
    if (out.length >= STEP_VISIBLE_CAP) break
  }
  return out
}

function flowExisting(
  prev: ContactMemory,
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  rows: Row[],
  heading: number,
  patch: ContactPatch,
): ContactPatch | null {
  if (!prev.gray || prev.width !== width || rows.length < 2) return patch
  const flow = flowAt(prev.gray, gray, width, height, patch.quad.cx, patch.quad.cy)
  const snapped = snapToPath(patch.quad.cx + flow.dx, patch.quad.cy + flow.dy, rows, heading)
  if (!snapped || snapped.y > 0.96) return null
  return { ...patch, quad: snapped.quad }
}

export function updateContactHud(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  corridor: PathCorridor | null,
  prev: ContactMemory,
  nowMs: number,
): { hud: ContactHud; memory: ContactMemory } {
  const rows = rowsFrom(corridor)
  const heading = headingOf(corridor, rows)
  const boots = rows.length >= 3
    ? findBoots(data, width, height, rows)
    : { L: [0.45, 0.9] as [number, number], R: [0.55, 0.9] as [number, number], swing: "R" as ContactFoot }
  const gray = toGray(data, width, height)
  const memory: ContactMemory = {
    ...prev,
    gray,
    width,
    height,
    cyanUntil: new Map(prev.cyanUntil),
  }

  if (rows.length < 3) {
    if (memory.commit && prev.gray && prev.width === width) {
      const flow = flowAt(prev.gray, gray, width, height, memory.commit.quad.cx, memory.commit.quad.cy)
      memory.commit = {
        ...memory.commit,
        quad: {
          ...memory.commit.quad,
          cx: clamp(memory.commit.quad.cx + flow.dx, 0.08, 0.92),
          cy: clamp(memory.commit.quad.cy + flow.dy, 0.08, 0.96),
          corners: memory.commit.quad.corners.map(([x, y]) => [
            clamp(x + flow.dx, 0.04, 0.96),
            clamp(y + flow.dy, 0.08, 0.97),
          ]) as ContactQuad["corners"],
        },
        tone: "GREEN",
      }
    }
    return {
      hud: {
        source: "path-mask-flow",
        depth_bind: "UNBOUND",
        heading_rad: heading,
        swing: boots.swing,
        boots: { L: boots.L, R: boots.R },
        patches: memory.commit ? [memory.commit] : [],
        commit: memory.commit,
        banner: { line: "ANALYSING TERRAIN", search: "CONTACT SEARCH", pips: 1 },
        xIndex: memory.xIndex,
      },
      memory,
    }
  }

  const flowed: ContactPatch[] = []
  for (const patch of prev.patches) {
    const next = flowExisting(prev, gray, width, height, rows, heading, patch)
    if (next) flowed.push(next)
  }
  if (memory.commit) {
    const held = flowExisting(prev, gray, width, height, rows, heading, memory.commit)
    memory.commit = held ? { ...held, tone: "GREEN" } : null
  }

  let patches = flowed
  const placeDue = nowMs - (memory.lastPlaceMs || 0) >= STEP_PLACE_MS
  if (placeDue) {
    memory.lastPlaceMs = nowMs
    const swingY = memory.commit?.quad.cy ?? (boots.swing === "L" ? boots.L[1] : boots.R[1])
    const swing: ContactFoot = memory.commit ? (memory.commit.foot === "L" ? "R" : "L") : boots.swing
    const chain = spawnChain(rows, heading, swing, swingY).slice(0, STEP_VISIBLE_CAP)
    const nextPatches: ContactPatch[] = []
    for (const fresh of chain) {
      const prior = flowed.find((p) => p.slot === fresh.slot) ?? flowed.find((p) => p.foot === fresh.foot)
      const loc = prior ?? fresh
      if (memory.commit && (loc.id === memory.commit.id || prior?.tone === "GREEN")) {
        nextPatches.push({
          ...loc,
          tone: "GREEN",
          label: loc.foot,
          xCode: prior?.xCode ?? memory.commit.xCode,
          flicker_ms: 0,
        })
        continue
      }
      const row = rowAt(rows, loc.quad.cy) ?? rows[0]
      const scores = sampleScores(data, width, height, loc.quad.cx, loc.quad.cy, row, loc.foot)
      if (scores.veg) continue
      const verdict = decide(scores, loc.foot, loc.slot)
      let xCode = loc.xCode
      if (verdict.tone === "GREEN" && !memory.commit) {
        memory.xIndex += 1
        xCode = `X${String(memory.xIndex).padStart(2, "0")}`
        memory.lastGreenId = loc.id
        memory.commit = { ...loc, tone: "GREEN", label: loc.foot, xCode, flicker_ms: 0 }
      }
      if (verdict.tone === "CYAN") {
        const until = memory.cyanUntil.get(loc.id) ?? nowMs + CYAN_FLICKER_MS
        if (!memory.cyanUntil.has(loc.id)) memory.cyanUntil.set(loc.id, until)
      } else {
        memory.cyanUntil.delete(loc.id)
      }
      nextPatches.push({
        ...loc,
        tone: verdict.tone,
        label: verdict.tone === "GREEN" ? loc.foot : verdict.label,
        xCode: verdict.tone === "GREEN" ? xCode : null,
        flicker_ms: verdict.tone === "CYAN" || verdict.tone === "RED" ? STEP_PLACE_MS : 0,
      })
    }
    patches = nextPatches
  }

  memory.patches = patches
  const greens = patches.filter((p) => p.tone === "GREEN").length
  return {
    hud: {
      source: "path-mask-flow",
      depth_bind: "UNBOUND",
      heading_rad: heading,
      swing: boots.swing,
      boots: { L: boots.L, R: boots.R },
      patches,
      commit: memory.commit,
      banner: {
        line: "ANALYSING TERRAIN",
        search: "CONTACT SEARCH",
        pips: clamp(1 + greens, 1, 3),
      },
      xIndex: memory.xIndex,
    },
    memory,
  }
}
