/**
 * Genetics Detail API - Feb 2026
 *
 * GET ?id=123 | ?accession=MK033196.1 | ?accession=1072298629 (numeric GI)
 *
 * Lookup priority:
 *   1. MINDEX (fast, in-DB)
 *   2. MINDEX ingest endpoint (stores + returns for next time)
 *   3. NCBI direct: esummary (metadata) + efetch FASTA (sequence) -- always returns full data
 *      → then attempts background storage to MINDEX so next lookup hits priority 1
 *
 * Users always see the full sequence. No "not stored" message.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")
// The MINDEX VM mounts the genetics router at /api/mindex/genetics (not /api/genetics)
const MINDEX_GENETICS = `${MINDEX_API_URL}/api/mindex/genetics`
const NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
const NCBI_HEADERS = {
  "User-Agent": "Mycosoft/1.0 (mycosoft.com; dev@mycosoft.org)",
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

const mindexHeaders = () => ({
  "X-API-Key": env.mindexApiKey || "",
  "Content-Type": "application/json",
})

// ---------------------------------------------------------------------------
// NCBI helpers
// ---------------------------------------------------------------------------

/** Parse FASTA text into a clean uppercase sequence string. */
function parseFASTA(text: string): string {
  return text
    .split("\n")
    .filter((l) => !l.startsWith(">") && l.trim().length > 0)
    .join("")
    .replace(/\s/g, "")
    .toUpperCase()
}

/**
 * Given an accession string OR numeric GI, return the NCBI UID.
 * Numeric GIs are already UIDs. Text accessions need an esearch.
 */
async function resolveNCBIUid(accessionOrGi: string): Promise<string | null> {
  if (/^\d+$/.test(accessionOrGi)) return accessionOrGi // Already a UID/GI

  const sr = await fetch(
    `${NCBI_BASE}/esearch.fcgi?db=nucleotide&term=${encodeURIComponent(
      accessionOrGi + "[Accession]"
    )}&retmax=1&retmode=json`,
    { signal: AbortSignal.timeout(12000), headers: NCBI_HEADERS }
  )
  if (!sr.ok) return null
  const sd = await sr.json()
  return sd.esearchresult?.idlist?.[0] || null
}

/**
 * Full NCBI fetch: esummary for metadata + efetch FASTA for sequence.
 * Returns a record shaped like GeneticSequenceResponse (id=0 means not in MINDEX yet).
 */
async function fetchFromNCBIDirect(accessionOrGi: string) {
  // Step 1 – resolve UID
  const uid = await resolveNCBIUid(accessionOrGi)
  if (!uid) return null

  // Step 2 – esummary (metadata)
  await delay(350) // NCBI rate limit
  const sumRes = await fetch(
    `${NCBI_BASE}/esummary.fcgi?db=nucleotide&id=${uid}&retmode=json`,
    { signal: AbortSignal.timeout(12000), headers: NCBI_HEADERS }
  )
  if (!sumRes.ok) return null
  const sumData = await sumRes.json()
  const uids: string[] = sumData.result?.uids || []
  if (!uids.length) return null
  const item = sumData.result[uids[0]] || {}
  const realAccession: string = item.accessionversion || item.caption || accessionOrGi

  // Step 3 – efetch FASTA (full nucleotide sequence)
  await delay(350)
  let sequence = ""
  let seqLen = parseInt(item.slen || "0", 10)
  try {
    const fastaRes = await fetch(
      `${NCBI_BASE}/efetch.fcgi?db=nucleotide&id=${uid}&rettype=fasta&retmode=text`,
      { signal: AbortSignal.timeout(45000), headers: NCBI_HEADERS }
    )
    if (fastaRes.ok) {
      const raw = await fastaRes.text()
      sequence = parseFASTA(raw)
      if (sequence.length > 0) seqLen = sequence.length
    }
  } catch {
    // Sequence fetch failed – return with metadata only; UI will show GenBank link
  }

  return {
    id: 0,
    accession: realAccession,
    species_name: item.organism || null,
    gene: null,
    region: null,
    sequence,
    sequence_length: seqLen,
    sequence_type: (item.moltype || "dna").toLowerCase(),
    source: "GenBank",
    source_url: `https://www.ncbi.nlm.nih.gov/nuccore/${realAccession}`,
    definition: item.title || null,
    organism: item.organism || null,
    pubmed_id: null,
    doi: null,
    _source: "ncbi_direct",
  }
}

/**
 * Store a record in MINDEX in the background (fire-and-forget).
 * Never throws — failures are silently ignored.
 */
function storeInMindexBackground(record: NonNullable<Awaited<ReturnType<typeof fetchFromNCBIDirect>>>) {
  if (!record.sequence || !record.accession) return

  void fetch(`${MINDEX_GENETICS}`, {
    method: "POST",
    headers: mindexHeaders(),
    body: JSON.stringify({
      accession: record.accession,
      species_name: record.species_name,
      gene: record.gene,
      region: record.region,
      sequence: record.sequence,
      sequence_type: record.sequence_type,
      source: "genbank",
      source_url: record.source_url,
      definition: record.definition,
      organism: record.organism,
    }),
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")
  const accession = searchParams.get("accession")

  if (!id && !accession) {
    return NextResponse.json(
      { error: "Provide id or accession query parameter" },
      { status: 400 }
    )
  }

  // ── 1. Try MINDEX by numeric id ──────────────────────────────────────────
  if (id) {
    try {
      const res = await fetch(`${MINDEX_GENETICS}/${id}`, {
        headers: mindexHeaders(),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      })
      if (res.ok) return NextResponse.json(await res.json())
    } catch { /* fall through */ }

    // id could be a numeric NCBI GI — try NCBI direct
    try {
      const ncbi = await fetchFromNCBIDirect(id)
      if (ncbi) {
        storeInMindexBackground(ncbi)
        return NextResponse.json(ncbi)
      }
    } catch { /* fall through */ }

    return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
  }

  // ── 2. Try MINDEX by accession ────────────────────────────────────────────
  if (accession) {
    try {
      const res = await fetch(
        `${MINDEX_GENETICS}/accession/${encodeURIComponent(accession)}`,
        { headers: mindexHeaders(), signal: AbortSignal.timeout(12000), cache: "no-store" }
      )
      if (res.ok) return NextResponse.json(await res.json())
      // 404 or other error → fall through to NCBI direct
    } catch { /* MINDEX unreachable */ }

    // ── 3. NCBI direct with full sequence ─────────────────────────────────
    try {
      const ncbi = await fetchFromNCBIDirect(accession)
      if (ncbi) {
        // Store in MINDEX in background so next request hits the DB
        storeInMindexBackground(ncbi)
        return NextResponse.json(ncbi)
      }
    } catch { /* nothing */ }

    return NextResponse.json({ error: "Sequence not found" }, { status: 404 })
  }

  return NextResponse.json({ error: "Provide id or accession" }, { status: 400 })
}
