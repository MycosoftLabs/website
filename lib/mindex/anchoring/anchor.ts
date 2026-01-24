export interface AnchorRequest {
  record_ids: string[]
  ledger: "hypergraph" | "solana" | "bitcoin"
}

export interface AnchorResult {
  ok: boolean
  ledger: AnchorRequest["ledger"]
  tx_id?: string
  message?: string
}

export async function anchorRecords(request: AnchorRequest): Promise<AnchorResult> {
  const ledgerUrl =
    request.ledger === "hypergraph"
      ? process.env.HYPERGRAPH_ANCHOR_URL
      : request.ledger === "solana"
        ? process.env.SOLANA_ANCHOR_URL
        : process.env.BITCOIN_ORDINALS_ANCHOR_URL

  if (!ledgerUrl) {
    return {
      ok: false,
      ledger: request.ledger,
      message: `Anchoring is not configured. Set ${request.ledger.toUpperCase()} anchor URL environment variables.`,
    }
  }

  const res = await fetch(ledgerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  })

  if (!res.ok) {
    return { ok: false, ledger: request.ledger, message: `Ledger anchor failed: ${res.status}` }
  }

  const data = (await res.json()) as AnchorResult
  return { ...data, ledger: request.ledger }
}

