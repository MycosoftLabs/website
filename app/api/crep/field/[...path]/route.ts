import { NextRequest, NextResponse } from "next/server"
import { FIELD_REGISTRY, type FieldDataset, type FieldVariable } from "@/lib/crep/fields/registry"

/**
 * Earth Simulator — Arraylake gridded-FIELD proxy. Companion to the feed proxy.
 *
 *   GET /api/crep/field/_catalog                  → the FIELD_REGISTRY (single source
 *                                                    of truth for the bake job).
 *   GET /api/crep/field/{dataset}/{variable}      → a frame MANIFEST: registry
 *                                                    metadata (ramp/range/render)
 *                                                    merged with the baked frames
 *                                                    from ARRAYLAKE_FIELD_BASE.
 *
 * arraylake/zarr never run here — the DATA PLANE (scripts/arraylake/bake_field.py,
 * Cursor/server) bakes per-timestep tiles + a manifest.json into ARRAYLAKE_FIELD_BASE
 * storage; this route just serves the manifest, resolving relative frame paths to
 * absolute URLs. Until a cube is baked (or the base is unset) it returns an empty
 * `frames: []` manifest with 200 — the same graceful-degrade contract as the feed
 * proxy, so the layer simply renders nothing. NO MOCK DATA.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE = (process.env.ARRAYLAKE_FIELD_BASE || "").replace(/\/+$/, "")
const TOKEN = process.env.ARRAYLAKE_FIELD_TOKEN || ""

function findVar(ds: FieldDataset, key: string): FieldVariable | undefined {
  return ds.variables.find((v) => v.key === key)
}

/** view-plane metadata for one variable (legend + render hints), no frames. */
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
    { ...metaFor(ds, v), frames: [], bounds: null, updated: null, baked: false, reason },
    { status: 200, headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  )
}

/** resolve a frame path from the stored manifest to an absolute URL on the base. */
function absUrl(p: string, dataset: string, variable: string): string {
  if (/^https?:\/\//i.test(p)) return p
  const rel = p.replace(/^\/+/, "")
  return `${BASE}/${dataset}/${variable}/${rel}`
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const seg = path || []

  // ── catalog: the bake job reads this to know what to bake ──
  if (seg.length === 1 && seg[0] === "_catalog") {
    return NextResponse.json(
      { datasets: FIELD_REGISTRY, base_configured: !!BASE },
      { headers: { "Cache-Control": "public, s-maxage=300" } },
    )
  }

  if (seg.length !== 2) {
    return NextResponse.json({ error: "expected /_catalog or /{dataset}/{variable}", got: seg }, { status: 400 })
  }
  const [datasetId, varKey] = seg
  const ds = FIELD_REGISTRY.find((d) => d.id === datasetId)
  if (!ds) return NextResponse.json({ error: "unknown dataset", datasetId }, { status: 404 })
  const v = findVar(ds, varKey)
  if (!v) return NextResponse.json({ error: "unknown variable", datasetId, varKey }, { status: 404 })

  if (!BASE) return emptyManifest(ds, v, "ARRAYLAKE_FIELD_BASE not configured")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(`${BASE}/${ds.id}/${v.key}/manifest.json`, {
      headers: TOKEN ? { "X-Internal-Token": TOKEN } : undefined,
      signal: controller.signal,
      cache: "no-store",
    })
    if (!res.ok) return emptyManifest(ds, v, `manifest ${res.status}`)
    const baked = await res.json()
    const rawFrames: any[] = Array.isArray(baked?.frames) ? baked.frames : []
    const frames = rawFrames.map((f) => {
      const out: any = { t: f.t ?? null }
      if (f.tiles) out.tiles = absUrl(String(f.tiles), ds.id, v.key) // raster XYZ template
      if (f.image) out.image = absUrl(String(f.image), ds.id, v.key) // single global PNG
      if (f.grid) out.grid = absUrl(String(f.grid), ds.id, v.key) // wind velocity-grid JSON
      return out
    })
    return NextResponse.json(
      { ...metaFor(ds, v), frames, bounds: baked?.bounds ?? null, updated: baked?.updated ?? null, baked: true },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
    )
  } catch (err: any) {
    return emptyManifest(ds, v, err?.message || "manifest fetch failed")
  } finally {
    clearTimeout(timer)
  }
}
