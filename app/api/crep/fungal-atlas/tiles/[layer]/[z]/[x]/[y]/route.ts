import { NextRequest, NextResponse } from "next/server"
import sharp from "sharp"
import {
  renderFungalAtlasCompositeTileRgba,
  renderFungalAtlasTileRgba,
} from "@/lib/crep/fungal-atlas"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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
  "uncertainty",
  "composite",
])

const FELT_TILE_HOST = "https://us1.data-pipeline.felt.com/imgtile"
const DEBUG_FUNGAL_ATLAS_TILES = process.env.CREP_DEBUG_FUNGAL_ATLAS_TILES === "1"
const FELT_DATASETS = {
  amRichness: "a0033e00-d4c3-5823-a660-7c7e00004453",
  ecmRichness: "7c3d3cc8-9fd7-5149-976c-995b00004453",
  amEndemism: "3eaea630-f474-5092-afae-b6a500004453",
  ecmEndemism: "db246a3d-449e-5934-9dd7-9dac00004453",
} as const

const RICHNESS_RAMP: Array<[number, number, number]> = [
  [26, 51, 179],
  [52, 100, 153],
  [54, 176, 125],
  [255, 255, 102],
]

const AM_RICHNESS_RAMP = RICHNESS_RAMP

const ENDEMISM_RAMP: Array<[number, number, number]> = [
  [92, 83, 165],
  [160, 89, 160],
  [206, 102, 147],
  [235, 127, 134],
  [248, 160, 126],
  [250, 196, 132],
  [243, 231, 155],
]

type TileLayerConfig = {
  dataset: string
  ramp: Array<[number, number, number]>
  domain: [number, number]
  alpha: number
  source: string
}

const TILE_LAYER_CONFIG: Record<string, TileLayerConfig> = {
  am: {
    dataset: FELT_DATASETS.amRichness,
    ramp: AM_RICHNESS_RAMP,
    domain: [55, 150],
    alpha: 244,
    source: "SPUN AM predicted richness",
  },
  ecm: {
    dataset: FELT_DATASETS.ecmRichness,
    ramp: RICHNESS_RAMP,
    domain: [7, 50],
    alpha: 244,
    source: "SPUN EcM predicted richness",
  },
  rarity: {
    dataset: FELT_DATASETS.amEndemism,
    ramp: ENDEMISM_RAMP,
    domain: [0, 255],
    alpha: 232,
    source: "SPUN AM predicted endemism",
  },
  endemic: {
    dataset: FELT_DATASETS.amEndemism,
    ramp: ENDEMISM_RAMP,
    domain: [0, 255],
    alpha: 232,
    source: "SPUN AM predicted endemism",
  },
}
// Prefer SPUN/Felt predicted richness rasters for AM/ECM (continuous global coverage).
// Native cell fallback remains available when upstream is unavailable.
const FORCE_NATIVE_TILE_LAYERS = new Set<string>()

type TileCacheEntry = {
  at: number
  body: Buffer
}

const TILE_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const TILE_CACHE_MAX_ENTRIES = 650

declare global {
  // eslint-disable-next-line no-var
  var __crepSpunTileCache: Map<string, TileCacheEntry> | undefined
}

function tileCache() {
  if (!globalThis.__crepSpunTileCache) {
    globalThis.__crepSpunTileCache = new Map<string, TileCacheEntry>()
  }
  return globalThis.__crepSpunTileCache
}

function cacheKey(layer: string, config: TileLayerConfig, zoom: number, x: number, y: number) {
  return [
    layer,
    config.dataset,
    zoom,
    x,
    y,
    config.domain.join("-"),
    config.alpha,
    config.ramp.map((rgb) => rgb.join(".")).join("_"),
  ].join(":")
}

function getCachedTile(key: string) {
  const cache = tileCache()
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.at > TILE_CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  cache.delete(key)
  cache.set(key, entry)
  return entry.body
}

function setCachedTile(key: string, body: Buffer) {
  const cache = tileCache()
  cache.set(key, { at: Date.now(), body })
  while (cache.size > TILE_CACHE_MAX_ENTRIES) {
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
      "X-Precision-Note": "fungal-raster-tiles-disabled-use-native-cell-source-until-spun-rasters-are-ingested",
    },
  })
}

async function encodeNativeTilePng(rgba: Uint8Array, size: number) {
  return sharp(Buffer.from(rgba), {
    raw: {
      width: size,
      height: size,
      channels: 4,
    },
  })
    .png({ adaptiveFiltering: false, compressionLevel: 9 })
    .toBuffer()
}

async function renderNativeTile(layer: string, zoom: number, tileX: number, tileY: number, layersRaw = "") {
  if (layer === "composite") {
    const compositeLayers = layersRaw
      .split("+")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean) as Array<"mycelium" | "am" | "ecm" | "rarity" | "endemic" | "fci">
    const rendered = await renderFungalAtlasCompositeTileRgba(compositeLayers, zoom, tileX, tileY)
    return encodeNativeTilePng(rendered.rgba, rendered.size)
  }
  const rendered = await renderFungalAtlasTileRgba(
    layer as "mycelium" | "am" | "ecm" | "rarity" | "endemic" | "fci" | "protected" | "uncertainty",
    zoom,
    tileX,
    tileY,
  )
  return encodeNativeTilePng(rendered.rgba, rendered.size)
}

function shouldBoundNativeFallback(layer: string, zoom: number) {
  return (layer === "am" || layer === "ecm") && zoom >= 9
}

async function renderNativeTileBounded(
  layer: string,
  zoom: number,
  tileX: number,
  tileY: number,
  layersRaw = "",
  timeoutMs = 450,
) {
  if (!shouldBoundNativeFallback(layer, zoom)) {
    return renderNativeTile(layer, zoom, tileX, tileY, layersRaw)
  }
  return Promise.race<Buffer | null>([
    renderNativeTile(layer, zoom, tileX, tileY, layersRaw),
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ])
}

async function nativeFallbackResponse(
  layer: string,
  zoom: number,
  tileX: number,
  tileY: number,
  layersRaw: string,
  source: string,
) {
  const nativeTile = await renderNativeTileBounded(layer, zoom, tileX, tileY, layersRaw)
  if (!nativeTile) return transparentTile(`${layer}:native-fallback-timeout`)
  return new NextResponse(pngBody(nativeTile), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "X-Fungal-Atlas-Layer": layer,
      "X-Fungal-Atlas-Source": source,
      "X-Fungal-Atlas-Cache": "native-fallback",
      "X-External-Atlas-Used": "false",
      "X-Precision-Note": "continuous-global-land-coverage-native-surface",
    },
  })
}

function interpolateRamp(ramp: Array<[number, number, number]>, value: number): [number, number, number] {
  if (ramp.length === 0) return [0, 0, 0]
  if (ramp.length === 1) return ramp[0]
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const scaled = v * (ramp.length - 1)
  const lowerIndex = Math.floor(scaled)
  const upperIndex = Math.min(ramp.length - 1, lowerIndex + 1)
  const t = scaled - lowerIndex
  const lower = ramp[lowerIndex]
  const upper = ramp[upperIndex]
  return [
    Math.round(lower[0] + (upper[0] - lower[0]) * t),
    Math.round(lower[1] + (upper[1] - lower[1]) * t),
    Math.round(lower[2] + (upper[2] - lower[2]) * t),
  ]
}

async function colorizeSpunTile(input: Buffer, config: TileLayerConfig) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const channels = info.channels
  const output = Buffer.alloc(info.width * info.height * 4)
  const noDataThreshold = 2

  for (let src = 0, dst = 0; src < data.length; src += channels, dst += 4) {
    const alpha = channels >= 4 ? data[src + 3] : 255
    const gray = Math.round((data[src] + data[src + 1] + data[src + 2]) / 3)

    if (alpha < 8 || gray <= noDataThreshold) {
      output[dst] = 0
      output[dst + 1] = 0
      output[dst + 2] = 0
      output[dst + 3] = 0
      continue
    }

    const [domainMin, domainMax] = config.domain
    const domainSpan = Math.max(1, domainMax - domainMin)
    const normalized = Math.max(0, Math.min(1, (gray - domainMin) / domainSpan))
    const [r, g, b] = interpolateRamp(config.ramp, normalized)
    output[dst] = r
    output[dst + 1] = g
    output[dst + 2] = b
    output[dst + 3] = config.alpha
  }

  return sharp(output, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png({ adaptiveFiltering: false, compressionLevel: 9 })
    .toBuffer()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ layer: string; z: string; x: string; y: string }> },
) {
  const { layer: layerParam, z, x, y: yParam } = await params
  const zoom = Number(z)
  const tileX = Number(x)
  const tileY = Number(yParam.replace(/\.png$/, ""))

  if (![zoom, tileX, tileY].every(Number.isFinite) || zoom < 0 || zoom > 20) {
    return NextResponse.json({ error: "Invalid fungal atlas tile coordinates" }, { status: 400 })
  }

  const layer = VALID_LAYERS.has(layerParam) ? layerParam : "mycelium"
  const layers = layer === "composite"
    ? (request.nextUrl.searchParams.get("layers") || "mycelium")
        .split(/[,\s|+]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .join("+")
    : ""

  const tileLayer = layer === "composite"
    ? layers.split("+").find((item) => item === "am" || item === "ecm" || item === "rarity" || item === "endemic")
    : layer
  const config = FORCE_NATIVE_TILE_LAYERS.has(tileLayer || "")
    ? undefined
    : TILE_LAYER_CONFIG[tileLayer || ""]

  if (!config) {
    try {
      const nativeTile = await renderNativeTile(layer, zoom, tileX, tileY, layers)
      return new NextResponse(pngBody(nativeTile), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          "X-Fungal-Atlas-Layer": layer === "composite" ? `composite:${layers || "mycelium"}` : layer,
          "X-Fungal-Atlas-Source": "native-predicted-surface",
          "X-Fungal-Atlas-Cache": "native-fallback",
          "X-External-Atlas-Used": "false",
          "X-Precision-Note": "continuous-global-land-coverage-native-surface",
        },
      })
    } catch (error) {
      if (DEBUG_FUNGAL_ATLAS_TILES) console.warn("[CREP/FungalAtlas] native tile fallback failed", {
        layer,
        z: zoom,
        x: tileX,
        y: tileY,
        message: error instanceof Error ? error.message : String(error),
      })
      return transparentTile(layer === "composite" ? `composite:${layers || "mycelium"}` : layer)
    }
  }

  const key = cacheKey(tileLayer || layer, config, zoom, tileX, tileY)
  const cached = getCachedTile(key)
  if (cached) {
    return new NextResponse(pngBody(cached), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Fungal-Atlas-Layer": tileLayer || layer,
        "X-Fungal-Atlas-Source": config.source,
        "X-Fungal-Atlas-Cache": "memory-hit",
        "X-External-Atlas-Used": "true",
        "X-Precision-Note": "native-resolution-1-km2-30-arc-seconds-predicted-fungal-richness",
      },
    })
  }

  try {
    const upstreamUrl = `${FELT_TILE_HOST}/${config.dataset}/${zoom}/${tileX}/${tileY}.png`
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: "image/png",
        "User-Agent": "Mycosoft-CREP-Earth-Simulator/1.0",
      },
      signal: AbortSignal.timeout(1200),
    })

    if (!upstream.ok) {
      return nativeFallbackResponse(
        tileLayer || layer,
        zoom,
        tileX,
        tileY,
        layers,
        `native-fallback-upstream-${upstream.status}`,
      )
    }

    const upstreamBuffer = Buffer.from(await upstream.arrayBuffer())
    const tile = await colorizeSpunTile(upstreamBuffer, config)
    setCachedTile(key, tile)

    return new NextResponse(pngBody(tile), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Fungal-Atlas-Layer": tileLayer || layer,
        "X-Fungal-Atlas-Source": config.source,
        "X-Fungal-Atlas-Cache": "memory-miss",
        "X-External-Atlas-Used": "true",
        "X-Precision-Note": "native-resolution-1-km2-30-arc-seconds-predicted-fungal-richness",
      },
    })
  } catch (error) {
    if (DEBUG_FUNGAL_ATLAS_TILES) console.warn("[CREP/FungalAtlas] SPUN tile proxy failed", {
      layer,
      z: zoom,
      x: tileX,
      y: tileY,
      message: error instanceof Error ? error.message : String(error),
    })
    try {
      return nativeFallbackResponse(tileLayer || layer, zoom, tileX, tileY, layers, "native-fallback-fetch-error")
    } catch {
      return transparentTile(`${layer}:fetch-error`)
    }
  }

}
