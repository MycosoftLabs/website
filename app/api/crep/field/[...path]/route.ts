import { existsSync, readFileSync } from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"
import { FIELD_REGISTRY, type FieldDataset, type FieldVariable } from "@/lib/crep/fields/registry"
import {
  configuredHttpBase,
  fieldFrameBffUrl,
  fieldStoreBound,
  findLocalFieldStore,
  safeFieldFileName,
} from "@/lib/crep/fields/field-store"

/**
 * Earth Simulator / Aerosol — Arraylake gridded-FIELD proxy.
 *
 *   GET /api/crep/field/_catalog
 *   GET /api/crep/field/{dataset}/{variable}
 *   GET /api/crep/field/{dataset}/{variable}/{file}
 *
 * The BFF itself is the bind. Empty baked frames are "no data in view", not UNBOUND.
 * UNBOUND is reserved for a missing route (404) or a missing required env with no
 * local / NAS / public bake fallback. NO MOCK DATA.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const TOKEN = process.env.ARRAYLAKE_FIELD_TOKEN || process.env.ARRAYLAKE_TOKEN || ""

function missingFieldEnv(): string[] {
  const missing: string[] = []
  if (!process.env.ARRAYLAKE_FIELD_TOKEN && !process.env.ARRAYLAKE_TOKEN) {
    missing.push("ARRAYLAKE_FIELD_TOKEN|ARRAYLAKE_TOKEN")
  }
  return missing
}

function findVar(ds: FieldDataset, key: string): FieldVariable | undefined {
  return ds.variables.find((v) => v.key === key)
}

function metaFor(ds: FieldDataset, v: FieldVariable) {
  return {
    dataset: ds.id,
    variable: v.key,
    repo: ds.repo,
    name: `${ds.name} — ${v.name}`,
    unit: v.unit ?? "",
    render: v.render,
    group: ds.group,
    coverage: ds.coverage,
    static: !!ds.static,
    minZoom: ds.minZoom ?? 0,
    valueRange: v.valueRange ?? null,
    ramp: v.ramp ?? null,
    speedRange: v.speedRange ?? null,
  }
}

function emptyManifest(ds: FieldDataset, v: FieldVariable, reason: string) {
  return NextResponse.json(
    {
      ...metaFor(ds, v),
      frames: [],
      bounds: null,
      updated: null,
      baked: false,
      reason,
    },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  )
}

function catalogHeaders() {
  return { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" }
}

function mimeFor(file: string): string {
  if (file.endsWith(".png")) return "image/png"
  if (file.endsWith(".webp")) return "image/webp"
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg"
  if (file.endsWith(".json")) return "application/json"
  return "application/octet-stream"
}

function resolveDataset(datasetId: string, varKey: string) {
  const ds = FIELD_REGISTRY.find((item) => item.id === datasetId)
  if (!ds) return { error: NextResponse.json({ error: "unknown dataset", datasetId }, { status: 404 }) }
  const v = findVar(ds, varKey)
  if (!v) return { error: NextResponse.json({ error: "unknown variable", datasetId, varKey }, { status: 404 }) }
  return { ds, v }
}

function readLocalManifest(dir: string, datasetId: string, varKey: string): Record<string, unknown> | null {
  const manifestPath = path.join(dir, datasetId, varKey, "manifest.json")
  if (!existsSync(manifestPath)) return null
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>
  } catch {
    return null
  }
}

function mapFrames(baked: Record<string, unknown>, datasetId: string, varKey: string) {
  const rawFrames = Array.isArray(baked.frames) ? baked.frames : []
  return rawFrames.map((frame) => {
    const row = frame && typeof frame === "object" ? (frame as Record<string, unknown>) : {}
    const out: Record<string, unknown> = { t: row.t ?? null }
    if (row.tiles) out.tiles = fieldFrameBffUrl(datasetId, varKey, String(row.tiles))
    if (row.image) out.image = fieldFrameBffUrl(datasetId, varKey, String(row.image))
    if (row.grid) out.grid = fieldFrameBffUrl(datasetId, varKey, String(row.grid))
    return out
  }).filter((frame) => frame.image || frame.tiles || frame.grid)
}

async function fetchRemoteManifest(base: string, datasetId: string, varKey: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`${base}/${datasetId}/${varKey}/manifest.json`, {
      headers: TOKEN ? { "X-Internal-Token": TOKEN } : undefined,
      signal: controller.signal,
      cache: "no-store",
    })
    if (!res.ok) return { error: `manifest ${res.status}` as const }
    return { baked: await res.json() as Record<string, unknown> }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "manifest fetch failed"
    return { error: message }
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segs } = await ctx.params
  const seg = segs || []

  if (seg.length === 1 && seg[0] === "_catalog") {
    const store = fieldStoreBound()
    const unbound = !store.bound
    return NextResponse.json(
      {
        datasets: FIELD_REGISTRY,
        base_configured: store.bound,
        local_base_configured: Boolean(store.localDir),
        configured_base_present: store.bound,
        store: store.localDir ? "local" : store.httpBase ? "http" : "none",
        honesty: unbound ? "UNBOUND" : "BOUND",
        unbound_vars: unbound ? missingFieldEnv() : [],
      },
      { headers: catalogHeaders() },
    )
  }

  if (seg.length === 3) {
    const [datasetId, varKey, rawFile] = seg
    const resolved = resolveDataset(datasetId, varKey)
    if ("error" in resolved) return resolved.error
    const file = safeFieldFileName(rawFile)
    if (!file) return NextResponse.json({ error: "invalid field file" }, { status: 400 })

    const localDir = findLocalFieldStore()
    if (localDir) {
      const diskPath = path.join(localDir, datasetId, varKey, file)
      if (existsSync(diskPath)) {
        const bytes = readFileSync(diskPath)
        return new NextResponse(bytes, {
          status: 200,
          headers: {
            "Content-Type": mimeFor(file),
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        })
      }
    }

    const httpBase = configuredHttpBase()
    if (httpBase) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 10_000)
      try {
        const res = await fetch(`${httpBase}/${datasetId}/${varKey}/${file}`, {
          headers: TOKEN ? { "X-Internal-Token": TOKEN } : undefined,
          signal: controller.signal,
          cache: "no-store",
        })
        if (!res.ok) return NextResponse.json({ error: `field file ${res.status}` }, { status: 404 })
        const bytes = Buffer.from(await res.arrayBuffer())
        return new NextResponse(bytes, {
          status: 200,
          headers: {
            "Content-Type": mimeFor(file),
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        })
      } catch {
        return NextResponse.json({ error: "field file fetch failed" }, { status: 404 })
      } finally {
        clearTimeout(timer)
      }
    }

    return NextResponse.json({ error: "no baked field file in view" }, { status: 404 })
  }

  if (seg.length !== 2) {
    return NextResponse.json({ error: "expected /_catalog or /{dataset}/{variable}", got: seg }, { status: 400 })
  }

  const [datasetId, varKey] = seg
  const resolved = resolveDataset(datasetId, varKey)
  if ("error" in resolved) return resolved.error
  const { ds, v } = resolved

  const localDir = findLocalFieldStore()
  if (localDir) {
    const baked = readLocalManifest(localDir, ds.id, v.key)
    if (baked) {
      const frames = mapFrames(baked, ds.id, v.key)
      if (frames.length > 0) {
        return NextResponse.json(
          {
            ...metaFor(ds, v),
            frames,
            bounds: baked.bounds ?? null,
            updated: baked.updated ?? null,
            baked: true,
            storage: "local",
          },
          { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
        )
      }
    }
  }

  const httpBase = configuredHttpBase()
  if (httpBase) {
    const remote = await fetchRemoteManifest(httpBase, ds.id, v.key)
    if ("baked" in remote) {
      const frames = mapFrames(remote.baked, ds.id, v.key)
      if (frames.length > 0) {
        return NextResponse.json(
          {
            ...metaFor(ds, v),
            frames,
            bounds: remote.baked.bounds ?? null,
            updated: remote.baked.updated ?? null,
            baked: true,
            storage: "http",
          },
          { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
        )
      }
      return emptyManifest(ds, v, "Remote bake completed with no renderable frames. No data in view.")
    }
  }

  if (!localDir && !httpBase) {
    const missing = missingFieldEnv()
    return emptyManifest(
      ds,
      v,
      `UNBOUND missing ${missing.length ? missing.join(", ") : "ARRAYLAKE_FIELD_OUT or ARRAYLAKE_FIELD_BASE"}.`,
    )
  }

  return emptyManifest(
    ds,
    v,
    localDir
      ? "Local Arraylake bake is bound but this variable has no renderable frames. No data in view."
      : "ARRAYLAKE_FIELD_BASE is set but this variable has no renderable frames. No data in view.",
  )
}
