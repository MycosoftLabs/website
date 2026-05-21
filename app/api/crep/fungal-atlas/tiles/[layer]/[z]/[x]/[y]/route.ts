import { NextRequest, NextResponse } from "next/server"

import {
  renderFungalAtlasCompositeTileRgba,
  renderFungalAtlasTileRgba,
  type FungalAtlasHeatLayer,
  type FungalAtlasLayer,
} from "@/lib/crep/fungal-atlas"

export const dynamic = "force-dynamic"

const ALLOW_GENERATED_FUNGAL_ATLAS = process.env.FUNGAL_ATLAS_ALLOW_GENERATED_DISPLAY === "1"
const TRANSPARENT_TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lYy1GAAAAABJRU5ErkJggg==",
  "base64",
)

const VALID_LAYERS = new Set<string>([
  "mycelium",
  "am",
  "ecm",
  "rarity",
  "endemic",
  "fci",
  "protected",
  "composite",
])

const VALID_COMPOSITE_LAYERS = new Set<FungalAtlasHeatLayer>([
  "mycelium",
  "am",
  "ecm",
  "rarity",
  "endemic",
  "fci",
])

type TileCacheEntry = { png: Buffer; createdAt: number; bytes: number }
type FungalTileGlobal = typeof globalThis & {
  __crepFungalTileCache?: Map<string, TileCacheEntry>
  __crepFungalTileInflight?: Map<string, Promise<Buffer>>
  __crepFungalTileActive?: number
  __crepFungalTileQueue?: Array<() => void>
}

const TILE_CACHE_MAX = 180
const TILE_CACHE_MAX_BYTES = 48 * 1024 * 1024
const TILE_CACHE_TTL_MS = 45 * 60 * 1000
const TILE_RENDER_CONCURRENCY = 4

function tileCache() {
  const g = globalThis as FungalTileGlobal
  if (!g.__crepFungalTileCache) g.__crepFungalTileCache = new Map()
  return g.__crepFungalTileCache
}

function inflightCache() {
  const g = globalThis as FungalTileGlobal
  if (!g.__crepFungalTileInflight) g.__crepFungalTileInflight = new Map()
  return g.__crepFungalTileInflight
}

function pruneTileCache(cache: Map<string, TileCacheEntry>) {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (now - entry.createdAt > TILE_CACHE_TTL_MS) cache.delete(key)
  }
  const totalBytes = () => Array.from(cache.values()).reduce((sum, entry) => sum + entry.bytes, 0)
  while (cache.size > TILE_CACHE_MAX || totalBytes() > TILE_CACHE_MAX_BYTES) {
    const oldest = cache.keys().next().value
    if (!oldest) break
    cache.delete(oldest)
  }
}

function pngBody(png: Buffer): ArrayBuffer {
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer
}

function transparentTile(layer: string) {
  return new NextResponse(pngBody(TRANSPARENT_TILE), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-Fungal-Atlas-Layer": layer,
      "X-Fungal-Atlas-Cache": "disabled",
      "X-External-Atlas-Used": "false",
      "X-Precision-Note": "fungal-tiles-disabled-until-native-atlas-is-ready",
    },
  })
}

async function withTileRenderSlot<T>(fn: () => Promise<T>): Promise<T> {
  const g = globalThis as FungalTileGlobal
  if (typeof g.__crepFungalTileActive !== "number") g.__crepFungalTileActive = 0
  if (!g.__crepFungalTileQueue) g.__crepFungalTileQueue = []
  if (g.__crepFungalTileActive >= TILE_RENDER_CONCURRENCY) {
    await new Promise<void>((resolve) => g.__crepFungalTileQueue!.push(resolve))
  }
  g.__crepFungalTileActive += 1
  try {
    return await fn()
  } finally {
    g.__crepFungalTileActive = Math.max(0, g.__crepFungalTileActive - 1)
    const next = g.__crepFungalTileQueue.shift()
    if (next) next()
  }
}

function parseCompositeLayers(value: string | null): FungalAtlasHeatLayer[] {
  const requested = (value || "mycelium,am,ecm,rarity,endemic,fci")
    .split(/[,\s|+]+/)
    .map((layer) => layer.trim().toLowerCase())
    .filter(Boolean)
  const active = requested.filter((layer): layer is FungalAtlasHeatLayer =>
    VALID_COMPOSITE_LAYERS.has(layer as FungalAtlasHeatLayer),
  )
  return active.length ? active : ["mycelium"]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ layer: string; z: string; x: string; y: string }> },
) {
  const { layer: layerParam, z, x, y: yParam } = await params
  const layer = VALID_LAYERS.has(layerParam)
    ? layerParam
    : "mycelium"
  const zoom = Number(z)
  const tileX = Number(x)
  const tileY = Number(yParam.replace(/\.png$/, ""))

  if (![zoom, tileX, tileY].every(Number.isFinite) || zoom < 0 || zoom > 20) {
    return NextResponse.json({ error: "Invalid fungal atlas tile coordinates" }, { status: 400 })
  }

  const version = request.nextUrl.searchParams.get("v") || "default"
  const compositeLayers = layer === "composite"
    ? parseCompositeLayers(request.nextUrl.searchParams.get("layers"))
    : []
  const layerKey = layer === "composite"
    ? `composite:${compositeLayers.join("+")}`
    : layer

  if (!ALLOW_GENERATED_FUNGAL_ATLAS) {
    return transparentTile(layerKey)
  }

  const key = `${version}:${layerKey}:${zoom}:${tileX}:${tileY}`
  const cache = tileCache()
  const cached = cache.get(key)
  if (cached && Date.now() - cached.createdAt < TILE_CACHE_TTL_MS) {
    return new NextResponse(pngBody(cached.png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Fungal-Atlas-Layer": layerKey,
        "X-Fungal-Atlas-Cache": "hit",
        "X-External-Atlas-Used": "false",
        "X-Precision-Note": "interpolated-display-tile",
      },
    })
  }

  const inflight = inflightCache()
  let renderPromise = inflight.get(key)
  if (!renderPromise) {
    renderPromise = withTileRenderSlot(async () => {
      const tile = layer === "composite"
        ? await renderFungalAtlasCompositeTileRgba(compositeLayers, zoom, tileX, tileY)
        : await renderFungalAtlasTileRgba(layer as FungalAtlasLayer, zoom, tileX, tileY)
      const { default: sharp } = await import("sharp")
      sharp.cache({ memory: 32, files: 0, items: 64 })
      const png = await sharp(Buffer.from(tile.rgba), {
        raw: {
          width: tile.size,
          height: tile.size,
          channels: 4,
        },
      })
        .resize(256, 256, {
          kernel: "nearest",
          fit: "fill",
        })
        .png({ compressionLevel: 4, adaptiveFiltering: false })
        .toBuffer()
      cache.set(key, { png, createdAt: Date.now(), bytes: png.byteLength })
      pruneTileCache(cache)
      return png
    }).finally(() => {
      inflight.delete(key)
    })
    inflight.set(key, renderPromise)
  }
  const png = await renderPromise

  return new NextResponse(pngBody(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Fungal-Atlas-Layer": layerKey,
      "X-Fungal-Atlas-Cache": "miss",
      "X-External-Atlas-Used": "false",
      "X-Precision-Note": "interpolated-display-tile",
    },
  })
}
