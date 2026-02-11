import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"
import { merkleProof, merkleRoot, type MerkleProofStep } from "@/lib/mindex/crypto/merkle-tree"
import { hashLink, type MINDEXRecord } from "@/lib/mindex/crypto/hash-chain"

export const dynamic = "force-dynamic"

const MINDEX_API_URL = process.env.MINDEX_API_URL || env.mindexApiBaseUrl.replace(/\/api\/v1$/, "")

interface IntegrityDayLeavesResponse {
  date: string
  leaves: string[] // sha256:...
  root?: string // sha256:...
}

async function fetchDailyLeaves(date: string): Promise<IntegrityDayLeavesResponse> {
  const res = await fetch(`${MINDEX_API_URL}/api/mindex/integrity/days/${encodeURIComponent(date)}/leaves`, {
    headers: {
      "X-API-Key": env.mindexApiKey || "",
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Upstream MINDEX does not provide integrity day leaves endpoint (status ${res.status})`)
  }

  return res.json()
}

async function fetchRecordById(recordId: string): Promise<MINDEXRecord> {
  const res = await fetch(`${MINDEX_API_URL}/api/mindex/integrity/records/${encodeURIComponent(recordId)}`, {
    headers: {
      "X-API-Key": env.mindexApiKey || "",
    },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Upstream MINDEX does not provide integrity record endpoint (status ${res.status})`)
  }

  return res.json()
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!env.integrationsEnabled) {
    return NextResponse.json(
      {
        error: "MINDEX integration is disabled. This endpoint requires a live MINDEX backend.",
        code: "INTEGRATIONS_DISABLED",
        requiredEnv: ["INTEGRATIONS_ENABLED=true", "MINDEX_API_BASE_URL", "MINDEX_API_KEY"],
      },
      { status: 503 },
    )
  }

  const { id } = await context.params
  const leafOverride = request.nextUrl.searchParams.get("leaf")
  let date = request.nextUrl.searchParams.get("date") || undefined

  try {
    // If date is not provided, try to infer it from the record timestamp (requires upstream record endpoint).
    let leaf: string | null = leafOverride
    if (!date || !leaf) {
      const record = await fetchRecordById(id)
      if (!date) date = record.timestamp?.slice(0, 10)
      if (!date) throw new Error("Unable to infer date from record timestamp")
      if (!leaf) leaf = hashLink(record.prev_hash ?? null, record.data_hash)
    }

    if (!date) {
      return NextResponse.json(
        { error: "Missing required query param: date (YYYY-MM-DD)", code: "VALIDATION_ERROR" },
        { status: 400 },
      )
    }

    const data = await fetchDailyLeaves(date)
    const leaves = data.leaves
    const targetIndex = leaves.findIndex((h) => h === leaf)
    if (targetIndex < 0) {
      return NextResponse.json(
        { error: "Record leaf not found in daily leaves", code: "NOT_FOUND", date, leaf },
        { status: 404 },
      )
    }

    const proof: MerkleProofStep[] = merkleProof(leaves, targetIndex)
    const root = data.root || merkleRoot(leaves)

    return NextResponse.json({
      date,
      index: targetIndex,
      leaf: leaves[targetIndex],
      root,
      proof,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate Merkle proof",
        details: error instanceof Error ? error.message : String(error),
        code: "UPSTREAM_ERROR",
        info: "Ensure MINDEX API is accessible at the configured URL and provides integrity endpoints.",
      },
      { status: 503 },
    )
  }
}

