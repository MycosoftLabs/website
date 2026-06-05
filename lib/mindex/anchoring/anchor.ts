export interface AnchorRequest {
  record_ids: string[]
  ledger: "hypergraph" | "solana" | "bitcoin"
}

export interface AnchorResult {
  ok: boolean
  ledger: AnchorRequest["ledger"]
  tx_id?: string
  message?: string
  results?: Array<{ ok: boolean; record_id: string; tx_id?: string; message?: string }>
}

/**
 * Anchor MINDEX integrity records via NatureOS BFF → MINDEX API (no separate HYPERGRAPH_ANCHOR_URL env).
 */
export async function anchorRecords(request: AnchorRequest): Promise<AnchorResult> {
  const res = await fetch("/api/natureos/mindex/ledger/anchor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(60_000),
    cache: "no-store",
  })

  const data = (await res.json()) as AnchorResult & { error?: string }
  if (!res.ok) {
    return {
      ok: false,
      ledger: request.ledger,
      message: data?.message || data?.error || `Anchor failed: HTTP ${res.status}`,
      results: data?.results,
    }
  }

  return {
    ok: Boolean(data.ok),
    ledger: request.ledger,
    tx_id: data.tx_id,
    message: data.message,
    results: data.results,
  }
}
