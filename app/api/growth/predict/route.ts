/**
 * Mushroom Growth Prediction API
 * 
 * Uses environmental parameters and species characteristics to predict:
 * - Growth rate and biomass accumulation
 * - Time to harvest
 * - Yield probability
 * - Optimal conditions recommendations
 * 
 * Based on Monod kinetics and environmental factor models
 */

import { NextRequest, NextResponse } from "next/server"

const MINDEX_API_URL = process.env.MINDEX_API_BASE_URL || "http://localhost:8000"
const MINDEX_API_KEY = process.env.MINDEX_API_KEY || "local-dev-key"

// Species-specific growth parameters (from scientific literature)
const SPECIES_GROWTH_PARAMS: Record<string, SpeciesParams> = {
  "oyster": {
    name: "Pleurotus ostreatus",
    optimalTemp: { min: 18, max: 24, optimal: 21 },
    optimalHumidity: { min: 80, max: 95, optimal: 90 },
    optimalCO2: { min: 400, max: 1500, optimal: 800 },
    optimalLight: { min: 8, max: 16, optimal: 12 },
    maxGrowthRate: 0.15, // mm/hour at optimal conditions
    incubationDays: { min: 10, max: 21, avg: 14 },
    fruitingDays: { min: 5, max: 10, avg: 7 },
    yieldPerKg: { min: 150, max: 300, avg: 200 }, // grams per kg substrate
    flushes: 3,
  },
  "shiitake": {
    name: "Lentinula edodes",
    optimalTemp: { min: 12, max: 20, optimal: 16 },
    optimalHumidity: { min: 75, max: 90, optimal: 85 },
    optimalCO2: { min: 400, max: 2000, optimal: 1000 },
    optimalLight: { min: 6, max: 12, optimal: 8 },
    maxGrowthRate: 0.08,
    incubationDays: { min: 60, max: 120, avg: 90 },
    fruitingDays: { min: 7, max: 14, avg: 10 },
    yieldPerKg: { min: 100, max: 200, avg: 150 },
    flushes: 4,
  },
  "lions-mane": {
    name: "Hericium erinaceus",
    optimalTemp: { min: 15, max: 22, optimal: 18 },
    optimalHumidity: { min: 85, max: 95, optimal: 90 },
    optimalCO2: { min: 400, max: 1000, optimal: 600 },
    optimalLight: { min: 8, max: 14, optimal: 10 },
    maxGrowthRate: 0.12,
    incubationDays: { min: 14, max: 28, avg: 21 },
    fruitingDays: { min: 7, max: 14, avg: 10 },
    yieldPerKg: { min: 120, max: 250, avg: 180 },
    flushes: 2,
  },
  "reishi": {
    name: "Ganoderma lucidum",
    optimalTemp: { min: 22, max: 30, optimal: 26 },
    optimalHumidity: { min: 80, max: 95, optimal: 90 },
    optimalCO2: { min: 400, max: 3000, optimal: 1500 },
    optimalLight: { min: 4, max: 12, optimal: 8 },
    maxGrowthRate: 0.06,
    incubationDays: { min: 21, max: 45, avg: 30 },
    fruitingDays: { min: 30, max: 90, avg: 60 },
    yieldPerKg: { min: 50, max: 150, avg: 100 },
    flushes: 2,
  },
  "maitake": {
    name: "Grifola frondosa",
    optimalTemp: { min: 15, max: 22, optimal: 18 },
    optimalHumidity: { min: 80, max: 95, optimal: 90 },
    optimalCO2: { min: 400, max: 1500, optimal: 800 },
    optimalLight: { min: 6, max: 12, optimal: 10 },
    maxGrowthRate: 0.07,
    incubationDays: { min: 30, max: 60, avg: 45 },
    fruitingDays: { min: 14, max: 28, avg: 21 },
    yieldPerKg: { min: 80, max: 180, avg: 120 },
    flushes: 2,
  },
  "chestnut": {
    name: "Pholiota adiposa",
    optimalTemp: { min: 16, max: 22, optimal: 18 },
    optimalHumidity: { min: 80, max: 95, optimal: 85 },
    optimalCO2: { min: 400, max: 1500, optimal: 800 },
    optimalLight: { min: 8, max: 14, optimal: 12 },
    maxGrowthRate: 0.10,
    incubationDays: { min: 14, max: 28, avg: 21 },
    fruitingDays: { min: 7, max: 14, avg: 10 },
    yieldPerKg: { min: 100, max: 200, avg: 150 },
    flushes: 3,
  },
  "king-trumpet": {
    name: "Pleurotus eryngii",
    optimalTemp: { min: 14, max: 20, optimal: 16 },
    optimalHumidity: { min: 80, max: 95, optimal: 90 },
    optimalCO2: { min: 400, max: 2500, optimal: 1500 },
    optimalLight: { min: 6, max: 14, optimal: 10 },
    maxGrowthRate: 0.09,
    incubationDays: { min: 14, max: 28, avg: 21 },
    fruitingDays: { min: 10, max: 18, avg: 14 },
    yieldPerKg: { min: 120, max: 220, avg: 170 },
    flushes: 3,
  },
}

interface SpeciesParams {
  name: string
  optimalTemp: { min: number; max: number; optimal: number }
  optimalHumidity: { min: number; max: number; optimal: number }
  optimalCO2: { min: number; max: number; optimal: number }
  optimalLight: { min: number; max: number; optimal: number }
  maxGrowthRate: number
  incubationDays: { min: number; max: number; avg: number }
  fruitingDays: { min: number; max: number; avg: number }
  yieldPerKg: { min: number; max: number; avg: number }
  flushes: number
}

interface GrowthConditions {
  temp: number
  humidity: number
  co2: number
  light?: number
}

interface PredictionRequest {
  species: string
  currentConditions: GrowthConditions
  substrateKg?: number
  currentDay?: number
  phase?: "incubation" | "fruiting"
  historicalData?: any[]
}

/**
 * Cardinal Temperature Model (Rosso et al., 1993)
 * Calculates temperature growth factor between 0-1
 */
function temperatureGrowthFactor(temp: number, params: SpeciesParams): number {
  const { min, max, optimal } = params.optimalTemp
  
  if (temp <= min || temp >= max) return 0
  
  // Rosso model
  const numerator = (temp - max) * Math.pow(temp - min, 2)
  const denominator = (optimal - min) * (
    (optimal - min) * (temp - optimal) - 
    (optimal - max) * (optimal + min - 2 * temp)
  )
  
  if (denominator === 0) return 0
  return Math.max(0, Math.min(1, numerator / denominator))
}

/**
 * Humidity Growth Factor
 * Linear interpolation in optimal range
 */
function humidityGrowthFactor(humidity: number, params: SpeciesParams): number {
  const { min, max, optimal } = params.optimalHumidity
  
  if (humidity < min - 10 || humidity > max + 5) return 0
  if (humidity >= min && humidity <= max) return 1
  
  if (humidity < min) {
    return Math.max(0, 1 - (min - humidity) / 20)
  }
  return Math.max(0, 1 - (humidity - max) / 10)
}

/**
 * CO2 Growth Factor
 * Inhibitory effect at high CO2
 */
function co2GrowthFactor(co2: number, params: SpeciesParams): number {
  const { min, max, optimal } = params.optimalCO2
  
  if (co2 < min) return 0.9 // Low CO2 slightly reduces growth
  if (co2 <= optimal) return 1
  if (co2 <= max) {
    return 1 - 0.5 * ((co2 - optimal) / (max - optimal))
  }
  // Above max, severe inhibition
  return Math.max(0, 0.5 - 0.3 * ((co2 - max) / 1000))
}

/**
 * Light Growth Factor (for fruiting)
 */
function lightGrowthFactor(light: number, params: SpeciesParams): number {
  const { min, max, optimal } = params.optimalLight
  
  if (light < min) return 0.5 + 0.5 * (light / min)
  if (light <= optimal) return 1
  if (light <= max) return 1
  return Math.max(0.7, 1 - 0.1 * ((light - max) / 4))
}

/**
 * Combined Growth Rate Model
 * Multiplicative model of all environmental factors
 */
function calculateGrowthRate(conditions: GrowthConditions, params: SpeciesParams): number {
  const tempFactor = temperatureGrowthFactor(conditions.temp, params)
  const humidityFactor = humidityGrowthFactor(conditions.humidity, params)
  const co2Factor = co2GrowthFactor(conditions.co2, params)
  const lightFactor = conditions.light !== undefined 
    ? lightGrowthFactor(conditions.light, params) 
    : 1
  
  // Multiplicative model with minimum threshold
  const combinedFactor = tempFactor * humidityFactor * co2Factor * lightFactor
  
  return params.maxGrowthRate * combinedFactor
}

/**
 * Predict growth curve using logistic growth model
 */
function predictGrowthCurve(
  conditions: GrowthConditions, 
  params: SpeciesParams, 
  days: number,
  currentDay: number = 0
): { day: number; biomass: number; growthRate: number; phase: string }[] {
  const predictions: any[] = []
  const growthRate = calculateGrowthRate(conditions, params)
  
  // Logistic growth parameters
  const K = 100 // Carrying capacity (100%)
  const r = growthRate * 24 // Convert to daily rate
  
  for (let d = currentDay; d <= currentDay + days; d++) {
    let biomass: number
    let phase: string
    
    if (d <= params.incubationDays.avg) {
      // Incubation phase - exponential growth
      phase = "incubation"
      const t = d / params.incubationDays.avg
      biomass = 5 + 45 * (1 - Math.exp(-3 * t)) * (growthRate / params.maxGrowthRate)
    } else {
      // Fruiting phase - logistic growth
      phase = "fruiting"
      const fruitingDay = d - params.incubationDays.avg
      const t = fruitingDay / params.fruitingDays.avg
      biomass = 50 + 50 * (1 / (1 + Math.exp(-5 * (t - 0.5)))) * (growthRate / params.maxGrowthRate)
    }
    
    predictions.push({
      day: d,
      biomass: Math.min(100, Math.max(0, biomass)),
      growthRate: growthRate * 100,
      phase,
    })
  }
  
  return predictions
}

/**
 * Calculate yield prediction
 */
function predictYield(
  conditions: GrowthConditions, 
  params: SpeciesParams, 
  substrateKg: number
): {
  expectedYield: number
  minYield: number
  maxYield: number
  confidence: number
} {
  const growthRate = calculateGrowthRate(conditions, params)
  const efficiency = growthRate / params.maxGrowthRate
  
  const avgYield = params.yieldPerKg.avg * substrateKg * efficiency
  const minYield = params.yieldPerKg.min * substrateKg * efficiency
  const maxYield = params.yieldPerKg.max * substrateKg * Math.min(1, efficiency * 1.1)
  
  return {
    expectedYield: Math.round(avgYield),
    minYield: Math.round(minYield),
    maxYield: Math.round(maxYield),
    confidence: efficiency * 100,
  }
}

/**
 * Generate recommendations based on conditions
 */
function generateRecommendations(
  conditions: GrowthConditions, 
  params: SpeciesParams
): { parameter: string; current: number; optimal: number; action: string; priority: "high" | "medium" | "low" }[] {
  const recommendations: any[] = []
  
  // Temperature
  if (Math.abs(conditions.temp - params.optimalTemp.optimal) > 3) {
    recommendations.push({
      parameter: "Temperature",
      current: conditions.temp,
      optimal: params.optimalTemp.optimal,
      action: conditions.temp > params.optimalTemp.optimal 
        ? `Reduce temperature by ${(conditions.temp - params.optimalTemp.optimal).toFixed(1)}°C`
        : `Increase temperature by ${(params.optimalTemp.optimal - conditions.temp).toFixed(1)}°C`,
      priority: Math.abs(conditions.temp - params.optimalTemp.optimal) > 5 ? "high" : "medium",
    })
  }
  
  // Humidity
  if (conditions.humidity < params.optimalHumidity.min - 5 || conditions.humidity > params.optimalHumidity.max + 5) {
    recommendations.push({
      parameter: "Humidity",
      current: conditions.humidity,
      optimal: params.optimalHumidity.optimal,
      action: conditions.humidity < params.optimalHumidity.optimal
        ? `Increase humidity by ${(params.optimalHumidity.optimal - conditions.humidity).toFixed(0)}%`
        : `Reduce humidity by ${(conditions.humidity - params.optimalHumidity.optimal).toFixed(0)}%`,
      priority: Math.abs(conditions.humidity - params.optimalHumidity.optimal) > 15 ? "high" : "medium",
    })
  }
  
  // CO2
  if (conditions.co2 > params.optimalCO2.max) {
    recommendations.push({
      parameter: "CO2",
      current: conditions.co2,
      optimal: params.optimalCO2.optimal,
      action: `Increase ventilation - CO2 is ${conditions.co2 - params.optimalCO2.optimal} ppm above optimal`,
      priority: conditions.co2 > params.optimalCO2.max + 500 ? "high" : "medium",
    })
  }
  
  return recommendations
}

export async function POST(request: NextRequest) {
  try {
    const body: PredictionRequest = await request.json()
    const { species, currentConditions, substrateKg = 1, currentDay = 0, phase = "incubation" } = body
    
    // Get species parameters
    const params = SPECIES_GROWTH_PARAMS[species] || SPECIES_GROWTH_PARAMS["oyster"]
    
    // Calculate environmental growth factors
    const tempFactor = temperatureGrowthFactor(currentConditions.temp, params)
    const humidityFactor = humidityGrowthFactor(currentConditions.humidity, params)
    const co2Factor = co2GrowthFactor(currentConditions.co2, params)
    const lightFactor = currentConditions.light !== undefined 
      ? lightGrowthFactor(currentConditions.light, params) 
      : 1
    
    const overallGrowthRate = calculateGrowthRate(currentConditions, params)
    const efficiency = overallGrowthRate / params.maxGrowthRate
    
    // Generate growth curve prediction
    const totalDays = params.incubationDays.avg + params.fruitingDays.avg
    const growthCurve = predictGrowthCurve(currentConditions, params, totalDays - currentDay, currentDay)
    
    // Calculate harvest timeline
    const adjustedIncubation = Math.round(params.incubationDays.avg / efficiency)
    const adjustedFruiting = Math.round(params.fruitingDays.avg / efficiency)
    const daysToHarvest = Math.max(1, adjustedIncubation + adjustedFruiting - currentDay)
    
    // Yield prediction
    const yieldPrediction = predictYield(currentConditions, params, substrateKg)
    
    // Generate recommendations
    const recommendations = generateRecommendations(currentConditions, params)
    
    // Success probability based on conditions
    const successProbability = Math.min(100, Math.max(0, 
      efficiency * 80 + // Base probability from growth efficiency
      (recommendations.filter(r => r.priority === "high").length === 0 ? 15 : 0) + // Bonus if no critical issues
      5 // Base buffer
    ))
    
    return NextResponse.json({
      species: {
        id: species,
        name: params.name,
        parameters: params,
      },
      conditions: {
        current: currentConditions,
        factors: {
          temperature: { value: tempFactor, score: Math.round(tempFactor * 100) },
          humidity: { value: humidityFactor, score: Math.round(humidityFactor * 100) },
          co2: { value: co2Factor, score: Math.round(co2Factor * 100) },
          light: { value: lightFactor, score: Math.round(lightFactor * 100) },
        },
        overallEfficiency: Math.round(efficiency * 100),
      },
      predictions: {
        growthCurve,
        currentPhase: currentDay <= params.incubationDays.avg ? "incubation" : "fruiting",
        daysToHarvest,
        harvestDate: new Date(Date.now() + daysToHarvest * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        yield: yieldPrediction,
        successProbability: Math.round(successProbability),
        flushesExpected: params.flushes,
        totalYieldPotential: Math.round(yieldPrediction.expectedYield * params.flushes * 0.7), // Decreasing returns
      },
      recommendations,
      algorithm: {
        model: "Monod-Cardinal Growth Model",
        version: "1.0.0",
        confidence: Math.round(efficiency * 85 + 10), // Higher efficiency = higher confidence
      },
    })
  } catch (error) {
    console.error("Growth prediction error:", error)
    return NextResponse.json(
      { error: "Failed to generate prediction", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// GET endpoint for species parameters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const species = searchParams.get("species")
  
  if (species && SPECIES_GROWTH_PARAMS[species]) {
    return NextResponse.json({
      species,
      parameters: SPECIES_GROWTH_PARAMS[species],
    })
  }
  
  // Return all species
  return NextResponse.json({
    species: Object.entries(SPECIES_GROWTH_PARAMS).map(([id, params]) => ({
      id,
      name: params.name,
      optimalTemp: params.optimalTemp.optimal,
      optimalHumidity: params.optimalHumidity.optimal,
      incubationDays: params.incubationDays.avg,
      fruitingDays: params.fruitingDays.avg,
      yieldPerKg: params.yieldPerKg.avg,
    })),
    total: Object.keys(SPECIES_GROWTH_PARAMS).length,
  })
}





