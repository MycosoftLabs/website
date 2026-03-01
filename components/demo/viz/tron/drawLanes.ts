import { applyGlow, resolveEventColor, TRON_COLORS } from "./tronColors"
import { drawTronNode } from "./TronNode"
import { drawTronParticle } from "./TronParticle"
import { drawTronPulse } from "./TronPulse"
import { TronData } from "./useTronData"

interface LaneLayout {
  top: number
  height: number
  gap: number
  left: number
  right: number
  width: number
  maxLanes?: number
}

const FLOW_DURATION_MS = 6 * 60 * 60 * 1000
const FUTURE_WINDOW_MS = 2 * 60 * 60 * 1000

function extractRepoName(fullName: string) {
  const parts = fullName.split("/")
  return parts[parts.length - 1] ?? fullName
}

function truncateLabel(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(3, maxLength - 1))}…`
}

function estimateNextEventMs(timestamps: number[]) {
  if (timestamps.length < 3) return null
  const sorted = [...timestamps].sort((a, b) => b - a)
  const intervals: number[] = []
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const delta = sorted[index] - sorted[index + 1]
    if (delta > 0 && delta <= 12 * 60 * 60 * 1000) intervals.push(delta)
  }
  if (intervals.length === 0) return null
  const avgInterval = intervals.reduce((sum, value) => sum + value, 0) / intervals.length
  return sorted[0] + avgInterval
}

export function drawLanes(
  ctx: CanvasRenderingContext2D,
  data: TronData,
  layout: LaneLayout,
  now: number
) {
  const laneLimit = Math.max(1, Math.min(6, layout.maxLanes ?? 6))
  const repos = data.repos.slice(0, laneLimit)
  if (repos.length === 0) {
    ctx.fillStyle = TRON_COLORS.mutedText
    ctx.font = "14px system-ui"
    ctx.fillText("No repository activity available.", layout.left, layout.top + 24)
    return
  }

  const labelWidth = Math.max(130, Math.min(220, Math.floor(layout.width * 0.28)))
  const flowLeft = layout.left + labelWidth + 14
  const flowWidth = Math.max(80, layout.width - labelWidth - 18)
  const historyWidth = flowWidth * 0.82
  const futureWidth = flowWidth - historyWidth
  const nowX = flowLeft + historyWidth
  const maxLabelChars = labelWidth > 180 ? 24 : 18

  ctx.lineWidth = 1.2
  repos.forEach((repo, index) => {
    const laneY = layout.top + index * (layout.height + layout.gap)
    const laneMidY = laneY + layout.height / 2

    // Label panel to keep text readable and separate from particles.
    ctx.fillStyle = "rgba(2, 16, 22, 0.92)"
    ctx.fillRect(layout.left, laneY - 3, labelWidth, layout.height + 6)
    ctx.strokeStyle = "rgba(0, 255, 255, 0.32)"
    ctx.strokeRect(layout.left, laneY - 3, labelWidth, layout.height + 6)

    // History line (past -> now)
    ctx.strokeStyle = "rgba(0, 255, 255, 0.24)"
    applyGlow(ctx, "#00ffff", 5)
    ctx.beginPath()
    ctx.moveTo(flowLeft, laneMidY)
    ctx.lineTo(nowX, laneMidY)
    ctx.stroke()

    // Forecast line (now -> future)
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)"
    ctx.beginPath()
    ctx.moveTo(nowX, laneMidY)
    ctx.lineTo(flowLeft + flowWidth, laneMidY)
    ctx.stroke()
    ctx.setLineDash([])

    // "Now" marker
    drawTronNode(ctx, nowX, laneMidY, "#00ff66", { radius: 3, glow: 8 })

    ctx.shadowBlur = 0
    ctx.fillStyle = TRON_COLORS.text
    ctx.font = "600 11px system-ui"
    const displayName = truncateLabel(repo.name, maxLabelChars)
    ctx.fillText(displayName, layout.left + 8, laneY + 12)

    const repoEvents = data.events.filter(
      (event) => extractRepoName(event.repo.name) === repo.name
    )
    const repoEventTimes: number[] = []

    repoEvents.slice(0, 24).forEach((event) => {
      const eventTime = Date.parse(event.created_at)
      if (Number.isNaN(eventTime)) return
      const age = Math.max(0, now - eventTime)
      if (age > FLOW_DURATION_MS) return
      repoEventTimes.push(eventTime)
      const x = nowX - (age / FLOW_DURATION_MS) * historyWidth
      const y = laneMidY
      const color = resolveEventColor(event.type)
      drawTronParticle(ctx, x, y, color, { length: 12, alpha: 0.7 })
      drawTronNode(ctx, x, y, color, { radius: 4, glow: 10 })
      if (age < 15000) {
        const pulseRadius = 8 + (age / 15000) * 10
        const alpha = 0.35 - (age / 15000) * 0.25
        drawTronPulse(ctx, x, y, color, { radius: pulseRadius, alpha })
      }
    })

    // Forecast marker based on recent cadence (if enough history exists).
    const predictedAt = estimateNextEventMs(repoEventTimes)
    if (predictedAt) {
      const msUntil = predictedAt - now
      if (msUntil > 0 && msUntil <= FUTURE_WINDOW_MS) {
        const predictionX = nowX + (msUntil / FUTURE_WINDOW_MS) * futureWidth
        drawTronNode(ctx, predictionX, laneMidY, "#ffd166", { radius: 4, glow: 9 })
        ctx.fillStyle = "rgba(255, 209, 102, 0.85)"
        ctx.font = "10px system-ui"
        ctx.fillText("next", predictionX + 6, laneMidY - 6)
      }
    }

    ctx.shadowBlur = 0
    ctx.fillStyle = TRON_COLORS.mutedText
    ctx.font = "10px system-ui"
    ctx.fillText(`${repoEvents.length} events`, layout.left + 8, laneY + layout.height + 1)

    if (index === 0) {
      ctx.fillStyle = "rgba(180, 250, 255, 0.72)"
      ctx.font = "10px system-ui"
      ctx.fillText("Past 6h", flowLeft, laneY - 7)
      ctx.fillText("Now", nowX - 10, laneY - 7)
      ctx.fillText("Forecast 2h", nowX + 18, laneY - 7)
    }
  })
}
