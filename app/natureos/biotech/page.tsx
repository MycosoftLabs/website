"use client"

import { useEffect, useState } from "react"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Beaker,
  Dna,
  Database,
  ExternalLink,
  RefreshCw,
  TestTube2,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

interface CompoundsSummary {
  count: number
  source: string
}

export default function BiotechToolsPage() {
  const [compounds, setCompounds] = useState<CompoundsSummary | null>(null)

  useEffect(() => {
    const base = typeof window !== "undefined" ? window.location.origin : ""
    fetch(`${base}/api/natureos/mindex/compounds`)
      .then((res) => res.json())
      .then((data) =>
        setCompounds({
          count: data.count ?? (data.compounds?.length ?? 0),
          source: data.source ?? "unknown",
        })
      )
      .catch(() => setCompounds({ count: 0, source: "error" }))
  }, [])

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Biotech Tools"
        text="Compound discovery, genomics, and molecular analysis"
      />

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5" />
                Compound Discovery
              </CardTitle>
              <CardDescription>
                Secondary metabolite prediction, molecular structure
                visualization, bioactivity scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {compounds?.count ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Compounds in MINDEX
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/natureos/mindex">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Browse
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Roadmap: RDKit integration, PubChem lookup, patent search
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dna className="h-5 w-5" />
                Genomics
              </CardTitle>
              <CardDescription>
                Sequence alignment, phylogenetic trees, variant calling, gene
                expression
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/natureos/genetics">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Genetics Explorer
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Roadmap: BLAST integration, phylogenetic tree builder
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Integrations
            </CardTitle>
            <CardDescription>
              Data sources and analysis pipelines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Database className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">MINDEX</p>
                  <p className="text-sm text-muted-foreground">
                    Taxa, compounds, genomes, observations
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Beaker className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Lab Tools</p>
                  <p className="text-sm text-muted-foreground">
                    Sample management, protocols
                  </p>
                  <Link
                    href="/natureos/lab-tools"
                    className="text-sm text-primary hover:underline"
                  >
                    Open Lab Tools →
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
