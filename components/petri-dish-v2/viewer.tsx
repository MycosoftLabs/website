"use client"

import { useEffect, useRef } from "react"
import type { OrganismInstance, PetriStateSnapshot } from "@/components/petri-dish-v2/types"

const GRID = 128
const CANVAS_SIZE = 650
const DISH_RADIUS = 300
const GROWTH_RADIUS = DISH_RADIUS - 2
const CENTER = CANVAS_SIZE / 2

export type PetriVisualProfile =
  | "mycelium"
  | "mold"
  | "mildew"
  | "bacteria"
  | "virus"
  | "protista"
  | "pollen"
  | "archaea"

type Branch = {
  x: number
  y: number
  angle: number
  age: number
  atEdgeTime?: number
}

type V1Organism = {
  id: string
  species: string
  branches: Branch[]
  props: SpeciesProps
}

type SpeciesProps = {
  growthRate: number
  filamentThickness: number
  branchingProbability: number
  color: string
  edgeColor: string
  preferredAgar: string
}

const V1_SPECIES: Record<PetriVisualProfile, SpeciesProps> = {
  mycelium: {
    growthRate: 1.2,
    filamentThickness: 0.7,
    branchingProbability: 0.07,
    color: "#87CEFA",
    edgeColor: "#1E90FF",
    preferredAgar: "dextrose",
  },
  mold: {
    growthRate: 1.5,
    filamentThickness: 0.4,
    branchingProbability: 0.1,
    color: "#00FF00",
    edgeColor: "#008000",
    preferredAgar: "any",
  },
  mildew: {
    growthRate: 1.2,
    filamentThickness: 0.3,
    branchingProbability: 0.08,
    color: "#CCCCCC",
    edgeColor: "#888888",
    preferredAgar: "any",
  },
  bacteria: {
    growthRate: 2,
    filamentThickness: 0.2,
    branchingProbability: 0.2,
    color: "#FFFF00",
    edgeColor: "#FFD700",
    preferredAgar: "blood",
  },
  virus: {
    growthRate: 0.5,
    filamentThickness: 0.1,
    branchingProbability: 0.05,
    color: "#FF00FF",
    edgeColor: "#8B008B",
    preferredAgar: "any",
  },
  protista: {
    growthRate: 0.8,
    filamentThickness: 0.22,
    branchingProbability: 0.04,
    color: "#8EF5B5",
    edgeColor: "#22C55E",
    preferredAgar: "any",
  },
  pollen: {
    growthRate: 0.15,
    filamentThickness: 0.18,
    branchingProbability: 0.01,
    color: "#EAB308",
    edgeColor: "#F59E0B",
    preferredAgar: "any",
  },
  archaea: {
    growthRate: 0.55,
    filamentThickness: 0.22,
    branchingProbability: 0.035,
    color: "#D97706",
    edgeColor: "#B45309",
    preferredAgar: "any",
  },
}

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return x - Math.floor(x)
}

function toCanvas(x: number, y: number) {
  return {
    x: CENTER + (x / GRID - 0.5) * DISH_RADIUS * 2,
    y: CENTER + (y / GRID - 0.5) * DISH_RADIUS * 2,
  }
}

function isInsideGrowthArea(x: number, y: number) {
  return Math.hypot(x - CENTER, y - CENTER) <= GROWTH_RADIUS
}

function profileFromOrganism(organism: OrganismInstance): PetriVisualProfile {
  if (organism.class === "mold") return "mold"
  if (organism.class === "mildew") return "mildew"
  if (organism.class === "bacteria") return "bacteria"
  if (organism.class === "virus") return "virus"
  if (organism.class === "protista") return "protista"
  if (organism.class === "pollen") return "pollen"
  if (organism.class === "archaea") return "archaea"
  return "mycelium"
}

function drawFilament(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  props: SpeciesProps,
  isStarved = false
) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = isStarved ? "gray" : props.color
  ctx.lineWidth = Math.max(0.1, isStarved ? props.filamentThickness - 0.3 : props.filamentThickness)
  ctx.lineCap = "round"
  ctx.stroke()
}

function placeSampleFromOrganism(
  ctx: CanvasRenderingContext2D,
  organisms: Map<string, V1Organism>,
  organism: OrganismInstance,
  forcedProfile: PetriVisualProfile
) {
  const point = toCanvas(organism.x, organism.y)
  if (!isInsideGrowthArea(point.x, point.y)) return
  const id = `${organism.species_id}:${organism.id}`
  if (organisms.has(id)) return

  const profile = profileFromOrganism(organism) || forcedProfile
  const props = V1_SPECIES[profile]

  ctx.beginPath()
  ctx.fillStyle = props.color
  ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI)
  ctx.fill()

  const branches: Branch[] = []
  const numBranches = profile === "bacteria" ? 12 : profile === "virus" ? 4 : 8
  for (let i = 0; i < numBranches; i += 1) {
    branches.push({
      x: point.x,
      y: point.y,
      angle: (i / numBranches) * 2 * Math.PI + (hash(organism.id * 31 + i) - 0.5) * 0.1,
      age: 0,
    })
  }

  organisms.set(id, {
    id,
    species: profile,
    branches,
    props,
  })
}

function simulateOrganism(ctx: CanvasRenderingContext2D, organism: V1Organism, nutrientGrid: Float32Array) {
  const props = organism.props
  const newBranches: Branch[] = []
  const baseGrowthRate = props.growthRate

  for (const branch of organism.branches) {
    branch.age += 1
    const dx = Math.cos(branch.angle) * baseGrowthRate
    const dy = Math.sin(branch.angle) * baseGrowthRate
    const newX = branch.x + dx
    const newY = branch.y + dy
    const gridX = Math.floor(newX)
    const gridY = Math.floor(newY)
    const index = gridY * CANVAS_SIZE + gridX

    if (
      isInsideGrowthArea(newX, newY) &&
      gridX >= 0 &&
      gridX < CANVAS_SIZE &&
      gridY >= 0 &&
      gridY < CANVAS_SIZE
    ) {
      const nutrient = nutrientGrid[index] || 0
      if (nutrient > 0) {
        nutrientGrid[index] = Math.max(0, nutrient - 0.5)
        const nutrientFactor = nutrient / 100
        drawFilament(ctx, branch.x, branch.y, newX, newY, props, nutrient < 10)
        newBranches.push({
          x: newX,
          y: newY,
          angle: branch.angle + (hash(branch.age * 71 + newX + newY) - 0.5) * 0.3,
          age: branch.age,
        })
        if (hash(branch.age * 97 + newX * 0.25 + newY * 0.75) < props.branchingProbability * nutrientFactor) {
          newBranches.push({
            x: newX,
            y: newY,
            angle: branch.angle + (hash(branch.age * 131 + newX) - 0.5) * Math.PI / 2,
            age: branch.age,
          })
        }
      }
    } else if (!isInsideGrowthArea(newX, newY)) {
      branch.atEdgeTime = (branch.atEdgeTime || 0) + 1
      if (branch.atEdgeTime > 50 && organism.species === "mycelium") {
        ctx.beginPath()
        ctx.fillStyle = props.edgeColor
        ctx.arc(branch.x, branch.y, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
  }

  organism.branches = newBranches.slice(-500)
}

export interface PetriViewerProps {
  snapshot: PetriStateSnapshot | null
  previewCompounds: number[]
  visualProfile?: PetriVisualProfile
}

export function PetriViewer({
  snapshot,
  previewCompounds,
  visualProfile = "mycelium",
}: PetriViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const organismsRef = useRef<Map<string, V1Organism>>(new Map())
  const nutrientGridRef = useRef<Float32Array>(new Float32Array(CANVAS_SIZE * CANVAS_SIZE))
  const lastResetFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = CANVAS_SIZE * dpr
    canvas.height = CANVAS_SIZE * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (lastResetFrameRef.current === null || (snapshot?.frame ?? 0) < (lastResetFrameRef.current ?? 0)) {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      organismsRef.current.clear()
      nutrientGridRef.current.fill(100)
    }
    lastResetFrameRef.current = snapshot?.frame ?? 0
  }, [snapshot?.frame])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    for (const organism of snapshot?.organisms ?? []) {
      placeSampleFromOrganism(ctx, organismsRef.current, organism, visualProfile)
    }
  }, [snapshot?.organisms, visualProfile])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const ctx = canvasRef.current?.getContext("2d")
      if (!ctx) return
      ctx.save()
      ctx.beginPath()
      ctx.arc(CENTER, CENTER, GROWTH_RADIUS, 0, 2 * Math.PI)
      ctx.clip()

      if ((previewCompounds[13] ?? 0) > 0.04) {
        ctx.globalAlpha = 0.04
        ctx.fillStyle = "#38bdf8"
        ctx.beginPath()
        ctx.arc(CENTER + 60, CENTER - 42, 76, 0, 2 * Math.PI)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      for (const organism of organismsRef.current.values()) {
        simulateOrganism(ctx, organism, nutrientGridRef.current)
      }
      for (const [key, organism] of organismsRef.current) {
        if (organism.branches.length === 0) organismsRef.current.delete(key)
      }
      ctx.restore()
    }, 1000 / 6)

    return () => window.clearInterval(interval)
  }, [previewCompounds])

  return (
    <canvas
      ref={canvasRef}
      className="relative z-10 block h-full w-full touch-none bg-transparent"
      aria-label="Petri dish v1 growth simulation layer"
    />
  )
}
