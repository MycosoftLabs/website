/**
 * Instance silhouette from a color mask — not Canny, not radial scribbles.
 * YOLO-seg / SAM unbound in this Next process; flood-fill + Moore + RDP is the
 * fail-closed perimeter engine until those weights run as a sidecar.
 */

export interface ContourBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ContourMemoryRow {
  id: string
  loop: number
  pts: [number, number][]
  box: ContourBox
  iou: number | null
  decision: "accept" | "reject" | "seed"
  reason: string
}

const memory = new Map<string, ContourMemoryRow>()
const loopLog: { loop: number; accepted: number; rejected: number; mean_iou: number | null; at: string }[] = []

export function getContourLoopLog() {
  return loopLog.slice(-8)
}

export function contourMaskIou(a: [number, number][], b: [number, number][]): number | null {
  if (a.length < 3 || b.length < 3) return null
  const box = (pts: [number, number][]) => {
    let x0 = 1
    let y0 = 1
    let x1 = 0
    let y1 = 0
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x)
      y0 = Math.min(y0, y)
      x1 = Math.max(x1, x)
      y1 = Math.max(y1, y)
    }
    return { x: x0, y: y0, w: Math.max(0.001, x1 - x0), h: Math.max(0.001, y1 - y0) }
  }
  const A = box(a)
  const B = box(b)
  const ix1 = Math.max(A.x, B.x)
  const iy1 = Math.max(A.y, B.y)
  const ix2 = Math.min(A.x + A.w, B.x + B.w)
  const iy2 = Math.min(A.y + A.h, B.y + B.h)
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1)
  const union = A.w * A.h + B.w * B.h - inter
  return union <= 0 ? null : inter / union
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function dist2(a: [number, number], b: [number, number]) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

function rdp(pts: [number, number][], eps: number): [number, number][] {
  if (pts.length < 3) return pts
  let maxD = 0
  let idx = 0
  const a = pts[0]
  const b = pts[pts.length - 1]
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const ab2 = abx * abx + aby * aby || 1
  for (let i = 1; i < pts.length - 1; i += 1) {
    const t = ((pts[i][0] - a[0]) * abx + (pts[i][1] - a[1]) * aby) / ab2
    const px = a[0] + t * abx
    const py = a[1] + t * aby
    const d = Math.hypot(pts[i][0] - px, pts[i][1] - py)
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD < eps) return [a, b]
  return [...rdp(pts.slice(0, idx + 1), eps).slice(0, -1), ...rdp(pts.slice(idx), eps)]
}

function chaikin(pts: [number, number][], rounds: number): [number, number][] {
  let cur = pts
  for (let r = 0; r < rounds; r += 1) {
    const next: [number, number][] = []
    for (let i = 0; i < cur.length; i += 1) {
      const a = cur[i]
      const b = cur[(i + 1) % cur.length]
      next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]])
      next.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]])
    }
    cur = next
  }
  return cur
}

function floodMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  box: ContourBox,
): Uint8Array {
  const x0 = clamp(Math.floor(box.x * width), 0, width - 1)
  const y0 = clamp(Math.floor(box.y * height), 0, height - 1)
  const x1 = clamp(Math.ceil((box.x + box.w) * width), 1, width)
  const y1 = clamp(Math.ceil((box.y + box.h) * height), 1, height)
  const sx = clamp(Math.round((box.x + box.w * 0.5) * (width - 1)), x0, x1 - 1)
  const sy = clamp(Math.round((box.y + box.h * 0.5) * (height - 1)), y0, y1 - 1)
  const seed = (sy * width + sx) * 4
  const sr = data[seed]
  const sg = data[seed + 1]
  const sb = data[seed + 2]
  const mask = new Uint8Array(width * height)
  const stack = [sx, sy]
  const max = Math.max(80, (x1 - x0) * (y1 - y0))
  let n = 0
  while (stack.length && n < max) {
    const y = stack.pop() as number
    const x = stack.pop() as number
    if (x < x0 || y < y0 || x >= x1 || y >= y1) continue
    const i = y * width + x
    if (mask[i]) continue
    const o = i * 4
    const d = Math.abs(data[o] - sr) + Math.abs(data[o + 1] - sg) + Math.abs(data[o + 2] - sb)
    if (d > 62) continue
    mask[i] = 1
    n += 1
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1)
  }
  return mask
}

function mooreContour(mask: Uint8Array, width: number, height: number): [number, number][] {
  let sx = -1
  let sy = -1
  for (let y = 1; y < height - 1 && sx < 0; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      if (mask[y * width + x] && !mask[y * width + x - 1]) {
        sx = x
        sy = y
        break
      }
    }
  }
  if (sx < 0) return []
  const dirs = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ]
  const pts: [number, number][] = []
  let x = sx
  let y = sy
  let dir = 0
  for (let step = 0; step < 900; step += 1) {
    pts.push([x / width, y / height])
    let found = false
    for (let k = 0; k < 8; k += 1) {
      const d = (dir + 6 + k) % 8
      const nx = x + dirs[d][0]
      const ny = y + dirs[d][1]
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (mask[ny * width + nx]) {
        x = nx
        y = ny
        dir = d
        found = true
        break
      }
    }
    if (!found) break
    if (x === sx && y === sy && pts.length > 8) break
  }
  return pts
}

function maskSilhouette(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  box: ContourBox,
  loopN: number,
): [number, number][] {
  const mask = floodMask(data, width, height, box)
  let raw = mooreContour(mask, width, height)
  if (raw.length < 8) {
    const pad = 0.012
    return [
      [box.x + pad, box.y + pad],
      [box.x + box.w - pad, box.y + pad],
      [box.x + box.w - pad, box.y + box.h - pad],
      [box.x + pad, box.y + box.h - pad],
    ]
  }
  if (raw.length > 2 && dist2(raw[0], raw[raw.length - 1]) < 0.0004) raw = raw.slice(0, -1)
  const eps = 0.02
  let simple = rdp(raw, eps)
  if (simple.length > 20) simple = rdp(simple, 0.028)
  const closed = simple.length >= 4 ? simple : raw
  return chaikin(closed, 1)
}

function ema(prev: [number, number][], next: [number, number][], alpha: number): [number, number][] {
  const n = Math.min(prev.length, next.length)
  if (n < 4) return next
  const out: [number, number][] = []
  for (let i = 0; i < n; i += 1) {
    const a = prev[Math.round((i / (n - 1)) * (prev.length - 1))]
    const b = next[Math.round((i / (n - 1)) * (next.length - 1))]
    out.push([a[0] * (1 - alpha) + b[0] * alpha, a[1] * (1 - alpha) + b[1] * alpha])
  }
  return out
}

export function resetContourMemory() {
  memory.clear()
}

export function forgetStaleContours(liveIds: Set<string>) {
  for (const id of memory.keys()) {
    if (!liveIds.has(id)) memory.delete(id)
  }
}

/**
 * Per-frame silhouette. Prior outline is translated by the tracked box delta,
 * then blended toward this frame. Never keep a screen-glued first pose.
 */
export function refineInstanceContour(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  id: string,
  box: ContourBox,
  loopN: number,
): { pts: [number, number][]; decision: ContourMemoryRow["decision"]; iou: number | null } {
  const candidate = maskSilhouette(data, width, height, box, loopN)
  const prior = memory.get(id)
  if (!prior) {
    memory.set(id, { id, loop: loopN, pts: candidate, box: { ...box }, iou: null, decision: "seed", reason: "first lock" })
    return { pts: candidate, decision: "seed", iou: null }
  }
  const dx = box.x - prior.box.x
  const dy = box.y - prior.box.y
  const followed = prior.pts.map(([x, y]) => [x + dx, y + dy] as [number, number])
  const iou = contourMaskIou(candidate, followed)
  const alpha = iou != null && iou > 0.55 ? 0.55 : 0.82
  const mixed = ema(followed, candidate, alpha)
  memory.set(id, {
    id,
    loop: loopN,
    pts: mixed,
    box: { ...box },
    iou,
    decision: "accept",
    reason: "follow box + current mask",
  })
  return { pts: mixed, decision: "accept", iou }
}

export function recordLoopClose(loopN: number) {
  const rows = [...memory.values()].filter((r) => r.loop === loopN)
  if (!rows.length) return
  const ious = rows.map((r) => r.iou).filter((v): v is number => v != null)
  loopLog.push({
    loop: loopN,
    accepted: rows.filter((r) => r.decision === "accept" || r.decision === "seed").length,
    rejected: rows.filter((r) => r.decision === "reject").length,
    mean_iou: ious.length ? ious.reduce((a, b) => a + b, 0) / ious.length : null,
    at: new Date().toISOString(),
  })
}

/** @deprecated radial walk — scribble. Use refineInstanceContour. */
export function silhouetteContour(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  box: ContourBox,
  loopN: number,
): [number, number][] {
  return refineInstanceContour(data, width, height, "anon", box, loopN).pts
}
