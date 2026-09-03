import type { HeatField, ScalarSample, SpectrogramFrame, TimelineEvent } from "./contracts"
import { finiteSamples, finiteValues, validateHeatField } from "./contracts"

export interface Point { x: number; y: number }

export function sampleExtent(samples: readonly ScalarSample[]): { minimum: number; maximum: number } | null {
  const values = finiteSamples(samples).map((sample) => sample.value)
  if (!values.length) return null
  return { minimum: Math.min(...values), maximum: Math.max(...values) }
}

export function samplesToPoints(samples: readonly ScalarSample[], width: number, height: number, padding = 8): Point[] {
  const valid = finiteSamples(samples)
  if (!valid.length || width <= padding * 2 || height <= padding * 2) return []
  const values = valid.map((sample) => sample.value)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const range = maximum - minimum || 1
  return valid.map((sample, index) => ({
    x: padding + (index / Math.max(1, valid.length - 1)) * (width - padding * 2),
    y: padding + (1 - (sample.value - minimum) / range) * (height - padding * 2),
  }))
}

export function pointsToPath(points: readonly Point[]): string {
  return points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")
}

/** Bounded O(n^2) DFT for operator-supplied windows; callers should provide at most 512 values. */
export function magnitudeSpectrum(input: readonly number[], sampleRateHz: number, maxSamples = 512): { frequencyHz: number; magnitude: number }[] {
  const values = finiteValues(input, maxSamples)
  if (values.length < 2 || !Number.isFinite(sampleRateHz) || sampleRateHz <= 0) return []
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const centered = values.map((value) => value - mean)
  const bins = Math.floor(centered.length / 2) + 1
  return Array.from({ length: bins }, (_, bin) => {
    let real = 0; let imaginary = 0
    for (let index = 0; index < centered.length; index += 1) {
      const angle = (2 * Math.PI * bin * index) / centered.length
      real += centered[index] * Math.cos(angle)
      imaginary -= centered[index] * Math.sin(angle)
    }
    return { frequencyHz: (bin * sampleRateHz) / centered.length, magnitude: Math.hypot(real, imaginary) / centered.length }
  })
}

export function histogram(values: readonly number[], bucketCount = 12): { minimum: number; maximum: number; count: number }[] {
  const valid = finiteValues(values)
  if (!valid.length || bucketCount < 1) return []
  const minimum = Math.min(...valid); const maximum = Math.max(...valid); const range = maximum - minimum || 1
  const counts = Array.from({ length: bucketCount }, () => 0)
  valid.forEach((value) => { counts[Math.min(bucketCount - 1, Math.floor(((value - minimum) / range) * bucketCount))] += 1 })
  return counts.map((count, index) => ({ minimum: minimum + (range * index) / bucketCount, maximum: minimum + (range * (index + 1)) / bucketCount, count }))
}

export function heatCells(field: HeatField): { x: number; y: number; value: number; ratio: number }[] {
  if (validateHeatField(field).length) return []
  const minimum = field.minimum ?? Math.min(...field.values)
  const maximum = field.maximum ?? Math.max(...field.values)
  const range = maximum - minimum || 1
  return field.values.map((value, index) => ({ x: index % field.width, y: Math.floor(index / field.width), value, ratio: Math.max(0, Math.min(1, (value - minimum) / range)) }))
}

export function spectrogramCells(frames: readonly SpectrogramFrame[], maxFrames = 96): { x: number; y: number; value: number; ratio: number }[] {
  const valid = frames.slice(-maxFrames).filter((frame) => frame.bins.length && frame.bins.every(Number.isFinite))
  if (!valid.length) return []
  const values = valid.flatMap((frame) => [...frame.bins]); const minimum = Math.min(...values); const maximum = Math.max(...values); const range = maximum - minimum || 1
  return valid.flatMap((frame, x) => frame.bins.map((value, y) => ({ x, y, value, ratio: (value - minimum) / range })))
}

export function timelinePositions(events: readonly TimelineEvent[]): Array<TimelineEvent & { ratio: number }> {
  const valid = events.filter((event) => Number.isFinite(new Date(event.timestamp).getTime())).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  if (!valid.length) return []
  const start = new Date(valid[0].timestamp).getTime(); const end = new Date(valid[valid.length - 1].timestamp).getTime(); const duration = end - start || 1
  return valid.map((event) => ({ ...event, ratio: (new Date(event.timestamp).getTime() - start) / duration }))
}
