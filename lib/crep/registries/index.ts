/**
 * CREP Entity Registries — Multi-Source Aggregation Layer
 *
 * Each registry queries ALL available free data sources in parallel,
 * deduplicates by unique ID, merges properties, and returns the combined set.
 *
 * - Vessels:    deduplicated by MMSI
 * - Aircraft:   deduplicated by ICAO hex code
 * - Satellites: deduplicated by NORAD catalog number
 */

export {
  fetchAllVessels,
  fetchAllVesselsWithMeta,
  type VesselRecord,
  type VesselRegistryResult,
} from "./vessel-registry"

export {
  fetchAllAircraft,
  fetchAllAircraftWithMeta,
  type AircraftRecord,
  type AircraftRegistryResult,
} from "./aircraft-registry"

export {
  fetchAllSatellites,
  fetchAllSatellitesWithMeta,
  type SatelliteRecord,
  type SatelliteRegistryResult,
} from "./satellite-registry"
