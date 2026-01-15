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
