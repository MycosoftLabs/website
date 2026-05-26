/**
 * Viewport environmental sensor catalog — May 24, 2026
 *
 * Known non-video providers (SDAPCD, IBWC, NOAA CO-OPS, NDBC, USGS, etc.)
 * with fixed coordinates. Live readings are attached in /api/crep/viewport-sensors;
 * only sensors with confirmed live data are returned to the UI.
 */

export type ViewportSensorKind =
  | "aqi"
  | "h2s"
  | "tide"
  | "buoy"
  | "streamflow"
  | "river-flow"
  | "beach-closure"
  | "project-oyster"

export interface ViewportSensorCatalogEntry {
  id: string
  name: string
  provider: string
  agency?: string
  lat: number
  lng: number
  kind: ViewportSensorKind
  category: string
  /** NDBC station id, CO-OPS id, USGS site id, etc. */
  station_id?: string
  description?: string
}

export const VIEWPORT_SENSOR_CATALOG: ViewportSensorCatalogEntry[] = [
  // IBWC river discharge
  {
    id: "ibwc-11013300",
    name: "Tijuana River — Intl Border (IBWC 11013300)",
    provider: "ibwc",
    agency: "USIBWC",
    lat: 32.5435,
    lng: -117.0298,
    kind: "river-flow",
    category: "river-flow",
    station_id: "11013300",
  },
  // SDAPCD H₂S network
  {
    id: "sdapcd-imperial-beach",
    name: "Imperial Beach Pier — H₂S",
    provider: "sdapcd",
    agency: "SDAPCD",
    lat: 32.579,
    lng: -117.136,
    kind: "h2s",
    category: "air-quality",
  },
  {
    id: "sdapcd-nestor",
    name: "Nestor — H₂S",
    provider: "sdapcd",
    agency: "SDAPCD",
    lat: 32.5497,
    lng: -117.09,
    kind: "h2s",
    category: "air-quality",
  },
  {
    id: "sdapcd-iris",
    name: "Iris Ave — H₂S",
    provider: "sdapcd",
    agency: "SDAPCD",
    lat: 32.564,
    lng: -117.073,
    kind: "h2s",
    category: "air-quality",
  },
  {
    id: "sdapcd-saturn",
    name: "Saturn Blvd — H₂S",
    provider: "sdapcd",
    agency: "SDAPCD",
    lat: 32.5677,
    lng: -117.051,
    kind: "h2s",
    category: "air-quality",
  },
  {
    id: "sdapcd-tjslough",
    name: "TJ Slough — H₂S",
    provider: "sdapcd",
    agency: "SDAPCD",
    lat: 32.551,
    lng: -117.118,
    kind: "h2s",
    category: "air-quality",
  },
  // NOAA CO-OPS tide gauges
  {
    id: "sens-coops-lajolla",
    name: "NOAA CO-OPS 9410230 — La Jolla",
    provider: "noaa-coops",
    agency: "NOAA",
    lat: 32.8666,
    lng: -117.2573,
    kind: "tide",
    category: "sensor",
    station_id: "9410230",
  },
  {
    id: "sens-coops-sandiego",
    name: "NOAA CO-OPS 9410170 — SD Harbor",
    provider: "noaa-coops",
    agency: "NOAA",
    lat: 32.713,
    lng: -117.173,
    kind: "tide",
    category: "sensor",
    station_id: "9410170",
  },
  {
    id: "sens-coops-zuniga",
    name: "NOAA CO-OPS 9410162 — Zuniga Pt",
    provider: "noaa-coops",
    agency: "NOAA",
    lat: 32.713,
    lng: -117.21,
    kind: "tide",
    category: "sensor",
    station_id: "9410162",
  },
  // USGS streamflow
  {
    id: "sens-usgs-tj",
    name: "USGS 11013500 — TJ River @ NERR",
    provider: "usgs",
    agency: "USGS",
    lat: 32.5505,
    lng: -117.122,
    kind: "streamflow",
    category: "sensor",
    station_id: "11013500",
  },
  {
    id: "sens-usgs-sweetwater",
    name: "USGS 11015000 — Sweetwater R",
    provider: "usgs",
    agency: "USGS",
    lat: 32.64,
    lng: -117.06,
    kind: "streamflow",
    category: "sensor",
    station_id: "11015000",
  },
  // NDBC buoys
  {
    id: "sens-ndbc-46232",
    name: "NDBC 46232 — Point Loma South",
    provider: "noaa-ndbc",
    agency: "NOAA NDBC",
    lat: 32.517,
    lng: -117.425,
    kind: "buoy",
    category: "sensor",
    station_id: "46232",
  },
  {
    id: "sens-ndbc-46225",
    name: "NDBC 46225 — Torrey Pines",
    provider: "noaa-ndbc",
    agency: "NOAA NDBC",
    lat: 32.933,
    lng: -117.391,
    kind: "buoy",
    category: "sensor",
    station_id: "46225",
  },
  {
    id: "sens-ndbc-46231",
    name: "NDBC 46231 — N Coronado",
    provider: "noaa-ndbc",
    agency: "NOAA NDBC",
    lat: 32.733,
    lng: -117.269,
    kind: "buoy",
    category: "sensor",
    station_id: "46231",
  },
]
