"use client"

import { useEffect, useRef } from "react"

type Line = {
  location: {
    x: number
    y: number
  }
  width: number
  color: string
}

const lineCount = 75

export function MycobrainV2BoardBackground() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")

    if (!root || !canvas || !context) return

    let width = 1
    let height = 1
    let originX = 0
    let originY = 0
    let step = 0
    let frame = 0
    let isVisible = true
    const lines: Line[] = []

    const isDarkTheme = () => document.documentElement.classList.contains("dark")

    const lineColor = () => {
      const lightness = isDarkTheme() ? 70 : 42
      const alpha = isDarkTheme() ? 0.9 : 0.64
      return `hsla(${Math.trunc(Math.random() * 360)}, 100%, ${lightness}%, ${alpha})`
    }

    const makeLine = (): Line => ({
      location: {
        x: originX,
        y: originY,
      },
      width: Math.random() * 1 + 0.25,
      color: lineColor(),
    })

    const resetLines = () => {
      lines.length = 0
      for (let index = 0; index < lineCount; index += 1) {
        lines.push(makeLine())
      }
      step = 0
    }

    const paintBase = () => {
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.fillStyle = isDarkTheme() ? "#000000" : "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.restore()
    }

    const stage = () => {
      const bounds = root.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      originX = Math.round(width / 2)
      originY = Math.round(height / 2)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintBase()
    }

    const draw = () => {
      context.fillStyle = isDarkTheme() ? "rgba(0, 0, 0, 0.045)" : "rgba(255, 255, 255, 0.052)"
      context.fillRect(0, 0, width, height)

      step += 1
      if (step % 2 === 1) return

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index]
        let angle = Math.trunc(Math.random() * 3) * 90
        let length = (Math.random() * 15 + 5) * 2

        if (index % 4 === angle / 90) {
          angle = 270
        }

        context.lineWidth = line.width
        context.strokeStyle = line.color
        context.beginPath()
        context.moveTo(line.location.x, line.location.y)

        switch (angle) {
          case 0:
            line.location.y -= length
            break
          case 90:
            line.location.x += length
            break
          case 180:
            line.location.y += length
            break
          case 270:
            line.location.x -= length
            break
          default:
            break
        }

        context.lineTo(line.location.x, line.location.y)

        if (line.location.x < 0 || line.location.x > width || line.location.y < 0 || line.location.y > height) {
          line.location.x = originX
          line.location.y = originY
          line.color = lineColor()
        }

        context.stroke()
      }
    }

    const loop = () => {
      frame = window.requestAnimationFrame(loop)
      if (!isVisible || document.hidden) return
      draw()
    }

    const handleResize = () => {
      stage()
      resetLines()
    }

    const handleThemeChange = () => {
      paintBase()
      resetLines()
    }

    const resizeObserver = new ResizeObserver(handleResize)
    const themeObserver = new MutationObserver(handleThemeChange)
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
      },
      { threshold: 0.01 },
    )

    stage()
    resetLines()
    loop()

    resizeObserver.observe(root)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    visibilityObserver.observe(root)

    return () => {
      window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      visibilityObserver.disconnect()
    }
  }, [])

  return (
    <div ref={rootRef} aria-hidden="true" className="absolute inset-0 bg-white dark:bg-black">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute left-1/2 top-1/2 hidden h-24 w-24 -translate-x-1/2 -translate-y-1/2 border-4 border-emerald-700/35 bg-emerald-200/30 dark:border-emerald-400/30 dark:bg-emerald-950/30 md:block" />
    </div>
  )
}
