import { NextRequest, NextResponse } from "next/server"
import type { PetriAction } from "@/components/petri-dish-v2/types"
import {
  applyPetriAction,
  getPetriWorld,
  resetPetriWorld,
  stepPetriWorld,
  toSnapshot,
} from "@/lib/petri-dish-v2/realism-engine"
import { computeMaskMetrics } from "@/lib/petri-dish-v2/myceliumseg-calibration"

function segmentsFrom(path?: string[]) {
  return Array.isArray(path) ? path.filter(Boolean) : []
}

async function bodyJson<T>(request: NextRequest): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const path = segmentsFrom((await params).path)
  const world = getPetriWorld()
  const endpoint = path[0] ?? "state"

  if (endpoint === "health") {
    return NextResponse.json({
      ok: true,
      engine: "local-deterministic-realism-v1",
      pd_nca: "adaptive-substrate-enabled",
      myceliumseg: "curated-subset-ready-interface",
    })
  }

  if (endpoint === "world") return NextResponse.json(toSnapshot(world).world)
  return NextResponse.json(toSnapshot(world))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const path = segmentsFrom((await params).path)
  const endpoint = path[0] ?? "step"
  const world = getPetriWorld()

  if (endpoint === "step") {
    const body = await bodyJson<{ n?: number; force?: boolean }>(request)
    const n = Math.min(240, Math.max(1, Number(body?.n ?? 1)))
    if (body?.force) {
      const wasPaused = world.paused
      world.paused = false
      stepPetriWorld(world, n)
      world.paused = wasPaused
    } else {
      stepPetriWorld(world, n)
    }
    return NextResponse.json(toSnapshot(world))
  }

  if (endpoint === "reset") {
    const body = await bodyJson<{ seed_hex?: string | null }>(request)
    return NextResponse.json(toSnapshot(resetPetriWorld(body?.seed_hex)))
  }

  if (endpoint === "pause") {
    const body = await bodyJson<{ paused?: boolean }>(request)
    if (body?.paused === false && world.hyphae.length === 0 && world.organisms.length === 0) {
      world.paused = true
      return NextResponse.json(toSnapshot(world))
    }
    world.paused = !!body?.paused
    return NextResponse.json(toSnapshot(world))
  }

  if (endpoint === "action") {
    const action = await bodyJson<PetriAction>(request)
    if (!action?.type) return NextResponse.json({ error: "invalid_petri_action" }, { status: 400 })
    return NextResponse.json(applyPetriAction(world, action))
  }

  if (endpoint === "calibrate" && path[1] === "myceliumseg") {
    const body = await bodyJson<{
      width?: number
      height?: number
      mask?: number[]
      groundTruth?: number[]
    }>(request)
    if (!body?.width || !body?.height || !body?.mask) {
      return NextResponse.json(
        { error: "mask_required", message: "Provide width, height, and binary mask for MyceliumSeg metric extraction." },
        { status: 400 }
      )
    }
    return NextResponse.json({
      dataset: "MyceliumSeg curated subset",
      metrics: computeMaskMetrics(body.mask, body.width, body.height, body.groundTruth),
    })
  }

  return NextResponse.json({ error: "unknown_petri_v2_endpoint", path }, { status: 404 })
}
