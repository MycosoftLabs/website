"use client"

import useSWR from "swr"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MINDEXIntegrityBadge } from "./integrity-badge"

interface MINDEXLiveStatsProps {
  sampleRecordId?: string
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

export function MINDEXLiveStats({ sampleRecordId }: MINDEXLiveStatsProps) {
  const { data, error, isLoading } = useSWR("/api/natureos/mindex/stats", fetcher, { refreshInterval: 30_000 })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">MINDEX Live Stats</CardTitle>
        {sampleRecordId ? <MINDEXIntegrityBadge recordId={sampleRecordId} /> : <Badge variant="outline">Integrity: n/a</Badge>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="text-sm text-muted-foreground">Stats unavailable (requires live MINDEX).</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold">{Number(data?.total_taxa || 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Taxa indexed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{Number(data?.total_observations || 0).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Observations</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

