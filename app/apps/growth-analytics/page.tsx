"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  TrendingUp, Thermometer, Droplets, Sun, Wind, Activity, BarChart3, 
  LineChart, Clock, Database, Brain, Zap, CheckCircle2, AlertCircle,
  Leaf, Target, Calendar, Scale, RefreshCw, Info, AlertTriangle,
  ArrowUp, ArrowDown, Minus
} from "lucide-react"

interface SpeciesInfo {
  id: string
  name: string
  optimalTemp: number
  optimalHumidity: number
  incubationDays: number
  fruitingDays: number
  yieldPerKg: number
}

interface GrowthPrediction {
  species: {
    id: string
    name: string
    parameters: any
  }
  conditions: {
    current: any
    factors: {
      temperature: { value: number; score: number }
      humidity: { value: number; score: number }
      co2: { value: number; score: number }
      light: { value: number; score: number }
    }
    overallEfficiency: number
  }
  predictions: {
    growthCurve: { day: number; biomass: number; growthRate: number; phase: string }[]
    currentPhase: string
    daysToHarvest: number
    harvestDate: string
    yield: {
      expectedYield: number
      minYield: number
      maxYield: number
      confidence: number
    }
    successProbability: number
    flushesExpected: number
    totalYieldPotential: number
  }
  recommendations: {
    parameter: string
    current: number
    optimal: number
    action: string
    priority: "high" | "medium" | "low"
  }[]
  algorithm: {
    model: string
    version: string
    confidence: number
  }
}

export function GrowthAnalyticsContent() {
  // Species selection
  const [speciesList, setSpeciesList] = useState<SpeciesInfo[]>([])
  const [selectedSpecies, setSelectedSpecies] = useState("oyster")
  
  // Environment controls
  const [temp, setTemp] = useState([22])
  const [humidity, setHumidity] = useState([85])
  const [co2, setCo2] = useState([800])
  const [light, setLight] = useState([12])
  const [substrateKg, setSubstrateKg] = useState([5])
  const [currentDay, setCurrentDay] = useState([1])
  
  // Predictions
  const [prediction, setPrediction] = useState<GrowthPrediction | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [autoUpdate, setAutoUpdate] = useState(true)
  
  // MINDEX connection
  const [mindexConnected, setMindexConnected] = useState(false)
  const [mindexSpeciesCount, setMindexSpeciesCount] = useState(0)

  // Fetch available species from API
  useEffect(() => {
    async function fetchSpecies() {
      try {
        const response = await fetch("/api/growth/predict")
        if (response.ok) {
          const data = await response.json()
          setSpeciesList(data.species || [])
        }
      } catch (error) {
        console.error("Failed to fetch species:", error)
      }
    }
    fetchSpecies()
  }, [])

  // Check MINDEX connection
  useEffect(() => {
    async function checkMINDEX() {
      try {
        const response = await fetch("/api/natureos/mindex/stats")
        if (response.ok) {
          const data = await response.json()
          setMindexConnected(true)
          setMindexSpeciesCount(data.total_taxa || 0)
        }
      } catch {
        setMindexConnected(false)
      }
    }
    checkMINDEX()
  }, [])

  // Run prediction
  const runPrediction = useCallback(async () => {
    setAnalyzing(true)
    try {
      const response = await fetch("/api/growth/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          species: selectedSpecies,
          currentConditions: {
            temp: temp[0],
            humidity: humidity[0],
            co2: co2[0],
            light: light[0],
          },
          substrateKg: substrateKg[0],
          currentDay: currentDay[0],
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setPrediction(data)
      }
    } catch (error) {
      console.error("Prediction failed:", error)
    } finally {
      setAnalyzing(false)
    }
  }, [selectedSpecies, temp, humidity, co2, light, substrateKg, currentDay])

  // Auto-update predictions when conditions change
  useEffect(() => {
    if (autoUpdate) {
      const timer = setTimeout(() => {
        runPrediction()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [temp, humidity, co2, light, substrateKg, currentDay, selectedSpecies, autoUpdate, runPrediction])

  // Initial prediction
  useEffect(() => {
    runPrediction()
  }, [])

  const getFactorColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 50) return "text-yellow-500"
    return "text-red-500"
  }

  const getFactorIcon = (score: number) => {
    if (score >= 80) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (score >= 50) return <Minus className="h-4 w-4 text-yellow-500" />
    return <ArrowDown className="h-4 w-4 text-red-500" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8 text-green-600" />
            Growth Analytics
          </h1>
          <p className="text-muted-foreground">
            ML-powered mushroom growth prediction using Monod-Cardinal models
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/natureos/mindex">
              <Database className="h-4 w-4 mr-2" />
              MINDEX
              {mindexConnected ? (
                <Badge variant="outline" className="ml-2 text-green-500 border-green-500">
                  {mindexSpeciesCount.toLocaleString()}
                </Badge>
              ) : (
                <AlertCircle className="h-3 w-3 ml-2 text-yellow-500" />
              )}
            </Link>
          </Button>
          <Button onClick={runPrediction} disabled={analyzing}>
            {analyzing ? (
              <>
                <Brain className="h-4 w-4 mr-2 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Run Prediction
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Algorithm Info */}
      {prediction && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6 text-green-600" />
                <div>
                  <div className="font-semibold">{prediction.algorithm.model}</div>
                  <div className="text-sm text-muted-foreground">
                    v{prediction.algorithm.version} • {prediction.algorithm.confidence}% confidence
                  </div>
                </div>
              </div>
              <Badge variant={prediction.predictions.successProbability > 70 ? "default" : "secondary"}>
                {prediction.predictions.successProbability}% Success Probability
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {prediction && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Leaf className="h-4 w-4" /> Species
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{prediction.species.name}</div>
              <p className="text-xs text-muted-foreground">{prediction.predictions.currentPhase} phase</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" /> Days to Harvest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{prediction.predictions.daysToHarvest}</div>
              <p className="text-xs text-muted-foreground">{prediction.predictions.harvestDate}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4" /> Expected Yield
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prediction.predictions.yield.expectedYield}g</div>
              <p className="text-xs text-muted-foreground">
                {prediction.predictions.yield.minYield}-{prediction.predictions.yield.maxYield}g range
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" /> Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prediction.conditions.overallEfficiency}%</div>
              <Progress value={prediction.conditions.overallEfficiency} className="mt-1" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Total Potential
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prediction.predictions.totalYieldPotential}g</div>
              <p className="text-xs text-muted-foreground">
                {prediction.predictions.flushesExpected} flushes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Environment Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Environment Controls
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setAutoUpdate(!autoUpdate)}
              >
                <RefreshCw className={`h-4 w-4 ${autoUpdate ? "text-green-500" : ""}`} />
              </Button>
            </CardTitle>
            <CardDescription>Adjust growing conditions for prediction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Species Selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Species</label>
              <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                <SelectTrigger>
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  {speciesList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4" /> Temperature
                </span>
                <span className={prediction ? getFactorColor(prediction.conditions.factors.temperature.score) : ""}>
                  {temp[0]}°C
                </span>
              </label>
              <Slider value={temp} onValueChange={setTemp} min={10} max={35} step={0.5} />
            </div>

            <div>
              <label className="text-sm font-medium flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" /> Humidity
                </span>
                <span className={prediction ? getFactorColor(prediction.conditions.factors.humidity.score) : ""}>
                  {humidity[0]}%
                </span>
              </label>
              <Slider value={humidity} onValueChange={setHumidity} min={40} max={100} step={1} />
            </div>

            <div>
              <label className="text-sm font-medium flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <Wind className="h-4 w-4" /> CO₂
                </span>
                <span className={prediction ? getFactorColor(prediction.conditions.factors.co2.score) : ""}>
                  {co2[0]} ppm
                </span>
              </label>
              <Slider value={co2} onValueChange={setCo2} min={300} max={5000} step={50} />
            </div>

            <div>
              <label className="text-sm font-medium flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <Sun className="h-4 w-4" /> Light
                </span>
                <span className={prediction ? getFactorColor(prediction.conditions.factors.light.score) : ""}>
                  {light[0]}h/day
                </span>
              </label>
              <Slider value={light} onValueChange={setLight} min={0} max={24} step={1} />
            </div>

            <div>
              <label className="text-sm font-medium flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <Scale className="h-4 w-4" /> Substrate
                </span>
                <span>{substrateKg[0]} kg</span>
              </label>
              <Slider value={substrateKg} onValueChange={setSubstrateKg} min={1} max={50} step={1} />
            </div>

            <div>
              <label className="text-sm font-medium flex items-center justify-between mb-2">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Current Day
                </span>
                <span>Day {currentDay[0]}</span>
              </label>
              <Slider value={currentDay} onValueChange={setCurrentDay} min={1} max={120} step={1} />
            </div>
          </CardContent>
        </Card>

        {/* Growth Curve & Factors */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Growth Prediction Curve</CardTitle>
            <CardDescription>Predicted biomass accumulation over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="curve">
              <TabsList className="mb-4">
                <TabsTrigger value="curve">Growth Curve</TabsTrigger>
                <TabsTrigger value="factors">Growth Factors</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>

              <TabsContent value="curve">
                {prediction && (
                  <div className="h-64 flex items-end gap-1">
                    {prediction.predictions.growthCurve.map((p, i) => (
                      <div 
                        key={i} 
                        className="flex-1 flex flex-col items-center gap-1"
                        title={`Day ${p.day}: ${p.biomass.toFixed(1)}% biomass (${p.phase})`}
                      >
                        <div 
                          className={`w-full rounded-t relative transition-all ${
                            p.phase === "incubation" ? "bg-blue-200" : "bg-green-200"
                          }`} 
                          style={{ height: `${Math.max(4, p.biomass * 2)}px` }}
                        >
                          <div 
                            className={`absolute inset-0 rounded-t ${
                              p.phase === "incubation" 
                                ? "bg-gradient-to-t from-blue-500 to-blue-400" 
                                : "bg-gradient-to-t from-green-600 to-green-400"
                            }`} 
                          />
                          {p.day === currentDay[0] && (
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                              <Badge variant="destructive" className="text-xs">Now</Badge>
                            </div>
                          )}
                        </div>
                        {i % Math.ceil(prediction.predictions.growthCurve.length / 10) === 0 && (
                          <span className="text-[10px] text-muted-foreground">D{p.day}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded" />
                    <span className="text-sm">Incubation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span className="text-sm">Fruiting</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="factors">
                {prediction && (
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(prediction.conditions.factors).map(([key, factor]) => (
                      <Card key={key}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium capitalize">{key}</span>
                            {getFactorIcon(factor.score)}
                          </div>
                          <div className="text-3xl font-bold">{factor.score}%</div>
                          <Progress value={factor.score} className="mt-2" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recommendations">
                {prediction && (
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {prediction.recommendations.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                          <p>All conditions are optimal!</p>
                        </div>
                      ) : (
                        prediction.recommendations.map((rec, i) => (
                          <Card key={i} className={
                            rec.priority === "high" ? "border-red-300 bg-red-50 dark:bg-red-950/20" :
                            rec.priority === "medium" ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20" :
                            ""
                          }>
                            <CardContent className="pt-4">
                              <div className="flex items-start gap-3">
                                {rec.priority === "high" ? (
                                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                                ) : rec.priority === "medium" ? (
                                  <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                                ) : (
                                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                                )}
                                <div>
                                  <div className="font-medium">{rec.parameter}</div>
                                  <p className="text-sm text-muted-foreground">{rec.action}</p>
                                  <div className="text-xs mt-1">
                                    Current: {rec.current} → Optimal: {rec.optimal}
                                  </div>
                                </div>
                                <Badge variant={
                                  rec.priority === "high" ? "destructive" :
                                  rec.priority === "medium" ? "secondary" : "outline"
                                }>
                                  {rec.priority}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Species Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Species Comparison</CardTitle>
          <CardDescription>Compare optimal conditions across species</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Species</th>
                  <th className="text-center py-2 px-3">Optimal Temp</th>
                  <th className="text-center py-2 px-3">Optimal Humidity</th>
                  <th className="text-center py-2 px-3">Incubation</th>
                  <th className="text-center py-2 px-3">Fruiting</th>
                  <th className="text-center py-2 px-3">Yield/kg</th>
                </tr>
              </thead>
              <tbody>
                {speciesList.map((s) => (
                  <tr 
                    key={s.id} 
                    className={`border-b hover:bg-muted/50 cursor-pointer ${
                      selectedSpecies === s.id ? "bg-green-50 dark:bg-green-950/20" : ""
                    }`}
                    onClick={() => setSelectedSpecies(s.id)}
                  >
                    <td className="py-2 px-3 font-medium">{s.name}</td>
                    <td className="text-center py-2 px-3">{s.optimalTemp}°C</td>
                    <td className="text-center py-2 px-3">{s.optimalHumidity}%</td>
                    <td className="text-center py-2 px-3">{s.incubationDays} days</td>
                    <td className="text-center py-2 px-3">{s.fruitingDays} days</td>
                    <td className="text-center py-2 px-3">{s.yieldPerKg}g</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function GrowthAnalyticsPage() {
  return <GrowthAnalyticsContent />
}
