import { ACTION_COLORS, TRON_COLORS } from "./tronColors"
import { TronData } from "./useTronData"

interface HudLayout {
  width: number
  padding: number
}

function formatTime(value: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString()
}

export function drawHUD(ctx: CanvasRenderingContext2D, data: TronData, layout: HudLayout) {
  const isNarrow = layout.width < 760
  const rightColumnX = isNarrow ? layout.padding : layout.width - 220

  ctx.fillStyle = TRON_COLORS.text
  ctx.font = "16px system-ui"
  ctx.fillText("MYCOSOFT CODE STREAM", layout.padding + 110, layout.padding + 18)

  ctx.fillStyle = "#00ff66"
  ctx.beginPath()
  ctx.arc(layout.padding + 20, layout.padding + 12, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = TRON_COLORS.text
  ctx.font = "12px system-ui"
  ctx.fillText("LIVE", layout.padding + 32, layout.padding + 16)

  ctx.font = "11px system-ui"
  ctx.fillStyle = TRON_COLORS.mutedText
  ctx.fillText(`Last update: ${formatTime(data.lastUpdated)}`, rightColumnX, layout.padding + 16)
  ctx.fillText(`Events: ${data.events.length}`, rightColumnX, layout.padding + 32)

  const legendStartY = isNarrow ? layout.padding + 52 : layout.padding + 44
  const legendMaxX = layout.width - layout.padding
  const legendItems = [
    { label: "Push", color: "#00ffff" },
    { label: "PR", color: "#ff00ff" },
    { label: "Deploy", color: "#00ff00" },
    { label: "Action Pass", color: ACTION_COLORS.success },
    { label: "Action Fail", color: ACTION_COLORS.failure },
  ]

  let legendX = layout.padding
  let legendY = legendStartY
  ctx.font = "11px system-ui"
  legendItems.forEach((item, index) => {
    const labelWidth = ctx.measureText(item.label).width
    const blockWidth = labelWidth + 24
    if (legendX + blockWidth > legendMaxX) {
      legendX = layout.padding
      legendY += 16
    }

    // Subtle panel behind legend text to avoid glow collisions.
    ctx.fillStyle = "rgba(2, 16, 22, 0.86)"
    ctx.fillRect(legendX - 5, legendY - 8, blockWidth, 14)

    ctx.fillStyle = item.color
    ctx.beginPath()
    ctx.arc(legendX, legendY, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = TRON_COLORS.mutedText
    ctx.fillText(item.label, legendX + 10, legendY + 4)
    legendX += blockWidth + 8
  })
}
