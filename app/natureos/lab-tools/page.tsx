"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  RefreshCw,
  FlaskConical,
  FileText,
  Plus,
  Search,
  Beaker,
  Calendar,
  MapPin,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"

interface LabSample {
  sampleId: string
  name: string
  species?: string
  substrateType?: string
  collectedAt: string
  location?: string
  status: string
}

interface LabProtocol {
  protocolId: string
  name: string
  description?: string
  stepCount: number
}

export default function LabToolsPage() {
  const [samples, setSamples] = useState<LabSample[]>([])
  const [protocols, setProtocols] = useState<LabProtocol[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const base = typeof window !== "undefined" ? window.location.origin : ""
      const [samplesRes, protocolsRes] = await Promise.allSettled([
        fetch(`${base}/api/natureos/lab/samples${filter ? `?filter=${encodeURIComponent(filter)}` : ""}`),
        fetch(`${base}/api/natureos/lab/protocols`),
      ])

      if (samplesRes.status === "fulfilled" && samplesRes.value.ok) {
        const d = await samplesRes.value.json()
        setSamples(Array.isArray(d) ? d : d.samples ?? d.items ?? [])
      }
      if (protocolsRes.status === "fulfilled" && protocolsRes.value.ok) {
        const d = await protocolsRes.value.json()
        setProtocols(Array.isArray(d) ? d : d.protocols ?? d.items ?? [])
      }
    } catch (error) {
      console.error("Failed to fetch lab data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [filter])

  const formatDate = (s: string) => new Date(s).toLocaleDateString()

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Lab Tools"
        text="Sample management, protocols, and experiment tracking"
      >
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </DashboardHeader>

      <div className="space-y-6">
        <Tabs defaultValue="samples">
          <TabsList>
            <TabsTrigger value="samples" className="gap-2">
              <Beaker className="h-4 w-4" />
              Samples ({samples.length})
            </TabsTrigger>
            <TabsTrigger value="protocols" className="gap-2">
              <FileText className="h-4 w-4" />
              Protocols ({protocols.length})
            </TabsTrigger>
            <TabsTrigger value="experiments" className="gap-2">
              <FlaskConical className="h-4 w-4" />
              Experiments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="samples" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter samples by name or species..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button asChild>
                <Link href="/natureos/lab-tools/register">
                  <Plus className="h-4 w-4 mr-2" />
                  Register Sample
                </Link>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lab Samples</CardTitle>
                <CardDescription>
                  Register and track specimens for analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : samples.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No samples yet</p>
                    <p className="text-sm mt-2">
                      Register your first sample to get started
                    </p>
                    <Button asChild className="mt-4">
                      <Link href="/natureos/lab-tools/register">
                        <Plus className="h-4 w-4 mr-2" />
                        Register Sample
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {samples.map((s) => (
                      <Link
                        key={s.sampleId}
                        href={`/natureos/lab-tools/samples/${s.sampleId}`}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-4 block"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{s.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {s.sampleId}
                            </Badge>
                            <Badge
                              variant={
                                s.status === "Analyzed" ? "default" : "outline"
                              }
                            >
                              {s.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                            {s.species && (
                              <span className="flex items-center gap-1">
                                <FlaskConical className="h-3 w-3" />
                                {s.species}
                              </span>
                            )}
                            {s.collectedAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(s.collectedAt)}
                              </span>
                            )}
                            {s.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {s.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="protocols" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Protocol Library</CardTitle>
                <CardDescription>
                  Step-by-step protocols for specimen processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : protocols.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No protocols configured</p>
                    <p className="text-sm mt-2">
                      Protocols are loaded from the NatureOS backend
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {protocols.map((p) => (
                      <div
                        key={p.protocolId}
                        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{p.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {p.description || "No description"}
                            </p>
                            <Badge variant="outline" className="mt-2">
                              {p.stepCount} steps
                            </Badge>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experiments" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Experiment Tracking</CardTitle>
                <CardDescription>
                  Hypothesis → Experiment → Results workflow with reproducibility
                  tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Experiment tracking coming soon</p>
                  <p className="text-sm mt-2">
                    Track hypotheses, run experiments, capture results, and
                    generate publication-ready outputs
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
