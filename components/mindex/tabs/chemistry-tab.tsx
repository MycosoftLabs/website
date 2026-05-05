"use client"

import { useCallback, useEffect, useState } from "react"
import { Beaker, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GlassCard } from "@/components/ui/glowing-border"

interface CompoundRow {
  id: string
  name: string
  formula?: string | null
  inchikey?: string | null
  chemical_class?: string | null
}

interface CompoundListPayload {
  data?: CompoundRow[]
  total?: number
  limit?: number
  offset?: number
}

export function ChemistrySection() {
  const [rows, setRows] = useState<CompoundRow[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/mindex/compounds?limit=40&offset=0", { cache: "no-store" })
      if (!res.ok) {
        setRows([])
        setTotal(null)
        setError(`HTTP ${res.status}`)
        return
      }
      const body = (await res.json()) as CompoundListPayload
      setRows(Array.isArray(body.data) ? body.data : [])
      setTotal(typeof body.total === "number" ? body.total : null)
    } catch (e) {
      setRows([])
      setTotal(null)
      setError(e instanceof Error ? e.message : "fetch_failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-6">
      <GlassCard color="green">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Beaker className="h-5 w-5 text-lime-400" />
              Compound explorer
            </h3>
            <p className="text-sm text-gray-400">
              Live list from MINDEX <span className="font-mono text-gray-300">GET /api/mindex/compounds</span> via site BFF.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
            className="min-h-[44px] border-lime-500/40 text-lime-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error ? (
          <p className="text-sm text-amber-300">
            No compound data available ({error}). Confirm MINDEX API and migration 0031 on VM 189.
          </p>
        ) : null}

        {!error && !loading && rows.length === 0 ? (
          <p className="text-sm text-gray-400">No compounds returned — database may be empty for this filter.</p>
        ) : null}

        <ScrollArea className="h-[min(60vh,520px)] rounded-md border border-white/10">
          <ul className="divide-y divide-white/10">
            {rows.map((c) => (
              <li key={String(c.id)} className="px-4 py-3 hover:bg-white/5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base text-white font-medium">{c.name}</p>
                    <p className="text-sm text-gray-400 font-mono break-all">{c.inchikey || "—"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {c.formula ? (
                      <Badge variant="outline" className="border-cyan-500/40 text-cyan-200">
                        {c.formula}
                      </Badge>
                    ) : null}
                    {c.chemical_class ? (
                      <Badge variant="outline" className="border-purple-500/40 text-purple-200">
                        {c.chemical_class}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>

        {total != null ? (
          <p className="text-xs text-gray-500 mt-2">Total in index (reported): {total.toLocaleString()}</p>
        ) : null}
      </GlassCard>
    </div>
  )
}
