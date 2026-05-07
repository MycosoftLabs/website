"use client"

import { useEffect, useRef } from "react"

interface HyphaeShuffledTitleProps {
  text?: string
  className?: string
}

interface TitlePoint {
  x: number
  y: number
}

const DIGITS = "0123456"

function titleDigitSize(height: number) {
  return Math.max(5, Math.min(7, height * 0.032))
}

export function HyphaeShuffledTitle({ text = "Hyphae 1", className = "" }: HyphaeShuffledTitleProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { alpha: true })
    if (!canvas || !ctx) return

    const textCanvas = document.createElement("canvas")
    const textCtx = textCanvas.getContext("2d", { willReadFrequently: true })
    if (!textCtx) return

    let points: TitlePoint[] = []
    let interval: ReturnType<typeof window.setInterval> | null = null
    let fontFamily =
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

    function fontFor(size: number) {
      return `900 ${size}px ${fontFamily}`
    }

    function resize() {
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      textCanvas.width = width
      textCanvas.height = height
      textCtx.clearRect(0, 0, width, height)
      fontFamily = getComputedStyle(canvas).fontFamily || fontFamily

      let fontSize = Math.floor(Math.min(height * 0.8, width / Math.max(4.1, text.length * 0.48)))
      textCtx.font = fontFor(fontSize)
      let metrics = textCtx.measureText(text)
      while (metrics.width > width * 0.94 && fontSize > 24) {
        fontSize -= 2
        textCtx.font = fontFor(fontSize)
        metrics = textCtx.measureText(text)
      }

      textCtx.textAlign = "center"
      textCtx.textBaseline = "middle"
      textCtx.fillStyle = "#fff"
      textCtx.fillText(text, width / 2, height / 2)

      const imageData = textCtx.getImageData(0, 0, width, height).data
      const nextPoints: TitlePoint[] = []
      const sample = Math.max(6, Math.ceil(titleDigitSize(height) * 1.1))

      for (let y = 0; y < height; y += sample) {
        for (let x = 0; x < width; x += sample) {
          const alpha = imageData[(x + y * width) * 4 + 3]
          if (alpha > 70) nextPoints.push({ x, y })
        }
      }

      points = nextPoints
      draw()
    }

    function draw() {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const digitSize = titleDigitSize(height)

      ctx.clearRect(0, 0, width, height)
      ctx.font = `700 ${digitSize}px ${fontFamily}`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(255,255,255,0.96)"
      ctx.shadowColor = "rgba(0,0,0,0.72)"
      ctx.shadowBlur = 10
      ctx.shadowOffsetY = 2

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i]
        const digit = DIGITS[(Math.random() * DIGITS.length) | 0]
        ctx.fillText(digit, point.x, point.y)
      }

    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()
    interval = window.setInterval(draw, 60)

    return () => {
      resizeObserver.disconnect()
      if (interval) window.clearInterval(interval)
    }
  }, [text])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`block h-[124px] w-[min(98vw,1040px)] select-none bg-transparent font-sans sm:h-[152px] md:h-[184px] lg:h-[216px] ${className}`}
    />
  )
}
