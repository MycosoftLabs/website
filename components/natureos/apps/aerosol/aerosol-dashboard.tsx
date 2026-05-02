"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface LayerState {
  loading: boolean
  status: number | null
  summary: string
  error?: string
}

const initial: LayerState = { loading: true, status: null, summary: "" }

function summarizeJson(layer: string, status: number, raw: unknown): string {
  if (status === 204) return "No content from upstream."
  if (typeof raw !== "object" || raw === null) {
    return typeof raw === "string" ? raw.slice(0, 280) : "Non-JSON or empty response."
  }
  const o = raw as Record<string, unknown>
  if (layer === "virus" || layer === "radiation") {
    return String(o.message || o.status || "Pending data source.")
  }
  if (layer === "chemicals") {
    const up = o.upstream as Record<string, unknown> | undefined
    if (!up) return "No upstream block in response."
    const co2 = up.co2_trend as { status?: number } | undefined
    const ch4 = up.methane_trend as { status?: number } | undefined
    return `CO₂ trend HTTP ${co2?.status ?? "?"}, CH₄ trend HTTP ${ch4?.status ?? "?"}.`
  }
  if (Array.isArray(raw)) return `Array length: ${raw.length}`
  if ("total" in o && typeof o.total === "number") return `total=${o.total}`
  if ("data" in o && Array.isArray(o.data)) return `data.length=${o.data.length}`
  if ("entities" in o && Array.isArray(o.entities)) return `entities.length=${o.entities.length}`
  return `Keys: ${Object.keys(o).slice(0, 8).join(", ")}${Object.keys(o).length > 8 ? "…" : ""}`
}

export function AerosolDashboard() {
  const [pollen, setPollen] = useState<LayerState>(initial)
  const [spores, setSpores] = useState<LayerState>(initial)
  const [dust, setDust] = useState<LayerState>(initial)
  const [virus, setVirus] = useState<LayerState>(initial)
  const [chemicals, setChemicals] = useState<LayerState>(initial)
  const [radiation, setRadiation] = useState<LayerState>(initial)

  useEffect(() => {
    const load = async (
      path: string,
      layer: string,
      setter: (s: LayerState) => void,
    ) => {
      setter({ loading: true, status: null, summary: "" })
      try {
        const res = await fetch(path, { cache: "no-store" })
        const status = res.status
        let body: unknown = null
        try {
          body = await res.json()
        } catch {
          body = await res.text()
        }
        setter({
          loading: false,
          status,
          summary: summarizeJson(layer, status, body),
          error: status >= 400 ? `HTTP ${status}` : undefined,
        })
      } catch (e) {
        setter({
          loading: false,
          status: null,
          summary: "",
          error: e instanceof Error ? e.message : "request_failed",
        })
      }
    }

    void load("/api/natureos/aerosol/pollen", "pollen", setPollen)
    void load("/api/natureos/aerosol/spores", "spores", setSpores)
    void load("/api/natureos/aerosol/dust", "dust", setDust)
    void load("/api/natureos/aerosol/virus", "virus", setVirus)
    void load("/api/natureos/aerosol/chemicals", "chemicals", setChemicals)
    void load("/api/natureos/aerosol/radiation", "radiation", setRadiation)
  }, [])

  const layers: { title: string; description: string; state: LayerState; badge: string }[] = [
    {
      title: "Pollen",
      description: "Unified MINDEX search proxy — biological/atmosphere-linked hits only when upstream returns data.",
      state: pollen,
      badge: "MINDEX",
    },
    {
      title: "Spores",
      description: "MINDEX observations proxy (requires API key on VM when enforced).",
      state: spores,
      badge: "MINDEX",
    },
    {
      title: "Dust & atmosphere",
      description: "MINDEX earth/map/bbox default layer `weather`; tune via Earth Simulator map.",
      state: dust,
      badge: "CREP/MINDEX",
    },
    {
      title: "Virus",
      description: "Explicit pending source — no fabricated case data.",
      state: virus,
      badge: "Pending",
    },
    {
      title: "Chemicals",
      description: "MINDEX emissions CO₂ / CH₄ trend series when NOAA path is healthy.",
      state: chemicals,
      badge: "MINDEX",
    },
    {
      title: "Radiation",
      description: "Explicit pending source — no simulated dose data.",
      state: radiation,
      badge: "Pending",
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl sm:text-2xl">Atmospheric layers</CardTitle>
          <CardDescription className="text-base">
            Each card reflects a live BFF call. Empty or error states mean “no displayable real data” — never mock rows.
          </CardDescription>
          <Button asChild variant="outline" className="mt-2 min-h-[44px] w-full sm:w-auto touch-manipulation">
            <Link href="/natureos/earth-simulator">Open Earth Simulator for full CREP globe →</Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {layers.map(({ title, description, state, badge }) => (
          <Card key={title} className="border-border/60">
            <CardHeader className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Badge variant="secondary">{badge}</Badge>
                {state.status !== null ? (
                  <Badge variant={state.status < 400 ? "default" : "destructive"}>HTTP {state.status}</Badge>
                ) : null}
              </div>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              {state.loading ? <p>Loading…</p> : null}
              {!state.loading && state.error ? (
                <p className="text-destructive">{state.error}</p>
              ) : null}
              {!state.loading && state.summary ? <p className="text-foreground">{state.summary}</p> : null}
              {!state.loading && !state.summary && !state.error ? (
                <p>No summary — check MINDEX connectivity.</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
