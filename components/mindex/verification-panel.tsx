"use client"

import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface MINDEXVerificationPanelProps {
  recordId: string
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

export function MINDEXVerificationPanel({ recordId }: MINDEXVerificationPanelProps) {
  const { data, error, isLoading } = useSWR(`/api/mindex/integrity/proof/${encodeURIComponent(recordId)}`, fetcher)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Verification Proof</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading proof…</div>
        ) : error ? (
          <div className="text-sm text-muted-foreground">Proof unavailable (requires MINDEX integrity endpoints).</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">date: {data?.date}</Badge>
              <Badge variant="outline">index: {data?.index}</Badge>
              <Badge variant="outline">steps: {Array.isArray(data?.proof) ? data.proof.length : 0}</Badge>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <div className="text-muted-foreground">root</div>
                <div className="font-mono break-all">{data?.root}</div>
              </div>
              <div>
                <div className="text-muted-foreground">leaf</div>
                <div className="font-mono break-all">{data?.leaf}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

