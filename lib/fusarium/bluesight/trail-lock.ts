/** Frame-locked instances. No time-sliding catalog. IoU + block-flow tracker. */

import type { FovBox, FovKind } from "@/lib/fusarium/bluesight/trail-fov"

export const ROCK_CAP = 2
export const BUSH_CAP = 1
export const TREE_CAP = 2
export const PLANT_CAP = 1
export const INSTANCE_CAP = 5
export const LOCK_TTL_S = 0.35

export interface RawDet {
  kind: FovKind
  x: number
  y: number
  w: number
  h: number
  score: number
}

export interface LockState {
  nextId: number
  gray: Uint8ClampedArray | null
  width: number
  height: number
  boxes: FovBox[]
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

function toGray(data: Uint8ClampedArray, w: number, h: number) {
  const g = new Uint8ClampedArray(w * h)
  for (let i = 0; i < w * h; i += 1) {
    const o = i * 4
    g[i] = (data[o] * 30 + data[o + 1] * 59 + data[o + 2] * 11) / 100
  }
  return g
}

function pix(data: Uint8ClampedArray, w: number, x: number, y: number) {
  const o = (y * w + x) * 4
  return { r: data[o], g: data[o + 1], b: data[o + 2] }
}

function nms(dets: RawDet[], minIou: number) {
  const sorted = [...dets].sort((a, b) => b.score - a.score)
  const keep: RawDet[] = []
  for (const d of sorted) {
    if (keep.some((k) => iou(k, d) > minIou)) continue
    keep.push(d)
  }
  return keep
}

function flowShift(prev: Uint8ClampedArray, next: Uint8ClampedArray, w: number, h: number, cx: number, cy: number) {
  const px = clamp(Math.round(cx * (w - 1)), 4, w - 5)
  const py = clamp(Math.round(cy * (h - 1)), 4, h - 5)
  let best = Number.POSITIVE_INFINITY
  let bdx = 0
  let bdy = 0
  for (let dy = -6; dy <= 6; dy += 1) {
    for (let dx = -6; dx <= 6; dx += 1) {
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

function titleOf(kind: FovKind) {
  if (kind === "rock") return "ROCK"
  if (kind === "tree") return "TREE"
  if (kind === "bush") return "BUSH"
  if (kind === "fungus") return "FUNGUS"
  return "PLANT"
}

function classifyCell(data: Uint8ClampedArray, w: number, x: number, y: number, h: number): 0 | 1 | 2 {
  const p = pix(data, w, x, y)
  const l = (p.r + p.g + p.b) / 3
  const ge = p.g - (p.r + p.b) * 0.5
  const q = pix(data, w, clamp(x + 3, 0, w - 1), y)
  const contrast = Math.abs(l - (q.r + q.g + q.b) / 3)
  const yn = y / h
  if (ge > 16) return 2
  if (yn > 0.32 && ge < 10 && l < 118 && contrast > 10) return 1
  return 0
}

function floraKind(yn: number, aspect: number, geScore: number): FovKind {
  if (yn < 0.42 && aspect > 1.15) return "tree"
  if (yn >= 0.16 && yn <= 0.66 && geScore > 18 && aspect < 1.35) return "bush"
  return "plant"
}

export function detectFrameObjects(data: Uint8ClampedArray, w: number, h: number): RawDet[] {
  const step = 2
  const gw = Math.ceil(w / step)
  const gh = Math.ceil(h / step)
  const labels = new Uint8Array(gw * gh)
  for (let gy = 0; gy < gh; gy += 1) {
    const y = Math.min(h - 1, gy * step)
    for (let gx = 0; gx < gw; gx += 1) {
      const x = Math.min(w - 1, gx * step)
      labels[gy * gw + gx] = classifyCell(data, w, x, y, h)
    }
  }

  const seen = new Uint8Array(gw * gh)
  const rocks: RawDet[] = []
  const flora: RawDet[] = []
  const stack: number[] = []

  for (let seed = 0; seed < labels.length; seed += 1) {
    if (!labels[seed] || seen[seed]) continue
    const kind = labels[seed]
    stack.length = 0
    stack.push(seed)
    seen[seed] = 1
    let minX = gw
    let minY = gh
    let maxX = 0
    let maxY = 0
    let n = 0
    let geSum = 0
    while (stack.length) {
      const idx = stack.pop() as number
      const gx = idx % gw
      const gy = (idx - gx) / gw
      minX = Math.min(minX, gx)
      minY = Math.min(minY, gy)
      maxX = Math.max(maxX, gx)
      maxY = Math.max(maxY, gy)
      n += 1
      const px = Math.min(w - 1, gx * step)
      const py = Math.min(h - 1, gy * step)
      const p = pix(data, w, px, py)
      geSum += p.g - (p.r + p.b) * 0.5
      const nbrs: [number, number][] = [
        [gx + 1, gy],
        [gx - 1, gy],
        [gx, gy + 1],
        [gx, gy - 1],
      ]
      for (const [nx, ny] of nbrs) {
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const nb = ny * gw + nx
        if (seen[nb] || labels[nb] !== kind) continue
        seen[nb] = 1
        stack.push(nb)
      }
    }
    if (n < 40) continue
    const x = clamp((minX * step) / w, 0, 0.98)
    const y = clamp((minY * step) / h, 0, 0.98)
    const bw = clamp(((maxX - minX + 1) * step) / w, 0.02, 0.7)
    const bh = clamp(((maxY - minY + 1) * step) / h, 0.02, 0.7)
    const area = bw * bh
    const cx = x + bw * 0.5
    if (area < 0.012 || bw > 0.55 || bh > 0.62) continue
    if ((cx < 0.1 || cx > 0.9) && area < 0.04) continue
    const cy = y + bh * 0.5
    if (kind === 1) {
      rocks.push({ kind: "rock", x, y, w: bw, h: bh, score: n + (1 - y) * 8 })
    } else {
      flora.push({
        kind: floraKind(cy, bh / Math.max(0.01, bw), geSum / n),
        x,
        y,
        w: bw,
        h: bh,
        score: n + geSum / n,
      })
    }
  }

  const rockKeep = nms(rocks, 0.35).slice(0, ROCK_CAP)
  const trees = nms(
    flora.filter((d) => d.kind === "tree"),
    0.4,
  ).slice(0, TREE_CAP)
  const bushes = nms(
    flora.filter((d) => d.kind === "bush"),
    0.4,
  ).slice(0, BUSH_CAP)
  const plants = nms(
    flora.filter((d) => d.kind === "plant"),
    0.45,
  ).slice(0, PLANT_CAP)
  return [...rockKeep, ...trees, ...bushes, ...plants]
}

function asBox(det: RawDet, id: string, timeS: number): FovBox {
  return {
    id,
    kind: det.kind,
    x: det.x,
    y: det.y,
    w: det.w,
    h: det.h,
    area: det.w * det.h,
    range_m: clamp(0.4 + det.y * 8, 0.3, 25),
    title: titleOf(det.kind),
    mineral: det.kind === "rock" ? "unknown mineral" : "unknown plant",
    last_hit_s: timeS,
    in_fov: true,
  }
}

export function emptyLock(): LockState {
  return { nextId: 1, gray: null, width: 0, height: 0, boxes: [] }
}

export function detectAndTrack(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  timeS: number,
  prev: LockState | null,
): LockState {
  const dets = detectFrameObjects(data, w, h)
  const gray = toGray(data, w, h)
  const used = new Set<number>()
  const next: FovBox[] = []
  let nextId = prev?.nextId ?? 1

  if (prev?.gray && prev.width === w && prev.height === h) {
    for (const box of prev.boxes) {
      if (box.id.startsWith("litmus-")) continue
      const cx = box.x + box.w / 2
      const cy = box.y + box.h / 2
      const flow = flowShift(prev.gray, gray, w, h, cx, cy)
      const pred = {
        x: clamp(box.x + flow.dx, 0, 0.98),
        y: clamp(box.y + flow.dy, 0, 0.98),
        w: box.w,
        h: box.h,
      }
      let best = -1
      let bestI = -1
      for (let i = 0; i < dets.length; i += 1) {
        if (used.has(i) || dets[i].kind !== box.kind) continue
        const ov = iou(pred, dets[i])
        const dx = pred.x + pred.w / 2 - (dets[i].x + dets[i].w / 2)
        const dy = pred.y + pred.h / 2 - (dets[i].y + dets[i].h / 2)
        const score = ov * 1.6 - Math.hypot(dx, dy)
        if (score > best) {
          best = score
          bestI = i
        }
      }
      if (bestI >= 0 && best > 0.04) {
        used.add(bestI)
        next.push(asBox(dets[bestI], box.id, timeS))
      } else if (
        timeS - box.last_hit_s < LOCK_TTL_S &&
        Math.abs(flow.dx) + Math.abs(flow.dy) > 0.002
      ) {
        const coast: FovBox = {
          ...box,
          x: pred.x,
          y: pred.y,
          area: pred.w * pred.h,
        }
        if (coast.x > 0 && coast.y > 0 && coast.x + coast.w < 1 && coast.y + coast.h < 1) {
          next.push(coast)
        }
      }
    }
  }

  const leftovers = dets
    .map((det, i) => ({ det, i }))
    .filter(({ i }) => !used.has(i))
    .sort((a, b) => {
      const sa = a.det.w * a.det.h + (a.det.y + a.det.h) * 0.45
      const sb = b.det.w * b.det.h + (b.det.y + b.det.h) * 0.45
      return sb - sa
    })
  for (const { det } of leftovers) {
    if (next.length >= INSTANCE_CAP) break
    next.push(asBox(det, `${det.kind}-${nextId}`, timeS))
    nextId += 1
  }

  const kept = next
    .slice()
    .sort((a, b) => b.area + (b.y + b.h) * 0.2 - (a.area + (a.y + a.h) * 0.2))
    .slice(0, INSTANCE_CAP)
  return { nextId, gray, width: w, height: h, boxes: kept }
}
