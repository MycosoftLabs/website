/**
 * Earth Simulator — config-driven data-feed registry.
 *
 * Each entry is ONE map layer: a generic proxy (/api/crep/feed/[id]) fetches +
 * normalizes the upstream to GeoJSON, and a generic <FeedLayer> renders it +
 * shows a click popup. Adding a public geo source = adding ONE config here (no
 * new route/component). Populated from the Jun 15 sensor audit + the feed-config
 * workflow. All new feeds default OFF (flag-gated → v1/prod untouched).
 */

export type FeedRender = "circle" | "line" | "polygon" | "heat" | "symbol"
export type FeedGeometry = "point" | "line" | "polygon"

export interface FeedConfig {
  id: string
  name: string
  /** maps to a CREP layer-panel category via FEED_GROUP_CATEGORY */
  group: "events" | "environment" | "health" | "hazards" | "space" | "ocean" | "bio" | "infrastructure" | "aviation" | "human"
  /** upstream URL. {bbox}=west,south,east,north · {minlat}/{maxlat}/{minlng}/{maxlng} · {key}=auth key */
  endpoint: string
  auth: "none" | string // "key:ENV_VAR"
  bbox_scoped: boolean
  is_geojson: boolean
  items_path?: string // non-geojson: dot-path to the records array ("" = top-level array)
  lat_path?: string
  lng_path?: string
  geometry: FeedGeometry
  props: string[]
  render: FeedRender
  color: string
  min_zoom: number
  refresh_s: number
  coverage: "san-diego" | "us" | "global"
  default_on?: boolean
  notes?: string
  /** drop records below/above a numeric threshold on a prop path (e.g. aurora % at index "2") — keeps dense grids sane */
  where?: { path: string; gte?: number; lte?: number }
  /** hard cap on emitted features (safety for huge grids) */
  max_features?: number
  /** upstream fetch timeout ms (default 12000); bump for slow sources like Overpass / USGS NWIS */
  timeout_ms?: number
}

/** feed group → existing CREP layer-panel category. */
export const FEED_GROUP_CATEGORY: Record<FeedConfig["group"], string> = {
  events: "events", hazards: "events", health: "events",
  environment: "environment", ocean: "environment", bio: "environment",
  space: "environment", aviation: "movers", infrastructure: "infrastructure", human: "human",
}

// Seed configs (verified shapes). The feed-config workflow appends the rest.
export const FEED_REGISTRY: FeedConfig[] = [
  {
    id: "nws-alerts",
    name: "NWS Alerts (watches/warnings)",
    group: "hazards",
    endpoint: "https://api.weather.gov/alerts/active?status=actual&message_type=alert",
    auth: "none", bbox_scoped: false, is_geojson: true,
    geometry: "polygon",
    props: ["event", "severity", "headline", "areaDesc", "expires"],
    render: "polygon", color: "#f59e0b", min_zoom: 3, refresh_s: 300, coverage: "us",
    default_on: false,
    notes: "NWS active watches/warnings as polygons (some are point/zone refs w/o geometry — those are skipped client-side).",
  },
  {
    id: "gdacs-disasters",
    name: "World Disasters (GDACS)",
    group: "events",
    endpoint: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP",
    auth: "none", bbox_scoped: false, is_geojson: true,
    geometry: "point",
    props: ["eventtype", "alertlevel", "name", "country", "fromdate"],
    render: "circle", color: "#ef4444", min_zoom: 0, refresh_s: 600, coverage: "global",
    default_on: false,
    notes: "GDACS global disaster alerts (quakes/cyclones/floods/volcanoes/drought) as GeoJSON points, color by alertlevel.",
  },
  {
    id: "swpc-aurora",
    name: "Aurora Oval (SWPC OVATION)",
    group: "space",
    endpoint: "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
    auth: "none", bbox_scoped: false, is_geojson: false,
    items_path: "coordinates", lng_path: "0", lat_path: "1",
    geometry: "point",
    props: ["2"],
    render: "heat", color: "#22c55e", min_zoom: 0, refresh_s: 600, coverage: "global",
    default_on: false,
    where: { path: "2", gte: 3 }, max_features: 12000,
    notes: "OVATION aurora nowcast — coordinates[] = [lng,lat,aurora%]. Heatmap weighted by the 3rd value; only the visible oval (≥3%) is emitted.",
  },
  {
    id: "usgs-quakes",
    name: "Earthquakes (USGS M2.5+/day)",
    group: "hazards",
    endpoint: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
    auth: "none", bbox_scoped: false, is_geojson: true,
    geometry: "point",
    props: ["mag", "place", "time", "type"],
    render: "circle", color: "#f97316", min_zoom: 0, refresh_s: 300, coverage: "global",
    default_on: false,
    notes: "USGS realtime quakes M2.5+ past 24h (GeoJSON points; geometry coord[2]=depth km).",
  },
  {
    id: "eonet-events",
    name: "Natural Events (NASA EONET)",
    group: "events",
    endpoint: "https://eonet.gsfc.nasa.gov/api/v3/events/geojson?status=open&days=30",
    auth: "none", bbox_scoped: false, is_geojson: true,
    geometry: "point",
    props: ["title", "date", "magnitudeValue", "magnitudeUnit"],
    render: "circle", color: "#fbbf24", min_zoom: 0, refresh_s: 1800, coverage: "global",
    default_on: false,
    notes: "NASA EONET open natural events, last 30d (wildfires/storms/volcanoes/ice) — Point geometry.",
  },
  {
    id: "gbif-fungi",
    name: "Fungi Occurrences (GBIF)",
    group: "bio",
    endpoint: "https://api.gbif.org/v1/occurrence/search?taxon_key=5&hasCoordinate=true&decimalLatitude={minlat},{maxlat}&decimalLongitude={minlng},{maxlng}&limit=300",
    auth: "none", bbox_scoped: true, is_geojson: false,
    items_path: "results", lat_path: "decimalLatitude", lng_path: "decimalLongitude",
    geometry: "point",
    props: ["scientificName", "family", "eventDate", "recordedBy", "license"],
    render: "circle", color: "#84cc16", min_zoom: 4, refresh_s: 0, coverage: "global",
    default_on: false,
    notes: "GBIF kingdom Fungi (taxon_key=5) georeferenced occurrences, bbox-scoped (capped 300), visible from zoom≥4.",
  },
  // NOTE: iNaturalist fungi (taxon_id=47170) was evaluated but persistently 429s this
  // server IP; GBIF (gbif-fungi above) already ingests iNat research-grade records, so it's
  // the canonical fungi source. Re-add iNat only if a per-IP rate-limit lift is arranged.
  {
    id: "obis-marine",
    name: "Marine Life Occurrences (OBIS)",
    group: "ocean",
    endpoint: "https://api.obis.org/v3/occurrence?size=200&geometry=POLYGON%28%28{minlng}%20{minlat}%2C{maxlng}%20{minlat}%2C{maxlng}%20{maxlat}%2C{minlng}%20{maxlat}%2C{minlng}%20{minlat}%29%29",
    auth: "none", bbox_scoped: true, is_geojson: false,
    items_path: "results", lat_path: "decimalLatitude", lng_path: "decimalLongitude",
    geometry: "point",
    props: ["scientificName", "family", "eventDate", "depth"],
    render: "circle", color: "#06b6d4", min_zoom: 4, refresh_s: 0, coverage: "global",
    default_on: false,
    notes: "OBIS marine biodiversity occurrences (WKT-polygon bbox, capped 200), visible from zoom≥4.",
  },

  // ── Wildfire (vector incidents + perimeters; distinct from FIRMS smoke raster) ──
  {
    id: "wfigs-fire-incidents",
    name: "Active Wildfires (WFIGS/NIFC)",
    group: "hazards",
    endpoint: "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Current/FeatureServer/0/query?where=1%3D1&geometry={minlng}%2C{minlat}%2C{maxlng}%2C{maxlat}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=IncidentName%2CIncidentTypeCategory%2CIncidentSize%2CPercentContained%2CFireCause%2CPOOState%2CPOOCounty%2CFireDiscoveryDateTime&f=geojson",
    auth: "none", bbox_scoped: true, is_geojson: true,
    geometry: "point",
    props: ["IncidentName", "IncidentTypeCategory", "IncidentSize", "PercentContained", "FireCause", "POOState", "POOCounty"],
    render: "circle", color: "#ff5722", min_zoom: 0, refresh_s: 300, coverage: "us",
    default_on: false,
    notes: "WFIGS/IRWIN active US wildland fires (5-min updates). esriEnvelope bbox W,S,E,N. IncidentTypeCategory WF=wildfire/RX=prescribed/CX=complex.",
  },
  {
    id: "wfigs-fire-perimeters",
    name: "Wildfire Perimeters (WFIGS/NIFC)",
    group: "hazards",
    endpoint: "https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query?where=1%3D1&geometry={minlng}%2C{minlat}%2C{maxlng}%2C{maxlat}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=attr_IncidentName%2Cattr_IncidentTypeCategory%2Cattr_PercentContained%2Cpoly_GISAcres%2Cattr_POOState&f=geojson",
    auth: "none", bbox_scoped: true, is_geojson: true,
    geometry: "polygon",
    props: ["attr_IncidentName", "attr_IncidentTypeCategory", "attr_PercentContained", "poly_GISAcres", "attr_POOState"],
    render: "polygon", color: "#e64a19", min_zoom: 0, refresh_s: 300, coverage: "us",
    default_on: false,
    notes: "WFIGS active US fire perimeters (Polygon/MultiPolygon, 5-min). attr_=incident attrs, poly_GISAcres=burned area.",
  },
  {
    id: "calfire-incidents",
    name: "CAL FIRE Active Incidents",
    group: "hazards",
    endpoint: "https://incidents.fire.ca.gov/umbraco/api/IncidentApi/List?inactive=false",
    auth: "none", bbox_scoped: false, is_geojson: false,
    items_path: "", lat_path: "Latitude", lng_path: "Longitude",
    geometry: "point",
    props: ["Name", "Type", "County", "Location", "AcresBurned", "PercentContained", "Started"],
    render: "circle", color: "#ff9800", min_zoom: 0, refresh_s: 300, coverage: "us",
    default_on: false,
    notes: "CAL FIRE active incidents (top-level JSON array; inactive=false=active only). Url field links to fire.ca.gov page.",
  },

  // ── Earthquakes (significant, with ShakeMap intensity products) ──
  {
    id: "usgs-shakemap-events",
    name: "Significant Quakes — ShakeMap (USGS)",
    group: "hazards",
    endpoint: "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&producttype=shakemap&minmagnitude=3.5&minlatitude={minlat}&maxlatitude={maxlat}&minlongitude={minlng}&maxlongitude={maxlng}&orderby=time",
    auth: "none", bbox_scoped: true, is_geojson: true,
    geometry: "point",
    props: ["mag", "place", "time", "magType", "alert", "title"],
    render: "circle", color: "#d00000", min_zoom: 0, refresh_s: 600, coverage: "global",
    default_on: false,
    notes: "USGS fdsnws quakes that have a ShakeMap product (M3.5+). Point [lng,lat,depth]; per-event 'detail' URL has the MMI grid.",
  },

  // ── Radiation monitoring ──
  {
    id: "safecast-radiation",
    name: "Radiation — Safecast (CPM)",
    group: "environment",
    endpoint: "https://api.safecast.org/measurements.json?order=captured_at+desc",
    auth: "none", bbox_scoped: false, is_geojson: false,
    items_path: "", lat_path: "latitude", lng_path: "longitude",
    geometry: "point",
    props: ["value", "unit", "captured_at", "location_name", "device_id"],
    render: "circle", color: "#ffcc00", min_zoom: 0, refresh_s: 600, coverage: "global", max_features: 1000,
    default_on: false,
    notes: "Safecast crowd-sourced radiation readings (unit usually cpm), newest first (captured_at desc).",
  },
  {
    id: "thingspeak-radiation",
    name: "Geiger Stations — ThingSpeak",
    group: "environment",
    endpoint: "https://api.thingspeak.com/channels/public.json?tag=radiation",
    auth: "none", bbox_scoped: false, is_geojson: false,
    items_path: "channels", lat_path: "latitude", lng_path: "longitude",
    geometry: "point",
    props: ["name", "description", "created_at", "url"],
    render: "circle", color: "#84cc16", min_zoom: 0, refresh_s: 900, coverage: "global",
    default_on: false,
    notes: "Public ThingSpeak IoT Geiger/dosimeter channels (tag=radiation). Station metadata (not live value); empty/null-island coords dropped.",
  },

  // ── Power infrastructure (OSM/Overpass) — REMOVED for now ──
  // power-substations-osm / power-plants-osm dropped: every public Overpass mirror
  // (kumi, overpass-api.de, lz4, private.coffee) is unreachable/timeout from our network.
  // Re-add as a Tier-B cached connector (pre-baked GeoJSON, or a server-side Overpass
  // poller with caching) — see [[earth-sim-addendum-roadmap]]. The generic proxy now
  // degrades gracefully (200 empty) on any upstream failure and never 500s.

  // ── Hydrology / flood (USGS stream gauges) ──
  {
    id: "usgs-streamflow",
    name: "River Gauges / Streamflow (USGS)",
    group: "ocean",
    endpoint: "https://waterservices.usgs.gov/nwis/iv/?format=json&bBox={minlng},{minlat},{maxlng},{maxlat}&parameterCd=00060&siteStatus=active",
    auth: "none", bbox_scoped: true, is_geojson: false,
    items_path: "value.timeSeries", lat_path: "sourceInfo.geoLocation.geogLocation.latitude", lng_path: "sourceInfo.geoLocation.geogLocation.longitude",
    geometry: "point",
    props: ["sourceInfo.siteName", "values.0.value.0.value", "variable.variableName"],
    render: "circle", color: "#38bdf8", min_zoom: 6, refresh_s: 0, coverage: "us", timeout_ms: 25000,
    default_on: false,
    notes: "USGS NWIS instantaneous streamflow (discharge ft³/s, param 00060) at active gauges. bBox W,S,E,N (≤25° span → zoom≥7). Value at values.0.value.0.value.",
  },

  // ── Space activity ──
  {
    id: "launch-library-upcoming",
    name: "Upcoming Rocket Launches",
    group: "space",
    endpoint: "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=30",
    auth: "none", bbox_scoped: false, is_geojson: false,
    items_path: "results", lat_path: "pad.latitude", lng_path: "pad.longitude",
    geometry: "point",
    props: ["name", "net", "status.name", "pad.name", "pad.location.name", "launch_service_provider.name"],
    render: "circle", color: "#ffd166", min_zoom: 0, refresh_s: 3600, coverage: "global",
    default_on: false,
    notes: "Launch Library 2 upcoming launches at the pad. pad.lat/lng are strings. Free tier ~15 req/hr — hourly poll + cache.",
  },
]
