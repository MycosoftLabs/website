"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { TrendingUp, Thermometer, Droplets, Sun, Wind, Activity, BarChart3, LineChart, Clock } from "lucide-react"

const GROWTH_DATA = {
  species: "Pleurotus ostreatus",
  currentPhase: "Fruiting",
  daysInCulture: 14,
  estimatedHarvest: 7,
  conditions: { temp: 22, humidity: 85, co2: 800, light: 12 },
  predictions: [
    { day: 1, size: 2 }, { day: 3, size: 8 }, { day: 5, size: 20 }, { day: 7, size: 45 },
    { day: 9, size: 70 }, { day: 11, size: 88 }, { day: 14, size: 100 }
  ]
}

export default function GrowthAnalyticsPage() {
  const [species, setSpecies] = useState("oyster")
  const [temp, setTemp] = useState([22])
  const [humidity, setHumidity] = useState([85])
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Growth Analytics</h1>
          <p className="text-muted-foreground">Analyze and predict mushroom growth patterns</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Activity className="h-4 w-4 mr-2" /> Live Monitoring
        </Badge>
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Current Species</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">{GROWTH_DATA.species}</div><p className="text-sm text-muted-foreground">{GROWTH_DATA.currentPhase} Phase</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Days in Culture</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{GROWTH_DATA.daysInCulture}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Harvest Estimate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-500">{GROWTH_DATA.estimatedHarvest} days</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Growth Rate</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold flex items-center"><TrendingUp className="h-5 w-5 mr-2 text-green-500" /> 12%/day</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Environment Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Environment Controls</CardTitle>
            <CardDescription>Adjust growing conditions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Thermometer className="h-4 w-4" /> Temperature: {temp[0]}°C
              </label>
              <Slider value={temp} onValueChange={setTemp} min={15} max={30} step={0.5} />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Droplets className="h-4 w-4" /> Humidity: {humidity[0]}%
              </label>
              <Slider value={humidity} onValueChange={setHumidity} min={50} max={100} step={1} />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Wind className="h-4 w-4" /> CO₂: {GROWTH_DATA.conditions.co2} ppm
              </label>
              <Slider defaultValue={[800]} min={400} max={2000} step={50} />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Sun className="h-4 w-4" /> Light: {GROWTH_DATA.conditions.light}h/day
              </label>
              <Slider defaultValue={[12]} min={0} max={24} step={1} />
            </div>
            <Button className="w-full">Apply Conditions</Button>
          </CardContent>
        </Card>

        {/* Growth Prediction Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Growth Prediction</CardTitle>
            <CardDescription>Predicted growth curve based on current conditions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {GROWTH_DATA.predictions.map((p, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary/20 rounded-t relative" style={{ height: `${p.size * 2}px` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-primary to-primary/50 rounded-t" />
                  </div>
                  <span className="text-xs text-muted-foreground">Day {p.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Species Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Species Comparison</CardTitle>
          <CardDescription>Compare growth rates across species</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={species} onValueChange={setSpecies}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select species" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="oyster">Oyster Mushroom</SelectItem>
              <SelectItem value="shiitake">Shiitake</SelectItem>
              <SelectItem value="lions-mane">Lion's Mane</SelectItem>
              <SelectItem value="reishi">Reishi</SelectItem>
              <SelectItem value="maitake">Maitake</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}
