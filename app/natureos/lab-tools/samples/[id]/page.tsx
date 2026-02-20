"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, MapPin, FlaskConical, Loader2 } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"

interface LabSample {
  sampleId: string
  name: string
  species?: string
  substrateType?: string
  collectedAt?: string
  location?: string
  status?: string
}

export default function SampleDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [sample, setSample] = useState<LabSample | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const base = typeof window !== "undefined" ? window.location.origin : ""
    fetch(`${base}/api/natureos/lab/samples/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Sample not found" : "Failed to load")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setSample(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Sample" text="Loading…" />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardShell>
    )
  }

  if (error || !sample) {
    return (
      <DashboardShell>
        <DashboardHeader heading="Sample" text={error || "Not found"} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              {error || "Sample not found. The NatureOS backend may be unavailable."}
            </p>
            <Link
              href="/natureos/lab-tools"
              className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lab Tools
            </Link>
          </CardContent>
        </Card>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <DashboardHeader
        heading={sample.name || "Sample"}
        text={sample.sampleId}
      >
        <Link
          href="/natureos/lab-tools"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lab Tools
        </Link>
      </DashboardHeader>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{sample.sampleId}</Badge>
              {sample.status && (
                <Badge variant="outline">{sample.status}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sample.species && (
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Species:</span>
                <span>{sample.species}</span>
              </div>
            )}
            {sample.substrateType && (
              <div>
                <span className="font-medium">Substrate:</span>{" "}
                {sample.substrateType}
              </div>
            )}
            {sample.collectedAt && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Collected:{" "}
                  {new Date(sample.collectedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {sample.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{sample.location}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
