/**
 * Compound Detail API - Feb 2026
 *
 * GET ?name=muscarine | ?id=mindex-cmp-123
 *
 * Lookup priority:
 *   1. MINDEX compounds by id or name (fast, in-DB)
 *   2. PubChem REST (free, no key) — returns full compound properties
 *      → then stores in MINDEX background so next lookup hits priority 1
 *
 * System-wide pattern: same auto-scrape-and-store approach as genetics/taxonomy.
 */

import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")
const MINDEX_COMPOUNDS = `${MINDEX_API_URL}/api/mindex/compounds`
const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
const PUBCHEM_HEADERS = { "User-Agent": "Mycosoft/1.0 (mycosoft.com; dev@mycosoft.org)" }

const mindexHeaders = () => ({
  "X-API-Key": env.mindexApiKey || "",
  "Content-Type": "application/json",
})

// ---------------------------------------------------------------------------
// PubChem helpers
// ---------------------------------------------------------------------------

async function fetchFromPubChem(name: string) {
  const encName = encodeURIComponent(name.trim())

  // Fetch properties
  const propsRes = await fetch(
    `${PUBCHEM_BASE}/compound/name/${encName}/property/IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,IsomericSMILES,InChI,InChIKey,XLogP,Complexity,HBondDonorCount,HBondAcceptorCount,RotatableBondCount,Charge/JSON`,
    { signal: AbortSignal.timeout(15000), headers: PUBCHEM_HEADERS }
  )
  if (!propsRes.ok) return null
  const propsData = await propsRes.json()
  const props = propsData?.PropertyTable?.Properties?.[0]
  if (!props) return null

  const cid: number = props.CID

  // Fetch description/synonyms
  let description = ""
  let synonyms: string[] = []
  try {
    const [descRes, synRes] = await Promise.allSettled([
      fetch(`${PUBCHEM_BASE}/compound/cid/${cid}/description/JSON`, {
        signal: AbortSignal.timeout(8000), headers: PUBCHEM_HEADERS
      }),
      fetch(`${PUBCHEM_BASE}/compound/cid/${cid}/synonyms/JSON`, {
        signal: AbortSignal.timeout(8000), headers: PUBCHEM_HEADERS
      }),
    ])
    if (descRes.status === "fulfilled" && descRes.value.ok) {
      const dd = await descRes.value.json()
      description = dd?.InformationList?.Information?.[1]?.Description || ""
    }
    if (synRes.status === "fulfilled" && synRes.value.ok) {
      const sd = await synRes.value.json()
      synonyms = (sd?.InformationList?.Information?.[0]?.Synonym || []).slice(0, 10)
    }
  } catch { /* non-critical */ }

  return {
    id: 0,
    name,
    cid,
    iupac_name: props.IUPACName || null,
    molecular_formula: props.MolecularFormula || null,
    molecular_weight: props.MolecularWeight || null,
    canonical_smiles: props.CanonicalSMILES || null,
    isomeric_smiles: props.IsomericSMILES || null,
    inchi: props.InChI || null,
    inchi_key: props.InChIKey || null,
    xlogp: props.XLogP ?? null,
    complexity: props.Complexity ?? null,
    h_bond_donors: props.HBondDonorCount ?? null,
    h_bond_acceptors: props.HBondAcceptorCount ?? null,
    rotatable_bonds: props.RotatableBondCount ?? null,
    charge: props.Charge ?? null,
    description: description || null,
    synonyms,
    source: "PubChem",
    source_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
    _source: "pubchem_direct",
  }
}

function storeCompoundInBackground(compound: NonNullable<Awaited<ReturnType<typeof fetchFromPubChem>>>) {
  if (!compound.name) return
  void fetch(`${MINDEX_COMPOUNDS}`, {
    method: "POST",
    headers: mindexHeaders(),
    body: JSON.stringify({
      name: compound.name,
      formula: compound.molecular_formula,
      molecular_weight: compound.molecular_weight,
      smiles: compound.canonical_smiles,
      inchi: compound.inchi,
      description: compound.description,
      source: "pubchem",
      source_url: compound.source_url,
    }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  }).catch(() => {})
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")
  const name = searchParams.get("name")

  if (!id && !name) {
    return NextResponse.json({ error: "Provide id or name" }, { status: 400 })
  }

  // ── 1. Try MINDEX ─────────────────────────────────────────────────────────
  const lookupParam = id
    ? `id=${encodeURIComponent(id.replace(/^mindex-cmp-/, ""))}`
    : `name=${encodeURIComponent(name!)}`
  try {
    const res = await fetch(`${MINDEX_COMPOUNDS}?${lookupParam}&limit=1`, {
      headers: mindexHeaders(),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    })
    if (res.ok) {
      const d = await res.json()
      const item = d?.data?.[0] || d?.[0] || d
      if (item?.name || item?.id) return NextResponse.json(item)
    }
  } catch { /* fall through */ }

  // ── 2. PubChem direct ─────────────────────────────────────────────────────
  const searchName = name || id?.replace(/^mindex-cmp-/, "") || ""
  try {
    const compound = await fetchFromPubChem(searchName)
    if (compound) {
      storeCompoundInBackground(compound)
      return NextResponse.json(compound)
    }
  } catch { /* fall through */ }

  return NextResponse.json({ error: "Compound not found" }, { status: 404 })
}
