"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Share2 } from "lucide-react"

interface SporeInfoPanelProps {
  selectedRegion: string | null
}

// Sample spore data for different regions
const regionData = {
  "SporeBase Alpha": {
    location: "San Francisco, USA",
    sporeCount: 1245,
    dominantSpecies: ["Agaricus bisporus", "Pleurotus ostreatus"],
    lastUpdated: "2 minutes ago",
    trend: "increasing",
    windSpeed: "12 mph",
    windDirection: "NW",
    humidity: "68%",
  },
  "SporeBase Beta": {
    location: "New York, USA",
    sporeCount: 987,
    dominantSpecies: ["Trametes versicolor", "Ganoderma lucidum"],
    lastUpdated: "5 minutes ago",
    trend: "stable",
    windSpeed: "8 mph",
    windDirection: "SE",
    humidity: "72%",
  },
  "SporeBase Gamma": {
    location: "London, UK",
    sporeCount: 1532,
    dominantSpecies: ["Amanita muscaria", "Boletus edulis"],
    lastUpdated: "3 minutes ago",
    trend: "decreasing",
    windSpeed: "15 mph",
    windDirection: "SW",
    humidity: "81%",
  },
  "SporeBase Delta": {
    location: "Tokyo, Japan",
    sporeCount: 2103,
    dominantSpecies: ["Lentinula edodes", "Grifola frondosa"],
    lastUpdated: "1 minute ago",
    trend: "increasing",
    windSpeed: "6 mph",
    windDirection: "E",
    humidity: "65%",
  },
}

export function SporeInfoPanel({ selectedRegion }: SporeInfoPanelProps) {
  const regionInfo = selectedRegion ? regionData[selectedRegion as keyof typeof regionData] : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Spore Data</CardTitle>
      </CardHeader>
      <CardContent>
        {selectedRegion && regionInfo ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{selectedRegion}</h3>
              <p className="text-sm text-muted-foreground">{regionInfo.location}</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Spore Count:</span>
                <span className="font-medium">{regionInfo.sporeCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Trend:</span>
                <Badge
                  variant={
                    regionInfo.trend === "increasing"
                      ? "default"
                      : regionInfo.trend === "decreasing"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {regionInfo.trend}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Wind:</span>
                <span className="font-medium">
                  {regionInfo.windSpeed} {regionInfo.windDirection}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Humidity:</span>
                <span className="font-medium">{regionInfo.humidity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Last Updated:</span>
                <span className="text-xs text-muted-foreground">{regionInfo.lastUpdated}</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Dominant Species:</h4>
              <div className="space-y-1">
                {regionInfo.dominantSpecies.map((species) => (
                  <div key={species} className="text-xs bg-muted p-1 rounded">
                    {species}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Select a spore detector on the map to view detailed information.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
