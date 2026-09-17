import type { TrailPath } from "@/lib/fusarium/bluesight/trail-ar"
import type { HorizonLine } from "@/lib/fusarium/bluesight/horizon-line"
import type { PathCorridor } from "@/lib/fusarium/bluesight/path-corridor"
import type { ContactHud, ContactPatch } from "@/lib/fusarium/bluesight/trail-contact"
import { occludeByNearer, rankContours } from "@/lib/fusarium/bluesight/trail-depth"
import type { FovBox } from "@/lib/fusarium/bluesight/trail-fov"
import type { LiveStep } from "@/lib/fusarium/bluesight/trail-next-step"
import type { SimFrame } from "@/lib/fusarium/bluesight/trail-sim"

export interface ContentRect {
  x: number
  y: number
  w: number
  h: number
}

/** Full red stroke on Morgan's overhead photo (normalized). Longer than the 14s clip. */
export const OVERHEAD_RED_LINE: [number, number][] = [
  [0.385, 0.575],
  [0.392, 0.555],
  [0.4, 0.532],
  [0.408, 0.518],
  [0.412, 0.505],
]

/** Video is the lower segment only: recording pin → up the red line. */
export const OVERHEAD_VIDEO_SEGMENT: [number, number][] = [
  [0.385, 0.575],
  [0.392, 0.555],
  [0.4, 0.532],
]

export function videoContentRect(el: HTMLVideoElement, boxW: number, boxH: number): ContentRect {
  const vw = el.videoWidth || 9
  const vh = el.videoHeight || 16
  const scale = Math.min(boxW / vw, boxH / vh)
  const w = vw * scale
  const h = vh * scale
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h }
}

function nx(rect: ContentRect, u: number) {
  return rect.x + u * rect.w
}
function ny(rect: ContentRect, v: number) {
  return rect.y + v * rect.h
}

/** Near-black under-stroke so bright ink reads on sunlit dirt and shade. */
const HALO_INK = "rgba(0, 0, 0, 0.94)"
const HALO_W = 3.8
const STROKE_W = 1.8
const PATH_HALO_W = 6.0
const PATH_STROKE_W = 3.0
const PATH_INK = "#ffe600"

function strokePoly(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  color: string,
  width: number,
  fill?: string,
  dash?: number[],
  closed = Boolean(fill),
  haloWidth = Math.max(HALO_W, width + 2.0),
) {
  if (pts.length < 2) return
  ctx.save()
  ctx.lineJoin = "round"
  ctx.lineCap = "round"
  ctx.setLineDash(dash ?? [])
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  if (closed) ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  ctx.strokeStyle = HALO_INK
  ctx.lineWidth = haloWidth
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.stroke()
  ctx.restore()
}

function lerpPath(pts: [number, number][], t: number): [number, number] {
  const u = Math.min(1, Math.max(0, t))
  const scaled = u * (pts.length - 1)
  const i = Math.min(pts.length - 2, Math.floor(scaled))
  const f = scaled - i
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]
}

function contactInk(tone: ContactPatch["tone"]) {
  if (tone === "RED") return { stroke: "#ff3b3b", fill: "rgba(255,40,40,0.50)", glow: "#ff3b3b", type: "#ffe0e0" }
  if (tone === "CYAN") return { stroke: "#1ef0ff", fill: "rgba(20,230,255,0.48)", glow: "#1ef0ff", type: "#d7f9ff" }
  return { stroke: "#22ff66", fill: "rgba(20,255,90,0.50)", glow: "#22ff66", type: "#e8ffe8" }
}

function inflateQuad(pts: [number, number][], pad = 4): [number, number][] {
  if (pts.length < 3) return pts
  let cx = 0
  let cy = 0
  for (const [x, y] of pts) {
    cx += x
    cy += y
  }
  cx /= pts.length
  cy /= pts.length
  return pts.map(([x, y]) => {
    const dx = x - cx
    const dy = y - cy
    const len = Math.hypot(dx, dy) || 1
    return [x + (dx / len) * pad, y + (dy / len) * pad] as [number, number]
  })
}

function paintContactSole(ctx: CanvasRenderingContext2D, rect: ContentRect, patch: ContactPatch) {
  const ink = contactInk(patch.tone)
  const q = inflateQuad(patch.quad.corners.map(([u, v]) => [nx(rect, u), ny(rect, v)] as [number, number]), 5)
  strokePoly(ctx, q, ink.stroke, 2.2, ink.fill, undefined, true, 4.2)
  if (patch.tone === "GREEN" && patch.xCode) {
    const mid = [nx(rect, patch.quad.cx), ny(rect, patch.quad.cy)] as [number, number]
    ctx.save()
    ctx.font = "700 10px ui-monospace, Consolas, monospace"
    ctx.textAlign = "center"
    ctx.lineWidth = 3.4
    ctx.strokeStyle = HALO_INK
    ctx.fillStyle = ink.stroke
    ctx.strokeText(patch.xCode, mid[0], mid[1] + 3)
    ctx.fillText(patch.xCode, mid[0], mid[1] + 3)
    ctx.restore()
  }
}

function paintContactHud(ctx: CanvasRenderingContext2D, rect: ContentRect, contact: ContactHud) {
  if (contact.commit) paintContactSole(ctx, rect, { ...contact.commit, tone: "GREEN" })
  for (const patch of contact.patches) {
    if (contact.commit && patch.id === contact.commit.id) continue
    paintContactSole(ctx, rect, patch)
  }
}

function chip(ctx: CanvasRenderingContext2D, x: number, y: number, title: string, sub: string, color: string) {
  ctx.save()
  ctx.font = "700 11px ui-monospace, Consolas, monospace"
  const w = Math.min(rectSafe(ctx, title, sub), 280)
  ctx.fillStyle = "rgba(6, 10, 14, 0.88)"
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(x, y, w, 32, 3)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.textAlign = "left"
  ctx.fillText(title, x + 7, y + 13)
  ctx.font = "10px ui-monospace, Consolas, monospace"
  ctx.fillStyle = "#d7fff0"
  ctx.fillText(sub, x + 7, y + 25)
  ctx.restore()
}

function rectSafe(ctx: CanvasRenderingContext2D, a: string, b: string) {
  return Math.max(ctx.measureText(a).width, ctx.measureText(b).width) + 16
}

/** Red-line corridor on Morgan's overhead photo (normalized). Walk bottom → top. */
export const OVERHEAD_CROP = { cx: 0.398, cy: 0.54, zoom: 3.8 }

function paintMinimap(ctx: CanvasRenderingContext2D, rect: ContentRect, tNorm: number, overhead: HTMLImageElement | null) {
  const size = Math.min(138, rect.w * 0.36)
  const x = rect.x + rect.w - size - 10
  const y = rect.y + rect.h - size - 12
  const { cx, cy, zoom } = OVERHEAD_CROP
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, 8)
  ctx.clip()
  ctx.fillStyle = "rgba(8, 14, 18, 0.78)"
  ctx.fillRect(x, y, size, size)
  if (overhead && overhead.complete && overhead.naturalWidth > 0) {
    const nw = overhead.naturalWidth
    const nh = overhead.naturalHeight
    const sw = nw / zoom
    const sh = nh / zoom
    const sx = Math.max(0, Math.min(nw - sw, cx * nw - sw / 2))
    const sy = Math.max(0, Math.min(nh - sh, cy * nh - sh / 2))
    ctx.drawImage(overhead, sx, sy, sw, sh, x, y, size, size)
  }
  const toMap = (p: [number, number]): [number, number] => {
    const u = (p[0] - (cx - 0.5 / zoom)) * zoom
    const v = (p[1] - (cy - 0.5 / zoom)) * zoom
    return [x + u * size, y + v * size]
  }
  strokePoly(ctx, OVERHEAD_RED_LINE.map(toMap), "#ff2a2a", 2)
  strokePoly(ctx, OVERHEAD_VIDEO_SEGMENT.map(toMap), "#39ff6a", 2.2)
  const [dx, dy] = toMap(lerpPath(OVERHEAD_VIDEO_SEGMENT, tNorm))
  ctx.fillStyle = "#e8ff6a"
  ctx.beginPath()
  ctx.arc(dx, dy, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.save()
  ctx.strokeStyle = "rgba(255,255,255,0.28)"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, 8)
  ctx.stroke()
  ctx.fillStyle = "rgba(255,255,255,0.75)"
  ctx.font = "9px ui-monospace, Consolas, monospace"
  ctx.fillText("ABOVE", x + 8, y + 14)
  ctx.restore()
}

export interface OverlayGeometry {
  corridor: PathCorridor | null
  horizon: HorizonLine | null
  contours: { id: string; kind: string; pts: [number, number][] }[]
}

function paintHorizon(ctx: CanvasRenderingContext2D, rect: ContentRect, horizon: HorizonLine) {
  if (horizon.polyline.length < 2) return
  const line = horizon.polyline.map(([u, v]) => [nx(rect, u), ny(rect, v)] as [number, number])
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(rect.x, rect.y)
  ctx.lineTo(rect.x + rect.w, rect.y)
  line
    .slice()
    .reverse()
    .forEach(([x, y]) => ctx.lineTo(x, y))
  ctx.closePath()
  ctx.fillStyle = "rgba(180, 220, 255, 0.1)"
  ctx.fill()
  ctx.restore()
  strokePoly(ctx, line, "#d6f6ff", STROKE_W, undefined, undefined, false, HALO_W)
}

function paintCorridor(ctx: CanvasRenderingContext2D, rect: ContentRect, corridor: PathCorridor) {
  if (corridor.left.length < 2 || corridor.right.length < 2) return
  const left = corridor.left.map(([u, v]) => [nx(rect, u), ny(rect, v)] as [number, number])
  const right = corridor.right.map(([u, v]) => [nx(rect, u), ny(rect, v)] as [number, number])
  const bed = corridor.fill.length >= 4
    ? corridor.fill.map(([u, v]) => [nx(rect, u), ny(rect, v)] as [number, number])
    : [...left, ...[...right].reverse()]
  strokePoly(ctx, bed, "rgba(255,230,0,0.0)", 0.01, "rgba(255,230,0,0.16)", undefined, true, 0.01)
  strokePoly(ctx, left, PATH_INK, PATH_STROKE_W, undefined, undefined, false, PATH_HALO_W)
  strokePoly(ctx, right, PATH_INK, PATH_STROKE_W, undefined, undefined, false, PATH_HALO_W)
}

function convexHull(pts: [number, number][]): [number, number][] {
  if (pts.length <= 3) return pts
  const sorted = [...pts].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]))
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = []
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: [number, number][] = []
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  upper.pop()
  lower.pop()
  return [...lower, ...upper]
}

function paintLegend(ctx: CanvasRenderingContext2D, rect: ContentRect) {
  const x = rect.x + 10
  const y = rect.y + 64
  const rows: [string, string][] = [
    [PATH_INK, "path L/R"],
    ["#3dff6e", "foothold GO"],
    ["#3cf0ff", "foothold wait"],
    ["#ff5a5a", "foothold no"],
    ["#ff9a3c", "object rim"],
  ]
  ctx.save()
  ctx.fillStyle = "rgba(4, 8, 12, 0.78)"
  ctx.strokeStyle = "rgba(255, 243, 138, 0.55)"
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(x, y, 148, 80, 4)
  ctx.fill()
  ctx.stroke()
  ctx.font = "700 10px ui-monospace, Consolas, monospace"
  ctx.textAlign = "left"
  rows.forEach(([color, label], i) => {
    ctx.fillStyle = color
    ctx.fillRect(x + 7, y + 7 + i * 14, 8, 8)
    ctx.fillStyle = "#f4fff8"
    ctx.fillText(label, x + 20, y + 14 + i * 14)
  })
  ctx.restore()
}

function contourColor(kind: string, id: string) {
  if (id.includes("elf-ear") || kind === "fungus") return { stroke: "#f4c44a", fill: "rgba(244,196,74,0.22)", label: "FUNGUS" }
  if (kind === "rock") return { stroke: "#ff9a3c", fill: "rgba(255,154,60,0.20)", label: "ROCK" }
  if (kind === "tree") return { stroke: "#4ef0a6", fill: "rgba(78,240,166,0.18)", label: "TREE" }
  if (kind === "bush") return { stroke: "#9be36a", fill: "rgba(155,227,106,0.18)", label: "BUSH" }
  return { stroke: "#6ef4ff", fill: "rgba(110,244,255,0.18)", label: "PLANT" }
}

const contourInk = contourColor

function labelOnPerimeter(ctx: CanvasRenderingContext2D, pts: [number, number][], text: string, color: string) {
  if (pts.length < 2) return
  let top = pts[0]
  for (const p of pts) if (p[1] < top[1]) top = p
  ctx.save()
  ctx.font = "700 10px ui-sans-serif, system-ui, sans-serif"
  ctx.textAlign = "center"
  ctx.lineWidth = 3.6
  ctx.strokeStyle = HALO_INK
  ctx.fillStyle = color
  ctx.strokeText(text, top[0], top[1] - 3)
  ctx.fillText(text, top[0], top[1] - 3)
  ctx.restore()
}

export function paintTrailHud(
  ctx: CanvasRenderingContext2D,
  rect: ContentRect,
  overlay: OverlayGeometry,
  sim: SimFrame,
  actor: string,
  next: LiveStep | null,
  fov: FovBox[],
  overhead: HTMLImageElement | null,
  hideStep: boolean,
  contact: ContactHud | null = null,
) {
  ctx.save()
  ctx.clearRect(0, 0, rect.w + rect.x, rect.h + rect.y)

  if (overlay.horizon) paintHorizon(ctx, rect, overlay.horizon)

  if (contact) {
    paintContactHud(ctx, rect, contact)
  } else if (next && !hideStep) {
    void next
  }

  const rankedAll = rankContours(
    overlay.contours
      .filter((c) => c.pts.length >= 3)
      .map((c) => {
        let x0 = 1
        let y0 = 1
        let x1 = 0
        let y1 = 0
        for (const [x, y] of c.pts) {
          x0 = Math.min(x0, x)
          y0 = Math.min(y0, y)
          x1 = Math.max(x1, x)
          y1 = Math.max(y1, y)
        }
        return { ...c, x: x0, y: y0, w: Math.max(0.01, x1 - x0), h: Math.max(0.01, y1 - y0) }
      }),
  )
  const ranked = [...rankedAll]
    .filter((c) => {
      const cx = c.x + c.w * 0.5
      if (c.kind === "fungus") return true
      if ((cx < 0.08 || cx > 0.92) && !c.near_field) return false
      return c.w * c.h >= 0.012
    })
    .sort((a, b) => a.rel_depth - b.rel_depth)
    .slice(0, 5)
    .sort((a, b) => b.rel_depth - a.rel_depth)
  ranked.forEach((contour, index) => {
    const clipped = occludeByNearer(contour, ranked.slice(index + 1))
    if (clipped.length < 3) return
    const ink = contourInk(contour.kind, contour.id)
    const raw = clipped.map(([u, v]) => [nx(rect, u), ny(rect, v)] as [number, number])
    const pts = convexHull(raw)
    if (pts.length < 3) return
    const thick = contour.near_field ? 2.0 : STROKE_W
    strokePoly(ctx, pts, ink.stroke, thick, ink.fill, undefined, true, contour.near_field ? 4.0 : HALO_W)
    const label =
      contour.kind === "fungus"
        ? `${ink.label} · depth: unbound`
        : ink.label
    labelOnPerimeter(ctx, pts, label, ink.stroke)
  })

  void fov
  void actor

  const banner = contact?.banner ?? { line: "ANALYSING TERRAIN", search: "CONTACT SEARCH", pips: 3 }
  ctx.fillStyle = "rgba(6, 28, 32, 0.9)"
  ctx.strokeStyle = "#39e0ff"
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(rect.x + 10, rect.y + 10, rect.w - 20, 48, 4)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = "#7ef6ff"
  ctx.font = "700 15px ui-monospace, Consolas, monospace"
  ctx.textAlign = "left"
  ctx.fillText(banner.line, rect.x + 20, rect.y + 30)
  ctx.font = "11px ui-monospace, Consolas, monospace"
  ctx.fillStyle = "#7ef6ff"
  ctx.fillText(banner.search, rect.x + 20, rect.y + 46)
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath()
    ctx.arc(rect.x + rect.w - 36 - i * 14, rect.y + 34, 4, 0, Math.PI * 2)
    ctx.fillStyle = i < banner.pips ? "#39e0ff" : "rgba(57,224,255,0.22)"
    ctx.fill()
  }

  if (overlay.corridor) paintCorridor(ctx, rect, overlay.corridor)
  paintLegend(ctx, rect)

  void overhead
  ctx.restore()
}

export function normalizePath(path: TrailPath, width: number, height: number): TrailPath {
  return {
    ...path,
    polyline: path.polyline.map(([x, y]) => [x / width, y / height]),
    perimeter: path.perimeter.map(([x, y]) => [x / width, y / height]),
    steps: path.steps.map((s) => ({ ...s, x: s.x / width, y: s.y / height })),
  }
}

export function normalizePoly(pts: [number, number][], width: number, height: number): [number, number][] {
  return pts.map(([x, y]) => [x / width, y / height])
}
