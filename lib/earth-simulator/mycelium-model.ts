/**
 * Mycelium Probability Model
 * 
 * Calculates mycelium probability for grid cells based on:
 * - iNaturalist mushroom observations
 * - Species diversity
 * - Habitat data
 * - Temporal patterns
 */

import type { GridCell } from "./grid-calculator";

export interface CellData {
  observations: Array<{
    id: number;
    species?: string;
    observed_on: string;
    latitude: number;
    longitude: number;
  }>;
  vegetationIndex?: number; // NDVI from satellite
  temperature?: number;
  humidity?: number;
  soilPH?: number;
  elevation?: number;
  habitatType?: string;
}

export interface ProbabilityResult {
  probability: number; // 0.0 to 1.0
  density: "none" | "low" | "medium" | "high";
  confidence: number; // 0.0 to 1.0
  factors: {
    observationCount: number;
    speciesDiversity: number;
    habitatSuitability: number;
    seasonalMultiplier: number;
  };
}

/**
 * Calculate mycelium probability for a grid cell
 */
export function calculateMyceliumProbability(
  cell: GridCell,
  data: CellData
): ProbabilityResult {
  let probability = 0.0;
  const factors = {
    observationCount: 0,
    speciesDiversity: 0,
    habitatSuitability: 1.0,
    seasonalMultiplier: 1.0,
  };

  // Factor 1: Observation density (40% weight)
  const observationCount = data.observations.length;
  factors.observationCount = observationCount;
  const obsWeight = Math.min(observationCount / 10, 1.0); // Normalize to 0-1
  probability += obsWeight * 0.4;

  // Factor 2: Species diversity (20% weight)
  const uniqueSpecies = new Set(
    data.observations
      .map((obs) => obs.species)
      .filter((s): s is string => !!s)
  ).size;
  factors.speciesDiversity = uniqueSpecies;
  const diversityWeight = Math.min(uniqueSpecies / 5, 1.0);
  probability += diversityWeight * 0.2;

  // Factor 3: Habitat suitability (30% weight)
  let habitatScore = 1.0;
  
  // Vegetation index (fungi often associated with vegetation)
  if (data.vegetationIndex !== undefined) {
    const vegScore = Math.max(0, Math.min(1, data.vegetationIndex)); // NDVI typically -1 to 1, normalize
    habitatScore = (habitatScore + vegScore) / 2;
  }
  
  // Temperature (optimal: 10-25°C)
  if (data.temperature !== undefined) {
    const tempOptimal = data.temperature >= 10 && data.temperature <= 25;
    const tempScore = tempOptimal ? 1.0 : Math.max(0.3, 1 - Math.abs(data.temperature - 17.5) / 20);
    habitatScore = (habitatScore + tempScore) / 2;
  }
  
  // Humidity (optimal: 60-80%)
  if (data.humidity !== undefined) {
    const humidityOptimal = data.humidity >= 60 && data.humidity <= 80;
    const humidityScore = humidityOptimal ? 1.0 : Math.max(0.3, 1 - Math.abs(data.humidity - 70) / 50);
    habitatScore = (habitatScore + humidityScore) / 2;
  }
  
  // Soil pH (optimal: 5.5-7.5)
  if (data.soilPH !== undefined) {
    const phOptimal = data.soilPH >= 5.5 && data.soilPH <= 7.5;
    const phScore = phOptimal ? 1.0 : Math.max(0.3, 1 - Math.abs(data.soilPH - 6.5) / 3);
    habitatScore = (habitatScore + phScore) / 2;
  }
  
  factors.habitatSuitability = habitatScore;
  probability += habitatScore * 0.3;

  // Factor 4: Temporal/seasonal patterns (10% weight)
  // Boost probability during typical fruiting seasons
  const currentMonth = new Date().getMonth() + 1; // 1-12
  // Northern hemisphere: peak fruiting in fall (Sep-Nov)
  // Southern hemisphere: adjust based on latitude
  let seasonalMultiplier = 1.0;
  if (cell.centerLat > 0) {
    // Northern hemisphere
    if (currentMonth >= 9 && currentMonth <= 11) {
      seasonalMultiplier = 1.2; // Fall boost
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      seasonalMultiplier = 0.9; // Summer reduction
    }
  } else {
    // Southern hemisphere (inverted)
    if (currentMonth >= 3 && currentMonth <= 5) {
      seasonalMultiplier = 1.2; // Fall boost
    } else if (currentMonth >= 12 || currentMonth <= 2) {
      seasonalMultiplier = 0.9; // Summer reduction
    }
  }
  factors.seasonalMultiplier = seasonalMultiplier;
  probability *= seasonalMultiplier;

  // Normalize to 0-1
  probability = Math.min(1.0, Math.max(0.0, probability));

  // Determine density category
  let density: "none" | "low" | "medium" | "high";
  if (probability < 0.25) {
    density = "none";
  } else if (probability < 0.5) {
    density = "low";
  } else if (probability < 0.75) {
    density = "medium";
  } else {
    density = "high";
  }

  // Calculate confidence based on data availability
  const dataPoints = [
    observationCount > 0,
    data.vegetationIndex !== undefined,
    data.temperature !== undefined,
    data.humidity !== undefined,
    data.soilPH !== undefined,
  ].filter(Boolean).length;

  const confidence = dataPoints / 5; // 0.2 per data point

  return {
    probability,
    density,
    confidence,
    factors,
  };
}

/**
 * Extract features for ML model (future enhancement)
 */
export function extractFeatures(cell: GridCell, data: CellData): number[] {
  return [
    data.observations.length,
    new Set(data.observations.map((o) => o.species).filter(Boolean)).size,
    data.vegetationIndex || 0,
    data.temperature || 0,
    data.humidity || 0,
    data.soilPH || 0,
    data.elevation || 0,
    cell.centerLat,
    cell.centerLon,
  ];
}
