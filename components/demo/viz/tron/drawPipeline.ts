import { applyGlow, resolveActionColor, TRON_COLORS } from "./tronColors"
import { drawTronNode } from "./TronNode"
import { TronData } from "./useTronData"

interface PipelineLayout {
  left: number
  top: number
  width: number
  height: number
  gap: number
}

const STAGES = ["BUILD", "TEST", "DEPLOY", "LIVE"] as const

function inferStage(name: string) {
  const lowered = name.toLowerCase()
  if (lowered.includes("deploy") || lowered.includes("release")) return "DEPLOY"
  if (lowered.includes("test") || lowered.includes("lint")) return "TEST"
  if (lowered.includes("build") || lowered.includes("compile")) return "BUILD"
  return "BUILD"
}

export function drawPipeline(
  ctx: CanvasRenderingContext2D,
  data: TronData,
  layout: PipelineLayout
) {
  const stageWidth = (layout.width - layout.gap * (STAGES.length - 1)) / STAGES.length
  ctx.font = "12px system-ui"

  STAGES.forEach((stage, index) => {
    const x = layout.left + index * (stageWidth + layout.gap)
    const y = layout.top
    ctx.strokeStyle = TRON_COLORS.lane
    applyGlow(ctx, "#00ffff", 8)
    ctx.strokeRect(x, y, stageWidth, layout.height)
    ctx.shadowBlur = 0
    ctx.fillStyle = TRON_COLORS.text
    ctx.fillText(stage, x + 10, y + 18)

    const runs =
      stage === "LIVE"
        ? data.deployments.slice(0, 8).map((deployment) => ({
            id: deployment.id,
            status: "completed",
            conclusion: "success",
          }))
        : data.actions
            .filter((run) => inferStage(run.name) === stage)
            .slice(0, 8)
            .map((run) => ({
              id: run.id,
              status: run.status,
              conclusion: run.conclusion,
            }))

    runs.forEach((run, nodeIndex) => {
      const nodeX = x + 18 + (nodeIndex % 4) * 20
      const nodeY = y + 36 + Math.floor(nodeIndex / 4) * 20
      const color = resolveActionColor(run.status, run.conclusion)
      drawTronNode(ctx, nodeX, nodeY, color, { radius: 4, glow: 10 })
    })
  })
}
