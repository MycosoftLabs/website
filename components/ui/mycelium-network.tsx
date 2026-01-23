"use client"

import { useEffect, useRef, useCallback } from 'react'

interface Particle {
  hue: number
  sat: number
  lum: number
  x: number
  y: number
  xLast: number
  yLast: number
  xSpeed: number
  ySpeed: number
  age: number
  ageSinceStuck: number
  speed?: number
  dist?: number
  attractor: {
    oldIndex: number
    gridSpotIndex: number
  }
  name: string
}

interface GridSpot {
  x: number
  y: number
  busyAge: number
  spotIndex: number
  isEdge: string | false
  field: number
}

interface MyceliumNetworkProps {
  className?: string
  hue?: number
  opacity?: number
}

export function MyceliumNetwork({ 
  className = "", 
  hue = 280, // Purple/magenta for mycosoft branding
  opacity = 0.4 
}: MyceliumNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const appRef = useRef<{
    ctx: CanvasRenderingContext2D | null
    width: number
    height: number
    xC: number
    yC: number
    stepCount: number
    particles: Particle[]
    grid: GridSpot[]
    gridSize: number
    gridSteps: number
    gridMaxIndex: number
    lifespan: number
    popPerBirth: number
    maxPop: number
    birthFreq: number
    dataToImageRatio: number
    drawnInLastFrame: number
    deathCount: number
    baseHue: number
  }>()

  const setup = useCallback((canvas: HTMLCanvasElement, baseHue: number) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const width = canvas.width
    const height = canvas.height

    ctx.imageSmoothingEnabled = false

    const gridSize = 8
    const gridSteps = Math.floor(1000 / gridSize)
    const grid: GridSpot[] = []
    let i = 0

    for (let xx = -500; xx < 500; xx += gridSize) {
      for (let yy = -500; yy < 500; yy += gridSize) {
        const r = Math.abs(xx) + Math.abs(yy)
        const r0 = 100
        let field: number

        if (r < r0) field = 255 / r0 * r
        else field = 255 - Math.min(255, (r - r0) / 2)

        grid.push({
          x: xx,
          y: yy,
          busyAge: 0,
          spotIndex: i,
          isEdge: (xx === -500 ? 'left' :
            (xx === (-500 + gridSize * (gridSteps - 1)) ? 'right' :
              (yy === -500 ? 'top' :
                (yy === (-500 + gridSize * (gridSteps - 1)) ? 'bottom' :
                  false
                )
              )
            )
          ),
          field: field
        })
        i++
      }
    }

    return {
      ctx,
      width,
      height,
      xC: width / 2,
      yC: height / 2,
      stepCount: 0,
      particles: [] as Particle[],
      grid,
      gridSize,
      gridSteps,
      gridMaxIndex: i,
      lifespan: 1000,
      popPerBirth: 1,
      maxPop: 150,
      birthFreq: 5,
      dataToImageRatio: 1,
      drawnInLastFrame: 0,
      deathCount: 0,
      baseHue
    }
  }, [])

  const birth = useCallback((app: NonNullable<typeof appRef.current>) => {
    const gridSpotIndex = Math.floor(Math.random() * app.gridMaxIndex)
    const gridSpot = app.grid[gridSpotIndex]
    const x = gridSpot.x
    const y = gridSpot.y

    const particle: Particle = {
      hue: app.baseHue,
      sat: 95,
      lum: 20 + Math.floor(40 * Math.random()),
      x,
      y,
      xLast: x,
      yLast: y,
      xSpeed: 0,
      ySpeed: 0,
      age: 0,
      ageSinceStuck: 0,
      attractor: {
        oldIndex: gridSpotIndex,
        gridSpotIndex: gridSpotIndex,
      },
      name: 'seed-' + Math.ceil(10000000 * Math.random())
    }
    app.particles.push(particle)
  }, [])

  const kill = useCallback((app: NonNullable<typeof appRef.current>, particleName: string) => {
    app.particles = app.particles.filter(seed => seed.name !== particleName)
  }, [])

  const move = useCallback((app: NonNullable<typeof appRef.current>) => {
    const toKill: string[] = []

    for (let i = 0; i < app.particles.length; i++) {
      const p = app.particles[i]

      p.xLast = p.x
      p.yLast = p.y

      const index = p.attractor.gridSpotIndex
      let gridSpot = app.grid[index]

      if (Math.random() < 0.5) {
        if (!gridSpot.isEdge) {
          const topIndex = index - 1
          const bottomIndex = index + 1
          const leftIndex = index - app.gridSteps
          const rightIndex = index + app.gridSteps

          const neighbors = [
            app.grid[topIndex],
            app.grid[bottomIndex],
            app.grid[leftIndex],
            app.grid[rightIndex]
          ].filter(Boolean)

          const chaos = 30
          let maxFieldSpot = neighbors[0]
          let maxField = -Infinity

          for (const neighbor of neighbors) {
            const fieldValue = neighbor.field + chaos * Math.random()
            if (fieldValue > maxField) {
              maxField = fieldValue
              maxFieldSpot = neighbor
            }
          }

          const potentialNewGridSpot = maxFieldSpot

          if (potentialNewGridSpot && (potentialNewGridSpot.busyAge === 0 || potentialNewGridSpot.busyAge > 15)) {
            p.ageSinceStuck = 0
            p.attractor.oldIndex = index
            p.attractor.gridSpotIndex = potentialNewGridSpot.spotIndex
            gridSpot = potentialNewGridSpot
            gridSpot.busyAge = 1
          } else {
            p.ageSinceStuck++
          }
        } else {
          p.ageSinceStuck++
        }

        if (p.ageSinceStuck === 10) toKill.push(p.name)
      }

      const k = 8
      const visc = 0.4
      const dx = p.x - gridSpot.x
      const dy = p.y - gridSpot.y

      const xAcc = -k * dx
      const yAcc = -k * dy

      p.xSpeed += xAcc
      p.ySpeed += yAcc
      p.xSpeed *= visc
      p.ySpeed *= visc

      p.speed = Math.sqrt(p.xSpeed * p.xSpeed + p.ySpeed * p.ySpeed)
      p.dist = Math.sqrt(dx * dx + dy * dy)

      p.x += 0.1 * p.xSpeed
      p.y += 0.1 * p.ySpeed

      p.age++

      if (p.age > app.lifespan) {
        toKill.push(p.name)
        app.deathCount++
      }
    }

    toKill.forEach(name => kill(app, name))
  }, [kill])

  const dataXYtoCanvasXY = useCallback((app: NonNullable<typeof appRef.current>, x: number, y: number) => {
    const zoom = 1.6
    return {
      x: app.xC + x * zoom * app.dataToImageRatio,
      y: app.yC + y * zoom * app.dataToImageRatio
    }
  }, [])

  const draw = useCallback((app: NonNullable<typeof appRef.current>) => {
    if (!app.ctx) return

    app.drawnInLastFrame = 0
    
    // Semi-transparent black overlay for trail effect
    app.ctx.beginPath()
    app.ctx.rect(0, 0, app.width, app.height)
    app.ctx.fillStyle = 'rgba(0, 0, 0, 0.07)'
    app.ctx.fill()
    app.ctx.closePath()

    if (!app.particles.length) return

    for (let i = 0; i < app.particles.length; i++) {
      const p = app.particles[i]

      const h = p.hue + app.stepCount / 30
      const s = p.sat
      const l = p.lum
      const a = 1

      const last = dataXYtoCanvasXY(app, p.xLast, p.yLast)
      const now = dataXYtoCanvasXY(app, p.x, p.y)
      const attracSpot = app.grid[p.attractor.gridSpotIndex]
      const attracXY = dataXYtoCanvasXY(app, attracSpot.x, attracSpot.y)
      const oldAttracSpot = app.grid[p.attractor.oldIndex]
      const oldAttracXY = dataXYtoCanvasXY(app, oldAttracSpot.x, oldAttracSpot.y)

      app.ctx.beginPath()
      app.ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${a})`
      app.ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${a})`

      // Particle trail
      app.ctx.moveTo(last.x, last.y)
      app.ctx.lineTo(now.x, now.y)
      app.ctx.lineWidth = 1.5 * app.dataToImageRatio
      app.ctx.stroke()
      app.ctx.closePath()

      // Attractor positions
      app.ctx.beginPath()
      app.ctx.lineWidth = 1.5 * app.dataToImageRatio
      app.ctx.moveTo(oldAttracXY.x, oldAttracXY.y)
      app.ctx.lineTo(attracXY.x, attracXY.y)
      app.ctx.arc(attracXY.x, attracXY.y, 1.5 * app.dataToImageRatio, 0, 2 * Math.PI, false)
      app.ctx.strokeStyle = `hsla(${h}, ${s}%, ${l}%, ${a})`
      app.ctx.fillStyle = `hsla(${h}, ${s}%, ${l}%, ${a})`
      app.ctx.fill()
      app.ctx.closePath()

      app.drawnInLastFrame++
    }
  }, [dataXYtoCanvasXY])

  const evolve = useCallback((app: NonNullable<typeof appRef.current>) => {
    app.stepCount++

    // Increment grid ages
    app.grid.forEach(e => {
      if (e.busyAge > 0) e.busyAge++
    })

    // Birth new particles
    if (app.stepCount % app.birthFreq === 0 && (app.particles.length + app.popPerBirth) < app.maxPop) {
      birth(app)
    }

    move(app)
    draw(app)
  }, [birth, move, draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.offsetWidth
        canvas.height = parent.offsetHeight
      }
    }

    resizeCanvas()

    const app = setup(canvas, hue)
    if (!app) return

    appRef.current = app

    // Initial black fill
    app.ctx.beginPath()
    app.ctx.rect(0, 0, app.width, app.height)
    app.ctx.fillStyle = 'black'
    app.ctx.fill()
    app.ctx.closePath()

    const frame = () => {
      if (appRef.current) {
        evolve(appRef.current)
      }
      animationRef.current = requestAnimationFrame(frame)
    }

    frame()

    const handleResize = () => {
      resizeCanvas()
      if (appRef.current && canvas) {
        appRef.current.width = canvas.width
        appRef.current.height = canvas.height
        appRef.current.xC = canvas.width / 2
        appRef.current.yC = canvas.height / 2
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [setup, evolve, hue])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ opacity }}
    />
  )
}
