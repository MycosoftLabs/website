"use client"

/**
 * Species & Kingdoms View — All 9 kingdom cards (Plants, Birds, Insects, Animals,
 * Marine, Mammals, Protista, Bacteria, Archaea) for the NatureOS Species tab.
 * Uses live stats when available; fallback defaults so every card always shows.
 * Created: Feb 19, 2026
 */

import { useLiveStats, type LiveStats, type KingdomData } from "@/hooks/use-live-stats"
import { KingdomStatCard, type KingdomType } from "@/components/widgets/kingdom-stat-card"
import { DashboardHeader } from "@/components/dashboard/header"
import { DashboardShell } from "@/components/dashboard/shell"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

const KINGDOMS: KingdomType[] = [
  "plants",
  "birds",
  "insects",
  "animals",
  "marine",
  "mammals",
  "protista",
  "bacteria",
  "archaea",
]

// Fallback environmental and counts per kingdom when live API has no data (so all cards always render)
const FALLBACKS: Record<
  KingdomType,
  { species: number; observations: number; images: number; co2: number; methane: number; water: number }
> = {
  plants: { species: 341000, observations: 54000000, images: 12000000, co2: -458000000, methane: 650000, water: 62000000 },
  birds: { species: 11000, observations: 89000000, images: 24000000, co2: 890000, methane: 1200, water: 150 },
  insects: { species: 1000000, observations: 42000000, images: 8500000, co2: 480000, methane: 12500, water: 82 },
  animals: { species: 72000, observations: 31000000, images: 18000000, co2: 2150000, methane: 8800, water: 45000 },
  marine: { species: 240000, observations: 68000000, images: 22000000, co2: -9500000, methane: 38000, water: 0 },
  mammals: { species: 6500, observations: 19000000, images: 11000000, co2: 5200000, methane: 329000, water: 95800 },
  protista: { species: 60000, observations: 8200000, images: 1200000, co2: -15000000, methane: 45000, water: 12000 },
  bacteria: { species: 12000, observations: 4500000, images: 980000, co2: 85000000, methane: 580000, water: 0 },
  archaea: { species: 400, observations: 120000, images: 45000, co2: 12000000, methane: 420000, water: 0 },
}

function getKingdomProps(
  kingdom: KingdomType,
  live: KingdomData | null | undefined,
  fallback: (typeof FALLBACKS)[KingdomType]
) {
  return {
    kingdom,
    species: live?.species?.total ?? fallback.species,
    observations: live?.observations?.total ?? fallback.observations,
    images: live?.images?.total ?? fallback.images,
    speciesDelta: live?.species?.delta ?? 0,
    observationsDelta: live?.observations?.delta ?? 0,
    imagesDelta: live?.images?.delta ?? 0,
    co2: live?.environmental?.co2 ?? fallback.co2,
    methane: live?.environmental?.methane ?? fallback.methane,
    water: live?.environmental?.water ?? fallback.water,
    co2Delta: live?.environmental?.co2Delta ?? 0,
    methaneDelta: live?.environmental?.methaneDelta ?? 0,
    waterDelta: live?.environmental?.waterDelta ?? 0,
  }
}

function getLiveKingdom(stats: LiveStats | null, kingdom: KingdomType): KingdomData | null | undefined {
  if (!stats) return null
  return stats[kingdom] ?? null
}

export function SpeciesKingdomsView() {
  const { stats: liveStats, loading: isLoading, error, refresh } = useLiveStats({ refreshInterval: 30000 })

  return (
    <DashboardShell>
      <DashboardHeader
        heading="Species & Kingdoms"
        text="All life: plants, birds, insects, animals, marine, mammals, protista, bacteria, archaea."
      />
      <div className="space-y-4">
        {(error || isLoading) && (
          <Card>
            <CardContent className="flex flex-row items-center justify-between gap-4 py-4">
              {isLoading && (
                <p className="text-sm text-muted-foreground">Loading live species data…</p>
              )}
              {error && (
                <p className="text-sm text-amber-600">Live stats unavailable; showing catalog defaults.</p>
              )}
              <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {KINGDOMS.map((kingdom) => (
            <KingdomStatCard
              key={kingdom}
              {...getKingdomProps(
                kingdom,
                getLiveKingdom(liveStats ?? null, kingdom),
                FALLBACKS[kingdom]
              )}
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
