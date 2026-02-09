"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { env } from "@/lib/env"

type ValidationJob = {
  id?: string
  status: string
  error_message?: string
  aggregate?: Record<string, number>
  results?: Array<{ image_id?: string; sample_metrics?: Record<string, number> }>
}

export function MyceliumsegValidationPanel() {
  const [limit, setLimit] = useState(5)
  const [status, setStatus] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [job, setJob] = useState<ValidationJob | null>(null)
  const [running, setRunning] = useState(false)

  const baseUrl = (env.myceliumsegApiUrl ?? "").replace(/\/$/, "")

  async function runValidation() {
    if (!baseUrl) {
      setError("MyceliumSeg API URL not configured (NEXT_PUBLIC_MYCELIUMSEG_API_URL)")
      return
    }
    setError("")
    setStatus("Running validation…")
    setJob(null)
    setRunning(true)
    try {
      const res = await fetch(`${baseUrl}/validation/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset_slice: { limit } }),
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const data: ValidationJob = await res.json()
      setJob(data)
      setStatus(data.status === "completed" ? "Done." : `Status: ${data.status}`)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      setStatus("")
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">MyceliumSeg scientific validation</CardTitle>
        <p className="text-sm text-muted-foreground">
          One-click run: compares segmentation vs ground truth and reports IoU, F1, Boundary IoU, HD95, ASSD. Uses real data from MINDEX.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="myceliumseg-limit" className="text-sm">Sample limit</Label>
            <input
              id="myceliumseg-limit"
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 5)}
              className="h-9 w-16 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <Button onClick={runValidation} disabled={running}>
            {running ? "Running…" : "Run validation now"}
          </Button>
        </div>
        {status && <p className={`text-sm ${job?.status === "completed" ? "text-green-600 dark:text-green-400" : ""}`}>{status}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {job?.status === "failed" && job.error_message && (
          <p className="text-sm text-destructive">{job.error_message}</p>
        )}
        {job && (job.aggregate || (job.results && job.results.length > 0)) && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-sm font-medium">Aggregate metrics</h4>
            {job.aggregate && Object.keys(job.aggregate).length > 0 ? (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Metric</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(job.aggregate).map(([k, v]) => (
                    <tr key={k} className="border-b">
                      <td className="py-1.5">{k}</td>
                      <td className="py-1.5 font-mono">{v != null ? String(v) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground text-sm">No aggregate metrics.</p>
            )}
            {job.results && job.results.length > 0 && (
              <>
                <h4 className="text-sm font-medium pt-2">Per-sample ({job.results.length})</h4>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                  {job.results.map((r, i) => {
                    const sm = r.sample_metrics ?? {}
                    return (
                      <div key={i} className="text-xs rounded border px-2 py-1.5 bg-muted/30">
                        Sample {i + 1} (image {String(r.image_id ?? "").slice(0, 8)}…): IoU={sm.iou ?? "—"}, F1={sm.f1 ?? "—"}, Boundary IoU={sm.boundary_iou ?? "—"}, HD95={sm.hd95 ?? "—"}, ASSD={sm.assd ?? "—"}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
