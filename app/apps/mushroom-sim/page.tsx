"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, RotateCcw, Settings, Maximize2, Camera, Share2 } from "lucide-react"

export default function MushroomSimPage() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [species, setSpecies] = useState("oyster")
  const [day, setDay] = useState(0)
  const [growthStage, setGrowthStage] = useState("Spore")
  const [environment, setEnvironment] = useState({ temp: 22, humidity: 85, light: 12, substrate: "hardwood" })

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying && day < 30) {
      interval = setInterval(() => {
        setDay(d => {
          const newDay = d + 1
          if (newDay < 3) setGrowthStage("Spore Germination")
          else if (newDay < 7) setGrowthStage("Mycelium Colonization")
          else if (newDay < 14) setGrowthStage("Primordia Formation")
          else if (newDay < 21) setGrowthStage("Fruiting Body Development")
          else setGrowthStage("Mature - Ready to Harvest")
          return newDay
        })
      }, 500)
    }
    return () => clearInterval(interval)
  }, [isPlaying, day])

  const reset = () => {
    setDay(0)
    setGrowthStage("Spore")
    setIsPlaying(false)
  }

  const getMushroomSize = () => {
    if (day < 3) return 5
    if (day < 7) return 15
    if (day < 14) return 35
    if (day < 21) return 70
    return 100
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Mushroom Growth Simulator</h1>
          <p className="text-muted-foreground">Visualize mushroom growth in 3D</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Camera className="h-4 w-4 mr-2" /> Screenshot</Button>
          <Button variant="outline"><Share2 className="h-4 w-4 mr-2" /> Share</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Simulation View */}
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            <div className="h-[500px] bg-gradient-to-b from-amber-900/20 via-amber-800/10 to-amber-950/30 rounded-lg relative overflow-hidden">
              {/* Substrate */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-amber-900/50 to-transparent" />
              
              {/* Mushroom visualization */}
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-500"
                style={{ transform: `translateX(-50%) scale(${getMushroomSize() / 100})` }}>
                {/* Stem */}
                <div className="w-8 h-24 bg-gradient-to-t from-amber-100 to-white rounded-lg" />
                {/* Cap */}
                <div className="w-32 h-16 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-500 rounded-t-full -mt-4" 
                  style={{ transform: `scaleY(${0.3 + (day / 30) * 0.7})` }} />
                {/* Gills */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-28 h-2 bg-amber-200/50 rounded-full" />
              </div>

              {/* Mycelium network */}
              {day >= 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-20 opacity-50">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="absolute bg-white/30 rounded-full animate-pulse"
                      style={{
                        width: `${Math.random() * 100 + 50}px`,
                        height: "2px",
                        left: `${Math.random() * 100}%`,
                        bottom: `${Math.random() * 60}px`,
                        transform: `rotate(${Math.random() * 180}deg)`,
                        animationDelay: `${Math.random() * 2}s`
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Day counter */}
              <div className="absolute top-4 left-4">
                <Badge variant="secondary" className="text-lg px-4 py-2">Day {day}</Badge>
              </div>

              {/* Stage indicator */}
              <div className="absolute top-4 right-4">
                <Badge variant="outline" className="text-lg px-4 py-2">{growthStage}</Badge>
              </div>

              {/* Controls */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                <Button size="lg" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button size="lg" variant="outline" onClick={reset}>
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline">
                  <Maximize2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Species</label>
              <Select value={species} onValueChange={setSpecies}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oyster">Oyster Mushroom</SelectItem>
                  <SelectItem value="shiitake">Shiitake</SelectItem>
                  <SelectItem value="lions-mane">Lion's Mane</SelectItem>
                  <SelectItem value="reishi">Reishi</SelectItem>
                  <SelectItem value="maitake">Maitake</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Temperature: {environment.temp}°C</label>
              <Slider value={[environment.temp]} onValueChange={([v]) => setEnvironment({ ...environment, temp: v })} min={15} max={30} />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Humidity: {environment.humidity}%</label>
              <Slider value={[environment.humidity]} onValueChange={([v]) => setEnvironment({ ...environment, humidity: v })} min={50} max={100} />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Light: {environment.light}h/day</label>
              <Slider value={[environment.light]} onValueChange={([v]) => setEnvironment({ ...environment, light: v })} min={0} max={24} />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Substrate</label>
              <Select value={environment.substrate} onValueChange={(v) => setEnvironment({ ...environment, substrate: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hardwood">Hardwood Sawdust</SelectItem>
                  <SelectItem value="straw">Wheat Straw</SelectItem>
                  <SelectItem value="coffee">Coffee Grounds</SelectItem>
                  <SelectItem value="logs">Oak Logs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Timeline: Day {day}</label>
              <Slider value={[day]} onValueChange={([v]) => { setDay(v); setIsPlaying(false) }} min={0} max={30} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
