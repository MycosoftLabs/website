"use client"

/**
 * Species & Kingdoms View — All 9 kingdom cards (Plants, Birds, Insects, Animals,
 * Marine, Mammals, Protista, Bacteria, Archaea) for the NatureOS Species tab.
 * Uses live stats from the NatureOS data stream.
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

const EMPTY_KINGDOM_STATS: Record<
  KingdomType,
  { species: number; observations: number; images: number; co2: number; methane: number; water: number }
> = {
  plants: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  birds: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  insects: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  animals: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  marine: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  mammals: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  protista: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  bacteria: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
  archaea: { species: 0, observations: 0, images: 0, co2: 0, methane: 0, water: 0 },
}

function getKingdomProps(
  kingdom: KingdomType,
  live: KingdomData | null | undefined,
  fallback: (typeof EMPTY_KINGDOM_STATS)[KingdomType]
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
                <p className="text-sm text-amber-600">Live stats unavailable; waiting for the NatureOS data stream.</p>
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
                EMPTY_KINGDOM_STATS[kingdom]
              )}
            />
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
