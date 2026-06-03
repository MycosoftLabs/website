"use client"

import { useEffect, useRef } from "react"

type Locus = {
  x: number
  y: number
  px: number
  py: number
  color: string
  friendId: number
}

const stepLength = 24
const maxLoci = 1800

const random = (value: number) => Math.random() * value
const randomInt = (low: number, high: number) => low + Math.floor(random(high - low + 1))

function randomColor(isDark: boolean) {
  if (isDark) {
    return `rgba(${randomInt(80, 255)}, ${randomInt(80, 255)}, ${randomInt(80, 255)}, 0.5)`
  }

  return `rgba(${randomInt(0, 205)}, ${randomInt(0, 205)}, ${randomInt(0, 205)}, 0.5)`
}

export function MycobrainFleetBackground() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")

    if (!root || !canvas || !context) return

    let width = 1
    let height = 1
    let frame = 0
    let time = 0
    let offsetX = 0
    let offsetY = 0
    let numX = 1
    let numY = 1
    let loci: Locus[] = []
    let isVisible = true

    const isDarkTheme = () => document.documentElement.classList.contains("dark")

    const makeFriend = (index: number) => {
      if (loci.length <= 1) return 0

      let friendId = index
      while (friendId === index) {
        friendId = Math.floor(random(loci.length))
      }

      return friendId
    }

    const gridX = () => offsetX + stepLength * randomInt(0, numX)
    const gridY = () => offsetY + stepLength * randomInt(0, numY)

    const relocate = (locus: Locus, index: number) => {
      locus.friendId = makeFriend(index)
      locus.x = gridX()
      locus.y = gridY()
      locus.px = locus.x
      locus.py = locus.y
      locus.color = randomColor(isDarkTheme())
    }

    const update = (locus: Locus, index: number) => {
      if (locus.x < 0 || locus.x > width || locus.y < 0 || locus.y > height || Math.random() < 0.0005) {
        relocate(locus, index)
      }

      const friend = loci[locus.friendId] || loci[0] || locus
      const dx = friend.x - locus.x
      const dy = friend.y - locus.y
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)

      locus.px = locus.x
      locus.py = locus.y

      if (adx >= ady) locus.x += dx < 0 ? -stepLength : stepLength
      if (ady >= adx) locus.y += dy < 0 ? -stepLength : stepLength

      return locus
    }

    const paintBase = () => {
      context.save()
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.fillStyle = isDarkTheme() ? "#000000" : "#ffffff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.restore()
    }

    const resize = () => {
      const bounds = root.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      width = Math.max(1, bounds.width)
      height = Math.max(1, bounds.height)
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)

      offsetX = Math.round((width % stepLength) / 2)
      offsetY = Math.round((height % stepLength) / 2)
      numX = Math.max(1, Math.floor(width / stepLength))
      numY = Math.max(1, Math.floor(height / stepLength))
      paintBase()
    }

    const init = () => {
      const locusCount = Math.min(maxLoci, numX * numY)

      loci = Array.from({ length: locusCount }, () => ({
        x: gridX(),
        y: gridY(),
        px: gridX(),
        py: gridY(),
        color: randomColor(isDarkTheme()),
        friendId: 0,
      }))

      loci.forEach((locus, index) => {
        locus.px = locus.x
        locus.py = locus.y
        locus.friendId = makeFriend(index)
      })

      context.lineWidth = 2
      time = 0
    }

    const draw = () => {
      time += 1
      if (time % 2) return

      context.fillStyle = isDarkTheme() ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)"
      context.fillRect(0, 0, width, height)

      for (let index = 0; index < loci.length; index += 1) {
        const locus = update(loci[index], index)

        context.beginPath()
        context.moveTo(locus.px, locus.py)
        context.lineTo(locus.x, locus.y)
        context.strokeStyle = locus.color
        context.stroke()
      }
    }

    const loop = () => {
      frame = window.requestAnimationFrame(loop)
      if (!isVisible || document.hidden) return
      draw()
    }

    const reset = () => {
      resize()
      init()
    }

    const resizeObserver = new ResizeObserver(reset)
    const themeObserver = new MutationObserver(reset)
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting
      },
      { threshold: 0.01 },
    )

    reset()
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
    </div>
  )
}
