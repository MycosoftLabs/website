#!/usr/bin/env node
/**
 * NYC + DC iNaturalist bake — Apr 23, 2026
 *
 * Morgan: "i see not one nature data icon in nyc or washington dc that
 * is a huge violation of our product fix that now".
 *
 * Pulls iNaturalist observations for the NYC + DC bboxes via the public
 * /v1/observations endpoint (no key required), writes two geojson files
 * that the existing CREP nature layer can consume alongside the SoCal
 * baseline.
 *
 * API: https://api.inaturalist.org/v1/observations
 *   params: nelat/nelng/swlat/swlng, verifiable=true, per_page=200,
 *           iconic_taxa (optional), photos=true, quality_grade=research
 *
 * iNat caps at 10k results per query; each region is <5k at research
 * grade. For visual balance we also pull photos=true only so every dot
 * on the map can show a photo.
 *
 * Output:
 *   public/data/crep/nyc-inat.geojson
 *   public/data/crep/dc-inat.geojson
 */

import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const ROOT = path.resolve(path.dirname(__filename), "..", "..", "..")
const OUT_DIR = path.join(ROOT, "public", "data", "crep")

const REGIONS = [
  { id: "nyc", bbox: [-74.10, 40.55, -73.70, 40.92] },
  { id: "dc",  bbox: [-77.30, 38.70, -76.80, 39.10] },
]

const log = (...a) => console.log(`[${new Date().toISOString().substring(11, 19)}]`, ...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage({ swlat, swlng, nelat, nelng }, page) {
  const url = new URL("https://api.inaturalist.org/v1/observations")
  url.searchParams.set("swlat", String(swlat))
  url.searchParams.set("swlng", String(swlng))
  url.searchParams.set("nelat", String(nelat))
  url.searchParams.set("nelng", String(nelng))
  url.searchParams.set("verifiable", "true")
  url.searchParams.set("photos", "true")
  url.searchParams.set("quality_grade", "research")
  url.searchParams.set("order", "desc")
  url.searchParams.set("order_by", "observed_on")
  url.searchParams.set("per_page", "200")
  url.searchParams.set("page", String(page))
  const r = await fetch(url.toString(), {
    headers: { "User-Agent": "Mycosoft-CREP/1.0 (contact: morgan@mycosoft.org)", Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!r.ok) throw new Error(`iNat ${r.status}`)
  return r.json()
}

async function harvest(region) {
  const [W, S, E, N] = region.bbox
  const bbox = { swlat: S, swlng: W, nelat: N, nelng: E }
  log(`[${region.id}] harvesting ${region.bbox.join(",")}`)
  const features = []
  const seen = new Set()
  for (let page = 1; page <= 50; page++) {
    try {
      const j = await fetchPage(bbox, page)
      const obs = j?.results || []
      if (!obs.length) break
      for (const o of obs) {
        if (!o.id || seen.has(o.id)) continue
        seen.add(o.id)
        const lnglat = o.geojson?.coordinates || (o.longitude != null && o.latitude != null ? [Number(o.longitude), Number(o.latitude)] : null)
        if (!lnglat) continue
        const taxon = o.taxon || {}
        const photo = o.photos?.[0]?.url?.replace(/\/square\.jpg/i, "/medium.jpg") || null
        features.push({
          type: "Feature",
          properties: {
            id: `inat-${o.id}`,
            inat_id: o.id,
            observed_on: o.observed_on,
            taxon_id: taxon.id,
            name: taxon.preferred_common_name || taxon.name || "Observation",
            sci_name: taxon.name,
            iconic_taxon: taxon.iconic_taxon_name || null,
            rank: taxon.rank || null,
            user: o.user?.login || null,
            photo,
            url: `https://www.inaturalist.org/observations/${o.id}`,
          },
          geometry: { type: "Point", coordinates: lnglat },
        })
      }
      log(`  page ${page}: ${obs.length} returned, total ${features.length}`)
      if (obs.length < 200) break // last page
      await sleep(800) // iNat fair-use
    } catch (err) {
      log(`  page ${page} failed: ${err.message}`)
      break
    }
  }
  return features
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  for (const region of REGIONS) {
    const features = await harvest(region)
    const byKingdom = {}
    for (const f of features) {
      const k = f.properties.iconic_taxon || "Other"
      byKingdom[k] = (byKingdom[k] || 0) + 1
    }
    const fc = {
      type: "FeatureCollection",
      generated_at: new Date().toISOString(),
      source: "iNaturalist v1 /observations — research-grade, photos=true",
      region: region.id,
      bbox: region.bbox,
      feature_count: features.length,
      by_kingdom: byKingdom,
      features,
    }
    const outName = `${region.id}-inat.geojson`
    await fs.writeFile(path.join(OUT_DIR, outName), JSON.stringify(fc))
    const sz = (await fs.stat(path.join(OUT_DIR, outName))).size
    log(`✓ ${outName} (${features.length} obs, ${(sz/1024).toFixed(1)} KB)`)
    log(`  by kingdom: ${JSON.stringify(byKingdom)}`)
    await sleep(2000)
  }
  log("Done.")
}

main().catch((err) => { console.error("[bake-nyc-dc-inat] fatal:", err); process.exit(1) })
