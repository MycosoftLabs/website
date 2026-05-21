#!/usr/bin/env node

import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import readline from "node:readline"

const FALLBACK_METADATA =
  "C:\\Users\\Owner1\\Downloads\\GlobalFungi_5_sample_metadata.txt\\GlobalFungi_5_sample_metadata.txt"
const FALLBACK_SOURCE_DIRS = [
  "C:\\Users\\Owner1\\Downloads\\fungaldata-global",
  "\\\\192.168.0.105\\drive\\shared-drives\\MINDEX\\CREP RAW DATA\\FUNGI\\globalfungi.com",
  "\\\\192.168.0.105\\MINDEX\\CREP RAW DATA\\FUNGI\\globalfungi.com",
  path.dirname(FALLBACK_METADATA),
]

function arg(name, fallback) {
  const prefix = `--${name}=`
  const hit = process.argv.find((a) => a.startsWith(prefix))
  if (hit) return hit.slice(prefix.length)
  const i = process.argv.indexOf(`--${name}`)
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1]
  return fallback
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function parseNumber(value) {
  if (!value || value === "NA") return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function normalizeDate(year, month, day) {
  if (!year || year === "NA") return undefined
  const y = Number(year)
  if (!Number.isFinite(y)) return undefined
  const months = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  }
  const m = parseNumber(month) ?? months[String(month || "").toLowerCase()] ?? 1
  const d = parseNumber(day) ?? 1
  return `${String(y).padStart(4, "0")}-${String(Math.max(1, Math.min(12, m))).padStart(2, "0")}-${String(Math.max(1, Math.min(28, d))).padStart(2, "0")}`
}

function rowObject(headers, values) {
  const row = {}
  for (let i = 0; i < headers.length; i += 1) row[headers[i]] = values[i] ?? ""
  return row
}

function findMetadata(sourceDir) {
  const explicit = process.env.FUNGAL_ATLAS_SAMPLE_METADATA
  if (explicit && fs.existsSync(explicit)) return explicit
  const dirs = [
    sourceDir,
    process.env.FUNGAL_ATLAS_SOURCE_DIR,
    ...FALLBACK_SOURCE_DIRS,
  ].filter(Boolean)
  for (const dir of dirs) {
    const candidates = [
      path.join(dir, "GlobalFungi_5_sample_metadata.txt", "GlobalFungi_5_sample_metadata.txt"),
      path.join(dir, "GlobalFungi_5_sample_metadata.txt"),
      path.join(dir, "GlobalFungi_5_sample_metadata.tsv"),
      path.join(dir, "sample_metadata.txt"),
      path.join(dir, "sample_metadata.tsv"),
      path.join(dir, "metadata", "GlobalFungi_5_sample_metadata.txt"),
    ]
    for (const c of candidates) if (fs.existsSync(c)) return c
  }
  if (fs.existsSync(FALLBACK_METADATA)) return FALLBACK_METADATA
  return null
}

function toObservation(row, index) {
  const lat = parseNumber(row.latitude)
  const lng = parseNumber(row.longitude)
  if (lat === undefined || lng === undefined) return null
  const observedAt = normalizeDate(row.year_of_sampling_from || row.paper_year, row.month_of_sampling, row.day_of_sampling)
  const sampleType = row.sample_type || row.sample_type_specification || "fungal sample"
  const sequenceTotal = parseNumber(row.ITS_total) ?? parseNumber(row.ITS1_extracted) ?? parseNumber(row.ITS2_extracted)
  const sourceId = row.sample_ID || `globalfungi-${index}`
  return {
    source: "globalfungi",
    source_id: sourceId,
    observed_at: observedAt || new Date().toISOString(),
    observer: row.submitted_by || "GlobalFungi",
    lat,
    lng,
    taxon_name: "Fungi",
    taxon_common_name: sampleType,
    iconic_taxon_name: "Fungi",
    notes: row.paper_title || undefined,
    metadata: {
      dataset: "GlobalFungi 5 sample metadata",
      fungal_atlas_entity: "fungal_sample",
      sample_id: sourceId,
      paper_id: row.paper_ID,
      paper_year: row.paper_year,
      paper_doi: row.paper_doi,
      country: row.country,
      location: row.location,
      sample_type: sampleType,
      environment_type: row.environment_type,
      ecosystem_classification: row.ecosystem_classification,
      dominant_plant_species: row.dominant_plant_species,
      pH: row.pH,
      sample_depth: row.sample_depth,
      barcoding_region: row.barcoding_region,
      sequencing_platform: row.sequencing_platform,
      ITS1_extracted: row.ITS1_extracted,
      ITS2_extracted: row.ITS2_extracted,
      ITS_total: row.ITS_total,
      sequence_total: sequenceTotal,
      source_resolution: "GlobalFungi sample GPS; taxonomy/OTU evidence remains linked metadata unless classified.",
    },
  }
}

async function postBatch(baseUrl, batch, sourceDir) {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/mindex/ingest/fungal-atlas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "globalfungi",
      timestamp: new Date().toISOString(),
      data: batch,
      metadata: {
        ingest_job: "fungal-atlas-globalfungi",
        full_raw_import: true,
        source_dir: sourceDir,
        production_nas_url: "https://192.168.0.105/drive/shared-drives/MINDEX/CREP%20RAW%20DATA/FUNGI/globalfungi.com",
      },
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`)
  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

async function main() {
  const sourceDir = arg("source-dir", process.env.FUNGAL_ATLAS_SOURCE_DIR || FALLBACK_SOURCE_DIRS.find((dir) => fs.existsSync(dir)) || path.dirname(FALLBACK_METADATA))
  const metadata = arg("metadata", findMetadata(sourceDir))
  const baseUrl = arg("base-url", process.env.WEBSITE_BASE_URL || "http://localhost:3010")
  const batchSize = Math.max(1, Number(arg("batch-size", "500")))
  const limit = Number(arg("limit", "0"))
  const dryRun = hasFlag("dry-run")
  const checkpointPath = arg("checkpoint", path.join(process.cwd(), "var", "fungal-atlas-import-state.json"))

  if (!metadata || !fs.existsSync(metadata)) {
    throw new Error("GlobalFungi sample metadata not found. Set FUNGAL_ATLAS_SOURCE_DIR or --metadata.")
  }

  let checkpoint = { processed: 0, submitted: 0 }
  if (hasFlag("resume") && fs.existsSync(checkpointPath)) {
    checkpoint = JSON.parse(await fsp.readFile(checkpointPath, "utf8"))
  }

  await fsp.mkdir(path.dirname(checkpointPath), { recursive: true })
  const rl = readline.createInterface({ input: fs.createReadStream(metadata, { encoding: "utf8" }), crlfDelay: Infinity })
  let headers = null
  let processed = 0
  let submitted = checkpoint.submitted || 0
  let skipped = 0
  let batch = []

  for await (const line of rl) {
    if (!headers) {
      headers = line.split("\t")
      continue
    }
    if (limit > 0 && submitted >= limit) break
    processed += 1
    if (processed <= (checkpoint.processed || 0)) continue
    const obs = toObservation(rowObject(headers, line.split("\t")), processed)
    if (!obs) {
      skipped += 1
      continue
    }
    batch.push(obs)
    if (batch.length >= batchSize) {
      if (!dryRun) await postBatch(baseUrl, batch, sourceDir)
      submitted += batch.length
      await fsp.writeFile(checkpointPath, JSON.stringify({ processed, submitted, updatedAt: new Date().toISOString() }, null, 2))
      console.log(`[fungal-atlas-import] processed=${processed} submitted=${submitted} skipped=${skipped}${dryRun ? " dry-run" : ""}`)
      batch = []
    }
  }

  if (batch.length) {
    if (!dryRun) await postBatch(baseUrl, batch, sourceDir)
    submitted += batch.length
  }
  await fsp.writeFile(checkpointPath, JSON.stringify({ processed, submitted, skipped, completedAt: new Date().toISOString() }, null, 2))
  console.log(`[fungal-atlas-import] done metadata=${metadata} processed=${processed} submitted=${submitted} skipped=${skipped}${dryRun ? " dry-run" : ""}`)
}

main().catch((error) => {
  console.error(`[fungal-atlas-import] failed: ${error.message}`)
  process.exit(1)
})
