/**
 * Background Genetics Ingest API - Feb 2026
 *
 * POST { accessions: string[] }
 *
 * Accepts a list of accessions (or numeric GIs) and triggers MINDEX ingest
 * for each one that isn't already stored. Called fire-and-forget from search
 * results so that genetic sequences are pre-populated for every query made.
 *
 * Returns immediately with { queued: N } — actual ingestion runs async.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")
const MINDEX_GENETICS = `${MINDEX_API_URL}/api/mindex/genetics`
const NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
const NCBI_HEADERS = { "User-Agent": "Mycosoft/1.0 (mycosoft.com; dev@mycosoft.org)" }

const mindexHeaders = () => ({
  "X-API-Key": env.mindexApiKey || "",
  "Content-Type": "application/json",
})

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function parseFASTA(text: string): string {
  return text
    .split("\n")
    .filter((l) => !l.startsWith(">") && l.trim())
    .join("")
    .replace(/\s/g, "")
    .toUpperCase()
}

async function resolveUID(accessionOrGi: string): Promise<string | null> {
  if (/^\d+$/.test(accessionOrGi)) return accessionOrGi
  try {
    const res = await fetch(
      `${NCBI_BASE}/esearch.fcgi?db=nucleotide&term=${encodeURIComponent(accessionOrGi + "[Accession]")}&retmax=1&retmode=json`,
      { signal: AbortSignal.timeout(10000), headers: NCBI_HEADERS }
    )
    if (!res.ok) return null
    const d = await res.json()
    return d.esearchresult?.idlist?.[0] || null
  } catch {
    return null
  }
}

async function ingestOne(accession: string): Promise<void> {
  // Check if already in MINDEX
  try {
    const check = await fetch(
      `${MINDEX_GENETICS}/accession/${encodeURIComponent(accession)}`,
      { headers: mindexHeaders(), signal: AbortSignal.timeout(8000), cache: "no-store" }
    )
    if (check.ok) {
      // Check if it has a real sequence stored (length > 0)
      const stored = await check.json().catch(() => null)
      if (stored?.sequence_length > 0) return // Already complete — nothing to do
    }
  } catch { /* MINDEX unreachable – try NCBI anyway */ }

  // Manual NCBI fetch + store directly (ingest-accession not deployed on VM)
  try {
    const uid = await resolveUID(accession)
    if (!uid) return

    await delay(350)
    const sumRes = await fetch(
      `${NCBI_BASE}/esummary.fcgi?db=nucleotide&id=${uid}&retmode=json`,
      { signal: AbortSignal.timeout(12000), headers: NCBI_HEADERS }
    )
    if (!sumRes.ok) return
    const sumData = await sumRes.json()
    const uids: string[] = sumData.result?.uids || []
    if (!uids.length) return
    const item = sumData.result[uids[0]] || {}
    const realAccession: string = item.accessionversion || item.caption || accession

    await delay(350)
    const fastaRes = await fetch(
      `${NCBI_BASE}/efetch.fcgi?db=nucleotide&id=${uid}&rettype=fasta&retmode=text`,
      { signal: AbortSignal.timeout(45000), headers: NCBI_HEADERS }
    )
    if (!fastaRes.ok) return
    const sequence = parseFASTA(await fastaRes.text())
    if (!sequence) return

    // Store in MINDEX (POST creates; if duplicate, MINDEX returns 409 — we ignore)
    await fetch(`${MINDEX_GENETICS}`, {
      method: "POST",
      headers: mindexHeaders(),
      body: JSON.stringify({
        accession: realAccession,
        species_name: item.organism || null,
        sequence,
        sequence_type: (item.moltype || "dna").toLowerCase(),
        source: "genbank",
        source_url: `https://www.ncbi.nlm.nih.gov/nuccore/${realAccession}`,
        definition: item.title || null,
        organism: item.organism || null,
      }),
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    })
  } catch { /* ignore */ }
}

async function processInBackground(accessions: string[]) {
  for (const acc of accessions) {
    try {
      await ingestOne(acc)
      await delay(400) // NCBI polite delay between accessions
    } catch { /* never let one failure stop the rest */ }
  }
}

export async function POST(request: NextRequest) {
  let body: { accessions?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const accessions = (body.accessions || [])
    .map((a) => String(a).trim())
    .filter(Boolean)
    .slice(0, 20) // Safety cap

  if (!accessions.length) {
    return NextResponse.json({ queued: 0 })
  }

  // Fire and forget — respond immediately, process in background
  void processInBackground(accessions)

  return NextResponse.json({ queued: accessions.length, status: "processing" })
}
