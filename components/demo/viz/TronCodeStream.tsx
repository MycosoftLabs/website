"use client"

import { useEffect, useRef } from "react"
import { drawHUD } from "./tron/drawHUD"
import { drawTronGrid } from "./tron/TronGrid"
import { drawLanes } from "./tron/drawLanes"
import { drawPipeline } from "./tron/drawPipeline"
import { TRON_COLORS } from "./tron/tronColors"
import { useTronData } from "./tron/useTronData"

const PADDING = 24

export default function TronCodeStream() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const data = useTronData()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId = 0
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener("resize", resize)

    const render = () => {
      const { width, height } = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = TRON_COLORS.background
      ctx.fillRect(0, 0, width, height)

      const now = Date.now()
      const scanY = (now / 40) % height
      ctx.fillStyle = "rgba(0, 255, 255, 0.04)"
      ctx.fillRect(0, scanY, width, 2)

      drawTronGrid(ctx, width, height, { cellSize: 52, glow: 3 })
      drawHUD(ctx, data, { width, padding: PADDING })

      const compact = height < 340
      const lanesTop = compact ? PADDING + 56 : PADDING + 70
      const laneHeight = compact ? 20 : 26
      const laneGap = compact ? 12 : 24
      const pipelineHeight = compact ? 58 : 70
      const pipelineBottomPadding = compact ? 12 : 16
      const maxLanes = Math.max(
        2,
        Math.min(
          6,
          Math.floor((height - lanesTop - pipelineHeight - pipelineBottomPadding) / (laneHeight + laneGap))
        )
      )
      const lanesHeight = (laneHeight + laneGap) * maxLanes
      drawLanes(ctx, data, {
        top: lanesTop,
        height: laneHeight,
        gap: laneGap,
        left: PADDING,
        right: PADDING,
        width: width - PADDING * 2,
        maxLanes,
      }, now)

      const pipelineTop = Math.max(
        lanesTop + lanesHeight + 6,
        height - pipelineHeight - pipelineBottomPadding
      )
      drawPipeline(ctx, data, {
        left: PADDING,
        top: pipelineTop,
        width: width - PADDING * 2,
        height: pipelineHeight,
        gap: 12,
      })

      if (data.hasError) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.7)"
        ctx.font = "12px system-ui"
        ctx.fillText("GitHub data unavailable", PADDING, height - 20)
      }

      animationId = window.requestAnimationFrame(render)
    }

    animationId = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener("resize", resize)
      window.cancelAnimationFrame(animationId)
    }
  }, [data])

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" />
    </div>
  )
}
