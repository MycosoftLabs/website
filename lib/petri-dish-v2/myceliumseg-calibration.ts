export interface BinaryMaskMetrics {
  area: number
  edgeDensity: number
  skeletonLength: number
  branchDensity: number
  radialExpansion: number
  edgeRoughness: number
  iou?: number
  dice?: number
}

function at(mask: ArrayLike<number>, width: number, height: number, x: number, y: number) {
  if (x < 0 || y < 0 || x >= width || y >= height) return 0
  return mask[y * width + x] > 0 ? 1 : 0
}

export function computeMaskMetrics(
  mask: ArrayLike<number>,
  width: number,
  height: number,
  groundTruth?: ArrayLike<number>
): BinaryMaskMetrics {
  let area = 0
  let edge = 0
  let skeleton = 0
  let branches = 0
  let cx = 0
  let cy = 0
  let intersection = 0
  let union = 0
  let gtArea = 0

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = at(mask, width, height, x, y)
      const gt = groundTruth ? at(groundTruth, width, height, x, y) : 0
      if (value) {
        area += 1
        cx += x
        cy += y
        const neighbors =
          at(mask, width, height, x - 1, y) +
          at(mask, width, height, x + 1, y) +
          at(mask, width, height, x, y - 1) +
          at(mask, width, height, x, y + 1)
        if (neighbors < 4) edge += 1
        if (neighbors <= 2) skeleton += 1
        if (neighbors >= 3) branches += 1
      }
      if (groundTruth) {
        if (gt) gtArea += 1
        if (value && gt) intersection += 1
        if (value || gt) union += 1
      }
    }
  }

  const centerX = area > 0 ? cx / area : width / 2
  const centerY = area > 0 ? cy / area : height / 2
  let radiusSum = 0
  let radiusSq = 0
  if (area > 0) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!at(mask, width, height, x, y)) continue
        const r = Math.hypot(x - centerX, y - centerY)
        radiusSum += r
        radiusSq += r * r
      }
    }
  }

  const meanRadius = area > 0 ? radiusSum / area : 0
  const variance = area > 0 ? Math.max(0, radiusSq / area - meanRadius * meanRadius) : 0

  return {
    area,
    edgeDensity: area > 0 ? edge / area : 0,
    skeletonLength: skeleton,
    branchDensity: skeleton > 0 ? branches / skeleton : 0,
    radialExpansion: meanRadius,
    edgeRoughness: meanRadius > 0 ? Math.sqrt(variance) / meanRadius : 0,
    iou: groundTruth ? intersection / Math.max(1, union) : undefined,
    dice: groundTruth ? (2 * intersection) / Math.max(1, area + gtArea) : undefined,
  }
}

export const MYCELIUMSEG_TARGET_METRICS = [
  "colony area",
  "edge density",
  "skeleton length",
  "branch density",
  "radial expansion",
  "edge roughness",
  "mask overlap",
] as const
