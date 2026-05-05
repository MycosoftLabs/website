"use client"

import { useEffect, useState } from "react"
import { AlertCircle, Radio } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface LedgerSsePayload {
  ts?: string
  latest?: {
    id?: string
    ch?: string
    entity_type?: string
    tier?: string
    created_at?: string
  } | null
  error?: string
}

/**
 * Subscribes to MINDEX ledger anchor tail via BFF SSE (`/api/mindex/ledger/stream`).
 * No synthetic hashes — displays the latest row from `ledger.anchor` when present.
 */
export function LiveAnchorStream() {
  const [payload, setPayload] = useState<LedgerSsePayload | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  useEffect(() => {
    const es = new EventSource("/api/mindex/ledger/stream")
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LedgerSsePayload
        setPayload(data)
        setConnectionError(null)
      } catch {
        setConnectionError("Invalid SSE payload")
      }
    }
    es.onerror = () => {
      setConnectionError("SSE connection interrupted — check MINDEX API and BFF auth headers")
      es.close()
    }
    return () => es.close()
  }, [])

  const latest = payload?.latest

  return (
    <div className="space-y-3 min-h-[120px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
          <span>Ledger anchor stream</span>
        </div>
        <Badge className="bg-cyan-500/15 text-cyan-200 border-cyan-500/30 text-xs">SSE</Badge>
      </div>

      {payload?.error ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{payload.error}</span>
        </div>
      ) : null}

      {connectionError ? (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{connectionError}</span>
        </div>
      ) : null}

      {latest ? (
        <dl className="grid grid-cols-1 gap-2 text-sm font-mono text-gray-200 sm:grid-cols-2">
          <div>
            <dt className="text-gray-500 text-xs uppercase tracking-wide">Anchor id</dt>
            <dd className="truncate">{latest.id}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs uppercase tracking-wide">Content hash</dt>
            <dd className="truncate text-cyan-300">{latest.ch}</dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs uppercase tracking-wide">Entity</dt>
            <dd>
              {latest.entity_type} · {latest.created_at ? new Date(String(latest.created_at)).toLocaleString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 text-xs uppercase tracking-wide">Tier</dt>
            <dd>{latest.tier || "—"}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-gray-500">
          {payload?.ts
            ? "Connected — waiting for anchors in ledger.anchor (empty database shows no rows)."
            : "Connecting to MINDEX…"}
        </p>
      )}
    </div>
  )
}
