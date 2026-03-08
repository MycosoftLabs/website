/**
 * Entity Validators
 *
 * Runtime validation for all CREP entity data at API boundaries.
 * Catches invalid coordinates, unrealistic values, and malformed data
 * before it reaches the UI layer.
 */

import type { UnifiedEntity } from "./unified-entity-schema"
import { isValidCoordinate } from "./entity-converters"

// ============================================================================
// Validation Result Type
// ============================================================================

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// ============================================================================
// Coordinate Validation
// ============================================================================

export function validateCoordinates(lng: number, lat: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (typeof lng !== "number" || isNaN(lng)) {
    errors.push("Longitude is not a valid number")
  } else if (lng < -180 || lng > 180) {
    errors.push(`Longitude ${lng} out of range [-180, 180]`)
  }

  if (typeof lat !== "number" || isNaN(lat)) {
    errors.push("Latitude is not a valid number")
  } else if (lat < -90 || lat > 90) {
    errors.push(`Latitude ${lat} out of range [-90, 90]`)
  }

  // Warn about null island (0,0) which is often a data quality issue
  if (lng === 0 && lat === 0) {
    warnings.push("Coordinates are at null island (0,0) - possible data quality issue")
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ============================================================================
// Aircraft Validation
// ============================================================================

const MAX_AIRCRAFT_ALTITUDE_FT = 60000
const MAX_AIRCRAFT_SPEED_KTS = 2500

export function validateAircraftData(props: Record<string, unknown>): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const altitude = props.altitude as number | undefined
  if (altitude !== undefined && altitude !== null) {
    if (altitude < -1000 || altitude > MAX_AIRCRAFT_ALTITUDE_FT) {
      warnings.push(`Aircraft altitude ${altitude}ft outside realistic range`)
    }
  }

  const speed = props.velocity as number | undefined
  if (speed !== undefined && speed !== null) {
    if (speed < 0 || speed > MAX_AIRCRAFT_SPEED_KTS) {
      warnings.push(`Aircraft speed ${speed}kts outside realistic range`)
    }
  }

  const heading = props.heading as number | undefined
  if (heading !== undefined && heading !== null) {
    if (heading < 0 || heading > 360) {
      warnings.push(`Aircraft heading ${heading}° outside [0, 360]`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ============================================================================
// Vessel Validation
// ============================================================================

const MAX_VESSEL_SPEED_KTS = 50

export function validateVesselData(props: Record<string, unknown>): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const speed = props.sog as number | undefined
  if (speed !== undefined && speed !== null) {
    if (speed < 0 || speed > MAX_VESSEL_SPEED_KTS) {
      warnings.push(`Vessel speed ${speed}kts outside realistic range [0, ${MAX_VESSEL_SPEED_KTS}]`)
    }
  }

  const heading = props.heading as number | undefined
  if (heading !== undefined && heading !== null) {
    if (heading < 0 || heading > 360) {
      warnings.push(`Vessel heading ${heading}° outside [0, 360]`)
    }
  }

  const draught = props.draught as number | undefined
  if (draught !== undefined && draught !== null) {
    if (draught < 0 || draught > 30) {
      warnings.push(`Vessel draught ${draught}m outside realistic range [0, 30]`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ============================================================================
// Satellite Validation
// ============================================================================

const MIN_SATELLITE_PERIOD_MIN = 85
const MAX_SATELLITE_PERIOD_MIN = 1500

export function validateSatelliteData(props: Record<string, unknown>): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const orbitalParams = props.orbitalParams as Record<string, number> | undefined
  if (orbitalParams?.period !== undefined) {
    if (orbitalParams.period < MIN_SATELLITE_PERIOD_MIN || orbitalParams.period > MAX_SATELLITE_PERIOD_MIN) {
      warnings.push(
        `Satellite period ${orbitalParams.period}min outside realistic range [${MIN_SATELLITE_PERIOD_MIN}, ${MAX_SATELLITE_PERIOD_MIN}]`
      )
    }
  }

  const altitude = props.altitude as number | undefined
  if (altitude !== undefined && altitude !== null) {
    if (altitude < 100 || altitude > 42000) {
      warnings.push(`Satellite altitude ${altitude}km outside realistic range [100, 42000]`)
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

// ============================================================================
// Unified Entity Validation
// ============================================================================

export function validateEntity(entity: UnifiedEntity): ValidationResult {
  const allErrors: string[] = []
  const allWarnings: string[] = []

  // ID validation
  if (!entity.id || typeof entity.id !== "string") {
    allErrors.push("Entity missing valid ID")
  }

  // Type validation
  const validTypes = ["aircraft", "vessel", "satellite", "fungal", "weather", "earthquake", "elephant", "device"]
  if (!validTypes.includes(entity.type)) {
    allWarnings.push(`Unknown entity type: ${entity.type}`)
  }

  // Geometry validation
  if (entity.geometry.type === "Point") {
    const [lng, lat] = entity.geometry.coordinates
    const coordResult = validateCoordinates(lng, lat)
    allErrors.push(...coordResult.errors)
    allWarnings.push(...coordResult.warnings)
  }

  // Type-specific validation
  switch (entity.type) {
    case "aircraft":
      const aircraftResult = validateAircraftData(entity.properties)
      allErrors.push(...aircraftResult.errors)
      allWarnings.push(...aircraftResult.warnings)
      break
    case "vessel":
      const vesselResult = validateVesselData(entity.properties)
      allErrors.push(...vesselResult.errors)
      allWarnings.push(...vesselResult.warnings)
      break
    case "satellite":
      const satResult = validateSatelliteData(entity.properties)
      allErrors.push(...satResult.errors)
      allWarnings.push(...satResult.warnings)
      break
  }

  // Time validation
  if (!entity.time?.observed_at) {
    allWarnings.push("Entity missing observed_at timestamp")
  }

  // Confidence validation
  if (entity.confidence < 0 || entity.confidence > 1) {
    allWarnings.push(`Confidence ${entity.confidence} outside [0, 1]`)
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}

/** Validate and filter an array of entities, logging warnings */
export function validateBatch(
  entities: UnifiedEntity[],
  logWarnings = false
): UnifiedEntity[] {
  return entities.filter((entity) => {
    const result = validateEntity(entity)
    if (!result.valid) {
      if (logWarnings) {
        console.warn(`[CREP Validator] Dropping invalid entity ${entity.id}:`, result.errors)
      }
      return false
    }
    if (logWarnings && result.warnings.length > 0) {
      console.debug(`[CREP Validator] Warnings for ${entity.id}:`, result.warnings)
    }
    return true
  })
}
