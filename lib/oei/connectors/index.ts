/**
 * OEI Connectors Index
 * 
 * Central export for all data connectors
 */

// NWS Weather Alerts
export {
  NWSAlertsClient,
  getNWSAlertsClient,
  type NWSAlertQuery,
} from "./nws-alerts"

// USGS Volcano
export {
  USGSVolcanoClient,
  getUSGSVolcanoClient,
  type USGSVolcanoQuery,
} from "./usgs-volcano"

// OpenSky ADS-B Aircraft
export {
  OpenSkyClient,
  getOpenSkyClient,
  type OpenSkyQuery,
} from "./opensky-adsb"

// AISstream Maritime Vessels
export {
  AISStreamClient,
  getAISStreamClient,
  type VesselQuery,
} from "./aisstream-ships"

// FlightRadar24 Aircraft
export {
  FlightRadar24Client,
  getFlightRadar24Client,
  type FR24Query,
} from "./flightradar24"

// NOAA Space Weather (SWPC)
export {
  SpaceWeatherClient,
  getSpaceWeatherClient,
  type SpaceWeatherConditions,
} from "./space-weather"

// Satellite Tracking
export {
  SatelliteTrackingClient,
  getSatelliteTrackingClient,
  type SatelliteEntity,
  type SatelliteQuery,
  type SatelliteCategory,
} from "./satellite-tracking"

// Carbon Mapper Emissions
export {
  CarbonMapperClient,
  getCarbonMapperClient,
  type EmissionEntity,
  type EmissionPlume,
  type EmissionQuery,
} from "./carbon-mapper"

// OpenRailwayMap Railways
export {
  OpenRailwayClient,
  getOpenRailwayClient,
  type RailwayEntity,
  type RailwayStation,
  type RailwayQuery,
} from "./openrailway"

// GBIF Biodiversity
export {
  GBIFClient,
  getGBIFClient,
  type GBIFQuery,
  type SpeciesEntity,
} from "./gbif"

// eBird Bird Observations
export {
  EBirdClient,
  getEBirdClient,
  type EBirdQuery,
  type BirdObservationEntity,
} from "./ebird"

// OpenAQ Air Quality
export {
  OpenAQClient,
  getOpenAQClient,
  type OpenAQQuery,
  type AirQualityObservation,
} from "./openaq"

// OBIS Marine Biodiversity
export {
  OBISClient,
  getOBISClient,
  type OBISQuery,
  type MarineSpeciesEntity,
} from "./obis"
