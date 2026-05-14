// @ts-nocheck
"use client"

import { useEffect, useRef } from "react"
import { shouldUseLightweightVisuals } from "@/lib/client-motion"

const colorPallete = ["#000"]

interface Ball {
  x: number
  y: number
  angle: number
  vx: number
  vy: number
  r: number
  color: string
}

export function AgaricTechnologyShaderBackground() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")

    if (!root || !canvas || !context) return

    let width = canvas.width = root.clientWidth || window.innerWidth
    let height = canvas.height = root.clientHeight || window.innerHeight
    let origin = { x: width / 2, y: height / 2 }
    const mouse = { x: width / 2, y: height / 2 }
    const balls: Ball[] = []
    let count = 0
    let randomCount = 1
    let frame = 0
    let isVisible = true
    let lastFrame = 0
    const lightweight = shouldUseLightweightVisuals()

    class BallInstance implements Ball {
      x: number
      y: number
      angle: number
      vx: number
      vy: number
      r: number
      color: string

      constructor() {
        this.x = origin.x
        this.y = origin.y
        this.angle = Math.PI * 2 * Math.random()
        this.vx = (1.3 + Math.random() * .3) * Math.cos(this.angle)
        this.vy = (1.3 + Math.random() * .3) * Math.sin(this.angle)
        this.r = 6 + 3 * Math.random()
        this.color = colorPallete[Math.floor(Math.random() * colorPallete.length)]
      }

      update() {
        this.x += this.vx
        this.y += this.vy
        this.r -= .01
      }
    }

    const onresize = () => {
      width = canvas.width = root.clientWidth || window.innerWidth
      height = canvas.height = root.clientHeight || window.innerHeight
      origin = { x: width / 2, y: height / 2 }
    }

    const removeBall = () => {
      for (let i = 0; i < balls.length; i++) {
        const b = balls[i]
        if (
          b.x + b.r < 0 ||
          b.x - b.r > width ||
          b.y + b.r < 0 ||
          b.y - b.r > height ||
          b.r < 0
        ) {
          balls.splice(i, 1)
          i--
        }
      }
    }

    const loop = () => {
      frame = requestAnimationFrame(loop)
      const now = performance.now()
      if (!isVisible || document.hidden || (lightweight && now - lastFrame < 80)) return
      lastFrame = now
      context.clearRect(0, 0, width, height)
      if (count === randomCount) {
        balls.push(new BallInstance())
        count = 0
        randomCount = 3 + Math.floor(Math.random() * 5)
      }
      count++

      for (let i = 0; i < balls.length; i++) {
        const b = balls[i]
        context.fillStyle = b.color
        context.beginPath()
        context.arc(b.x, b.y, b.r, 0, Math.PI * 2, false)
        context.fill()
        b.update()
      }

      origin.x += (mouse.x - origin.x) * .15
      origin.y += (mouse.y - origin.y) * .15

      context.fillStyle = "#000"
      context.beginPath()
      context.arc(origin.x, origin.y, 40, 0, Math.PI * 2, false)
      context.fill()

      removeBall()
    }

    const handlePointerMove = (e: PointerEvent) => {
      const bounds = root.getBoundingClientRect()
      mouse.x = e.clientX - bounds.left
      mouse.y = e.clientY - bounds.top
    }

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
      },
      { threshold: 0.01 },
    )
    visibilityObserver.observe(root)

    onresize()
    loop()
    window.addEventListener("resize", onresize)
    window.addEventListener("pointermove", handlePointerMove, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      visibilityObserver.disconnect()
      window.removeEventListener("resize", onresize)
      window.removeEventListener("pointermove", handlePointerMove)
    }
  }, [])

  return (
    <div ref={rootRef} className="absolute inset-0 bg-[#ccc]">
      <canvas
        id="canvas"
        ref={canvasRef}
        className="absolute inset-0 cursor-none"
        style={{ WebkitFilter: 'url("#goo")', filter: 'url("#goo")' }}
      />
      <svg xmlns="http://www.w3.org/2000/svg" version="1.1" className="absolute h-0 w-0">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 60 -9" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}
