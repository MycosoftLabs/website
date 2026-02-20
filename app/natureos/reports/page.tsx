"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, FileText, Download, Calendar } from "lucide-react"

interface ReportSummary {
  reportType: string
  generatedAt: string
  summary: Record<string, unknown>
}

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const base = typeof window !== "undefined" ? window.location.origin : ""
      const res = await fetch(`${base}/api/natureos/analytics/reports/biodiversity`)
      if (res.ok) {
        const d = await res.json()
        setReports(Array.isArray(d) ? d : [d])
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Analytics Reports"
        text="Generated reports and dashboards"
      >
        <Button variant="outline" size="sm" onClick={fetchReports} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() =>
              (window.location.href = "/api/natureos/analytics/reports/biodiversity")
            }
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Biodiversity Report
              </CardTitle>
              <CardDescription>
                Species richness and observation summary
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Generated on demand
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() =>
              (window.location.href = "/natureos/data-explorer")
            }
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Data Explorer
              </CardTitle>
              <CardDescription>
                Query and visualize data interactively
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Interactive</Badge>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() =>
              (window.location.href = "/api/natureos/export/json")
            }
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </CardTitle>
              <CardDescription>
                Export events to CSV, JSON, or FASTA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">CSV / JSON / FASTA</Badge>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription>
              Last generated analytics reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No reports generated yet</p>
                <p className="text-sm mt-2">
                  Reports are generated when you access the analytics APIs
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div>
                      <span className="font-medium">{r.reportType}</span>
                      <p className="text-sm text-muted-foreground">
                        {new Date(r.generatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {Object.entries(r.summary || {}).map(([k, v]) => (
                        <Badge key={k} variant="secondary">
                          {k}: {String(v)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
