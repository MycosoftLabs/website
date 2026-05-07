"use client"

import { useEffect, useRef } from "react"

const TEXT = "SporeBase"
const DIR = ["x", "y"] as const
const PALETTE = [
  "fff7ed",
  "ffedd5",
  "fed7aa",
  "fdba74",
  "fb923c",
  "f97316",
  "ffb347",
  "ff8a3d",
  "ea580c",
]
const N = PALETTE.length - 1

type Axis = (typeof DIR)[number]

interface Pointer {
  x?: number
  y?: number
  active: boolean
}

interface TextBox {
  str: string
  anchorX: number
  anchorY: number
  x: number
  y: number
  w: number
  h: number
}

function rand(max = 1, min = 0, dec = 0) {
  return +(min + Math.random() * (max - min)).toFixed(dec)
}

class Particle {
  ox: number
  oy: number
  cx: number
  cy: number
  or: number
  cr: number
  pv: number
  ov: number
  f: number
  rgb: number[]

  constructor(x: number, y: number, rgb = [rand(128), rand(128), rand(128)]) {
    this.ox = x
    this.oy = y
    this.cx = this.ox
    this.cy = this.oy
    this.or = rand(0.6, 1.8, 1)
    this.cr = this.or
    this.pv = 0
    this.ov = 0
    this.f = rand(10, 5, 1)
    this.rgb = rgb.map((c) => Math.max(0, c + rand(-13, 13)))
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = `rgb(${this.rgb.join(",")})`
    ctx.beginPath()
    ctx.arc(this.cx, this.cy, this.cr, 0, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
  }

  move(ctx: CanvasRenderingContext2D, pointer: Pointer) {
    const odx = this.ox - this.cx
    const ody = this.oy - this.cy
    const od = Math.hypot(odx, ody)
    const oa = Math.atan2(ody, odx)

    if (pointer.active && Number.isFinite(pointer.x) && Number.isFinite(pointer.y)) {
      const pdx = this.cx - pointer.x
      const pdy = this.cy - pointer.y
      const pd = Math.hypot(pdx, pdy)
      const pa = Math.atan2(pdy, pdx)
      const radius = 145

      this.pv = pd < radius ? this.f * Math.pow((radius - pd) / radius, 2) : 0
      this.ov = od ? Math.min(8, od * 0.1) : 0

      this.cx += this.pv * Math.cos(pa) + this.ov * Math.cos(oa)
      this.cy += this.pv * Math.sin(pa) + this.ov * Math.sin(oa)
    } else if (od > 0.2) {
      const speed = Math.max(1, Math.min(18, od * 0.12))
      this.cx += speed * Math.cos(oa)
      this.cy += speed * Math.sin(oa)
    } else {
      this.cx = this.ox
      this.cy = this.oy
    }

    this.draw(ctx)
  }
}

export function SporeBaseParticleTitle() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d", { willReadFrequently: true })
    if (!canvas || !ctx) return

    const pointer: Pointer = { active: false }
    const particles: Particle[] = []
    const textbox: TextBox = { str: TEXT, anchorX: 0, anchorY: 0, x: 0, y: 0, w: 0, h: 0 }
    let rid: number | null = null

    function dottify() {
      const data = ctx.getImageData(textbox.x, textbox.y, textbox.w, textbox.h).data
      const pixa: { x: number; y: number; rgb: number[] }[] = []

      for (let i = 0; i < data.length; i += 4) {
        const px = (i / 4) % textbox.w
        const py = Math.floor(i / 4 / textbox.w)
        if (data[i + 3] && px % 3 === 0 && py % 3 === 0) {
          pixa.push({ x: px, y: py, rgb: Array.from(data.slice(i, i + 3)) })
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pixa.forEach((pix, i) => {
        particles[i] = new Particle(textbox.x + pix.x, textbox.y + pix.y, pix.rgb)
        particles[i].draw(ctx)
      })
      particles.splice(pixa.length)
    }

    function write() {
      ctx.font = `900 ${textbox.h}px Verdana, sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      textbox.w = Math.ceil(ctx.measureText(textbox.str).width + 16)
      textbox.x = Math.max(0, Math.round(textbox.anchorX - textbox.w * 0.5))
      textbox.y = Math.max(0, Math.round(textbox.anchorY - textbox.h * 0.5))

      const grd = ctx.createLinearGradient(textbox.x, textbox.y, textbox.x + textbox.w, textbox.y + textbox.h)
      PALETTE.forEach((color, i) => grd.addColorStop(i / N, `#${color}`))
      ctx.fillStyle = grd

      ctx.fillText(textbox.str, textbox.anchorX, textbox.anchorY)
      dottify()
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((particle) => particle.move(ctx, pointer))
      rid = requestAnimationFrame(animate)
    }

    function size() {
      if (rid) {
        cancelAnimationFrame(rid)
        rid = null
      }

      particles.splice(0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.round(rect.width))
      canvas.height = Math.max(1, Math.round(rect.height))
      textbox.anchorX = canvas.width * 0.5
      textbox.anchorY = canvas.height * 0.42
      textbox.h = Math.floor(
        Math.min(
          canvas.width / (textbox.str.length + 2),
          Math.max(84, Math.min(170, canvas.height * 0.18)),
        ),
      )

      write()
    }

    function setPointer(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect()
      DIR.forEach((axis: Axis) => {
        pointer[axis] = axis === "x" ? clientX - rect.left : clientY - rect.top
      })
      pointer.active = true
      if (!rid) animate()
    }

    function clearPointer() {
      pointer.x = undefined
      pointer.y = undefined
      pointer.active = false
      if (!rid) animate()
    }

    function handlePointerMove(event: PointerEvent) {
      setPointer(event.clientX, event.clientY)
    }

    function handleTouch(event: TouchEvent) {
      const touch = event.touches[0] ?? event.changedTouches[0]
      if (!touch) return
      setPointer(touch.clientX, touch.clientY)
    }

    const resizeObserver = new ResizeObserver(size)
    resizeObserver.observe(canvas)
    canvas.addEventListener("pointerdown", handlePointerMove)
    canvas.addEventListener("pointermove", handlePointerMove)
    canvas.addEventListener("pointerleave", clearPointer)
    canvas.addEventListener("pointercancel", clearPointer)
    canvas.addEventListener("touchstart", handleTouch, { passive: true })
    canvas.addEventListener("touchmove", handleTouch, { passive: true })
    canvas.addEventListener("touchend", clearPointer)
    canvas.addEventListener("touchcancel", clearPointer)
    size()

    return () => {
      if (rid) cancelAnimationFrame(rid)
      resizeObserver.disconnect()
      canvas.removeEventListener("pointerdown", handlePointerMove)
      canvas.removeEventListener("pointermove", handlePointerMove)
      canvas.removeEventListener("pointerleave", clearPointer)
      canvas.removeEventListener("pointercancel", clearPointer)
      canvas.removeEventListener("touchstart", handleTouch)
      canvas.removeEventListener("touchmove", handleTouch)
      canvas.removeEventListener("touchend", clearPointer)
      canvas.removeEventListener("touchcancel", clearPointer)
    }
  }, [])

  return (
    <canvas
      id="c"
      ref={canvasRef}
      aria-hidden="true"
      className="block h-full w-full touch-pan-y"
    />
  )
}
