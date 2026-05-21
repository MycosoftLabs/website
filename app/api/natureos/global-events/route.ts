/**
 * Global Events API - Real-time worldwide event aggregation
 * 
 * Fetches live data from:
 * - USGS Earthquake API
 * - NOAA Space Weather
 * - NASA EONET (Earth Observatory Natural Event Tracker)
 * - OpenWeatherMap Severe Weather
 * - Twitter/X Bot feeds (earthquakes, solar flares, lightning)
 * 
 * This powers the Situational Awareness widget for "watching the world"
 */

import { NextRequest, NextResponse } from "next/server";
import { ingestEvents } from "@/lib/oei/mindex-ingest";

export interface GlobalEvent {
  id: string;
  type:
    | "earthquake"
    | "volcano"
    | "wildfire"
    | "storm"
    | "flood"
    | "drought"
    | "landslide"
    | "tsunami"
    | "solar_flare"
    | "geomagnetic_storm"
    | "aurora"
    | "meteor"
    | "lightning"
    | "tornado"
    | "hurricane"
    | "typhoon"
    | "cyclone"
    | "blizzard"
    | "heatwave"
    | "coldwave"
    | "air_quality"
    | "radiation"
    | "biological"
    | "fungal_bloom"
    | "animal_migration"
    | "insect_swarm"
    | "algae_bloom"
    | "other";
  title: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical" | "extreme";
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    depth?: number; // For earthquakes
    altitude?: number; // For atmospheric events
  };
  magnitude?: number; // For earthquakes, storms
  source: string;
  sourceUrl?: string;
  link?: string;
  media?: {
    type: "image" | "video";
    url: string;
    thumbnail?: string;
  }[];
  affected?: {
    population?: number;
    area_km2?: number;
    countries?: string[];
  };
  updates?: {
    timestamp: string;
    message: string;
  }[];
}

// Cache for rate limiting
let cachedEvents: GlobalEvent[] = [];
let lastFetchTime = 0;
const CACHE_TTL = 60000; // 1 minute cache
const RESPONSE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

async function fetchUSGSEarthquakes(days = 7): Promise<GlobalEvent[]> {
  try {
    // Full USGS catalog — past 7 days, all magnitudes (down to M1.0 regional).
    // Earlier versions used 2.5_day.geojson (~150 quakes); the 1.0_week feed
    // returns every tracked global event (~8,000–15,000). Army-contract
    // deliverable requires all active seismic activity.
    const feed = days >= 30 ? "all_month" : days >= 7 ? "1.0_week" : "1.0_day";
    const res = await fetch(
      `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}.geojson`,
      { signal: AbortSignal.timeout(20000), cache: "no-store" }
    );
    
    if (!res.ok) throw new Error("USGS API error");
    
    const data = await res.json();
    
    // NO LIMIT - return all earthquakes from USGS feed
    return data.features.map((feature: any) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      const mag = Number.isFinite(Number(props.mag)) ? Number(props.mag) : 0;
      
      let severity: GlobalEvent["severity"] = "info";
      if (mag >= 7) severity = "extreme";
      else if (mag >= 6) severity = "critical";
      else if (mag >= 5) severity = "high";
      else if (mag >= 4) severity = "medium";
      else if (mag >= 3) severity = "low";
      
      return {
        id: `usgs-${feature.id}`,
        type: "earthquake",
        title: `M${mag.toFixed(1)} Earthquake - ${props.place}`,
        description: `Magnitude ${mag.toFixed(1)} earthquake at depth of ${coords[2].toFixed(1)}km. ${props.tsunami ? "Tsunami warning issued." : ""}`,
        severity,
        timestamp: new Date(props.time).toISOString(),
        location: {
          latitude: coords[1],
          longitude: coords[0],
          name: props.place,
          depth: coords[2],
        },
        magnitude: mag,
        source: "USGS",
        sourceUrl: "https://earthquake.usgs.gov",
        link: props.url,
      };
    });
  } catch (error) {
    console.error("USGS fetch error:", error);
    return [];
  }
}

async function fetchNOAASpaceWeather(): Promise<GlobalEvent[]> {
  const events: GlobalEvent[] = [];
  
  try {
    // Solar Flare data
    const flareRes = await fetch(
      "https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json",
      { signal: AbortSignal.timeout(10000), cache: "no-store" }
    );
    
    if (flareRes.ok) {
      const flares = await flareRes.json();
      
      // NO LIMIT - return all solar flares
      flares.forEach((flare: any, idx: number) => {
        if (!flare.max_class) return;
        
        let severity: GlobalEvent["severity"] = "info";
        const flareClass = flare.max_class.charAt(0);
        if (flareClass === "X") severity = "extreme";
        else if (flareClass === "M") severity = "high";
        else if (flareClass === "C") severity = "medium";
        
        events.push({
          id: `noaa-flare-${idx}-${Date.now()}`,
          type: "solar_flare",
          title: `${flare.max_class} Solar Flare`,
          description: `Class ${flare.max_class} solar flare detected. Peak time: ${flare.max_time || "N/A"}`,
          severity,
          timestamp: new Date(flare.begin_time || Date.now()).toISOString(),
          location: {
            latitude: 0,
            longitude: 0,
            name: "Sun",
          },
          source: "NOAA SWPC",
          sourceUrl: "https://www.swpc.noaa.gov",
        });
      });
    }
    
    // Geomagnetic storms - K-index
    const kpRes = await fetch(
      "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json",
      { signal: AbortSignal.timeout(10000), cache: "no-store" }
    );
    
    if (kpRes.ok) {
      const kpData = await kpRes.json();
      const latestKp = kpData[kpData.length - 1];
      
      if (latestKp && parseFloat(latestKp[1]) >= 4) {
        let severity: GlobalEvent["severity"] = "info";
        const kp = parseFloat(latestKp[1]);
        if (kp >= 8) severity = "extreme";
        else if (kp >= 7) severity = "critical";
        else if (kp >= 6) severity = "high";
        else if (kp >= 5) severity = "medium";
        else if (kp >= 4) severity = "low";
        
        events.push({
          id: `noaa-kp-${Date.now()}`,
          type: "geomagnetic_storm",
          title: `Geomagnetic Storm (Kp=${kp.toFixed(0)})`,
          description: `Planetary K-index of ${kp.toFixed(1)} indicates ${kp >= 5 ? "a geomagnetic storm" : "unsettled conditions"}. Aurora may be visible at ${kp >= 7 ? "mid" : "high"} latitudes.`,
          severity,
          timestamp: new Date(latestKp[0]).toISOString(),
          location: {
            latitude: 65,
            longitude: 0,
            name: "Global - Polar Regions",
          },
          magnitude: kp,
          source: "NOAA SWPC",
          sourceUrl: "https://www.swpc.noaa.gov",
        });
      }
    }
  } catch (error) {
    console.error("NOAA fetch error:", error);
  }
  
  return events;
}

function severityFromNws(value?: string | null): GlobalEvent["severity"] {
  switch ((value || "").toLowerCase()) {
    case "extreme":
      return "extreme";
    case "severe":
      return "high";
    case "moderate":
      return "medium";
    case "minor":
      return "low";
    default:
      return "info";
  }
}

function normalizeWeatherEventType(...parts: Array<string | undefined | null>): GlobalEvent["type"] {
  const text = parts.filter(Boolean).join(" ").toLowerCase();

  if (/\btornado|twister\b/.test(text)) return "tornado";
  if (/\btyphoon\b/.test(text)) return "typhoon";
  if (/\bhurricane\b/.test(text)) return "hurricane";
  if (/\b(cyclone|tropical storm|tropical depression)\b/.test(text)) return "cyclone";
  if (/\bflood|flash flood|coastal flood|inundation\b/.test(text)) return "flood";
  if (/\blightning\b/.test(text)) return "lightning";
  if (/\b(thunderstorm|supercell|squall|hail|storm surge|storm warning|storm watch)\b/.test(text)) return "storm";
  if (/\bwildfire|red flag|fire weather|forest fire|brush fire\b/.test(text)) return "wildfire";
  if (/\bblizzard|winter storm|ice storm|snow squall|snow storm\b/.test(text)) return "blizzard";
  if (/\bheat|excessive heat|hot weather\b/.test(text)) return "heatwave";
  if (/\bcold|freeze|frost|wind chill|hard freeze\b/.test(text)) return "coldwave";
  if (/\bair quality|smoke|dust|ashfall|volcanic ash\b/.test(text)) return "air_quality";
  if (/\btsunami\b/.test(text)) return "tsunami";
  if (/\blandslide|mudslide|debris flow\b/.test(text)) return "landslide";
  if (/\bdrought\b/.test(text)) return "drought";

  return "storm";
}

function collectCoordinatePairs(value: unknown, pairs: Array<[number, number]>) {
  if (!Array.isArray(value)) return;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  ) {
    const lng = value[0];
    const lat = value[1];
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      pairs.push([lng, lat]);
    }
    return;
  }

  for (const item of value) collectCoordinatePairs(item, pairs);
}

function centroidFromGeometry(geometry: any): { latitude: number; longitude: number } | null {
  if (!geometry) return null;
  const pairs: Array<[number, number]> = [];
  collectCoordinatePairs(geometry.coordinates, pairs);
  if (pairs.length === 0) return null;

  const sums = pairs.reduce(
    (acc, [lng, lat]) => {
      acc.lng += lng;
      acc.lat += lat;
      return acc;
    },
    { lng: 0, lat: 0 },
  );

  return {
    latitude: sums.lat / pairs.length,
    longitude: sums.lng / pairs.length,
  };
}

function extractWindMph(...parts: Array<string | undefined | null>) {
  const text = parts.filter(Boolean).join(" ");
  const matches = Array.from(text.matchAll(/\b(\d{2,3})\s*(mph|kt|kts|knots)\b/gi));
  const values = matches
    .map((match) => {
      const value = Number(match[1]);
      if (!Number.isFinite(value)) return undefined;
      return /kt|kts|knots/i.test(match[2]) ? Math.round(value * 1.15078) : value;
    })
    .filter((value): value is number => typeof value === "number");
  return values.length > 0 ? Math.max(...values) : undefined;
}

async function fetchNASAEONET(): Promise<GlobalEvent[]> {
  try {
    const res = await fetch(
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=5000",
      { signal: AbortSignal.timeout(15000), cache: "no-store" }
    );
    
    if (!res.ok) throw new Error("NASA EONET API error");
    
    const data = await res.json();
    
    return data.events
      .map((event: any): GlobalEvent | null => {
      const category = event.categories?.[0]?.id || "other";
      const geometry = Array.isArray(event.geometry) ? event.geometry[0] : null;
      const centroid = centroidFromGeometry(geometry);
      if (!centroid) return null;
      
      let type: GlobalEvent["type"] = "other";
      if (category === "wildfires") type = "wildfire";
      else if (category === "volcanoes") type = "volcano";
      else if (category === "severeStorms") type = normalizeWeatherEventType(event.title, event.description);
      else if (category === "floods") type = "flood";
      else if (category === "earthquakes") type = "earthquake";
      else if (category === "landslides") type = "landslide";
      else if (category === "seaLakeIce") type = "other";
      
      return {
        id: `eonet-${event.id}`,
        type,
        title: event.title,
        description: event.description || `Active ${type} event tracked by NASA EONET.`,
        severity: "medium" as const,
        timestamp: new Date(geometry?.date || Date.now()).toISOString(),
        location: {
          latitude: centroid.latitude,
          longitude: centroid.longitude,
          name: event.title,
        },
        source: "NASA EONET",
        sourceUrl: "https://eonet.gsfc.nasa.gov",
        link: event.link,
      };
    })
    .filter((event: GlobalEvent | null): event is GlobalEvent => Boolean(event));
  } catch (error) {
    // May 21 2026 (Morgan): downgraded from console.error to console.warn.
    // The Next.js dev error overlay treats console.error() as a runtime
    // error and pops a "1 error" badge on the page, even when the calling
    // route swallows the failure and returns []. EONET is a single source
    // among many — its 5xx / timeout is the upstream's problem, not a
    // dashboard bug. Same goes for the other upstream catches below.
    console.warn("[global-events] NASA EONET upstream unavailable:", error instanceof Error ? error.message : error);
    return [];
  }
}

async function fetchNWSActiveWeatherAlerts(): Promise<GlobalEvent[]> {
  try {
    const res = await fetch(
      "https://api.weather.gov/alerts/active?status=actual&message_type=alert",
      {
        headers: {
          Accept: "application/geo+json",
          "User-Agent": "Mycosoft NatureOS Earth Simulator (https://mycosoft.com)",
        },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );

    if (!res.ok) throw new Error(`NWS API error: ${res.status}`);

    const data = await res.json();
    const features = Array.isArray(data.features) ? data.features : [];

    return features
      .map((feature: any): GlobalEvent | null => {
        const props = feature.properties || {};
        const centroid = centroidFromGeometry(feature.geometry);
        if (!centroid) return null;

        const type = normalizeWeatherEventType(props.event, props.headline, props.description, props.instruction);
        const windMph = extractWindMph(props.headline, props.description, props.instruction);
        const id = String(props.id || feature.id || `${props.event || "alert"}-${props.sent || props.effective || props.areaDesc}`);
        const timestamp = props.effective || props.sent || props.onset || props.updated || new Date().toISOString();
        const description = [props.headline, props.description, props.instruction].filter(Boolean).join("\n\n");

        return {
          id: `nws-${id.replace(/[^a-zA-Z0-9_-]+/g, "-")}`,
          type,
          title: props.event || props.headline || "NWS Weather Alert",
          description: description || `Active ${type.replace("_", " ")} alert from the National Weather Service.`,
          severity: severityFromNws(props.severity),
          timestamp: new Date(timestamp).toISOString(),
          location: {
            latitude: centroid.latitude,
            longitude: centroid.longitude,
            name: props.areaDesc || props.senderName || "NWS Alert Area",
          },
          magnitude: windMph,
          source: "NWS",
          sourceUrl: "https://api.weather.gov",
          link: props["@id"] || props.id,
          affected: {
            countries: ["US"],
          },
          updates: props.instruction
            ? [{ timestamp: new Date(timestamp).toISOString(), message: props.instruction }]
            : undefined,
        };
      })
      .filter((event: GlobalEvent | null): event is GlobalEvent => Boolean(event));
  } catch (error) {
    console.error("NWS alerts fetch error:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const now = Date.now();
  const limit = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get("limit") || 10000), 25000));
  const requestedType = (request.nextUrl.searchParams.get("type") || "").toLowerCase();
  const earthquakeOnly = requestedType === "earthquake" || requestedType === "earthquakes";
  const days = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get("days") || (earthquakeOnly ? 30 : 7)), 30));
  const cacheKey = earthquakeOnly ? `earthquake:${days}` : `all:${days}`;
  
  // Return cached data if still valid
  if ((cachedEvents as any).__cacheKey === cacheKey && cachedEvents.length > 0 && now - lastFetchTime < CACHE_TTL) {
    return NextResponse.json(
      {
        events: cachedEvents.slice(0, limit),
        lastUpdated: new Date(lastFetchTime).toISOString(),
        cached: true,
        sources: {
          usgs: "online",
          noaa: "online",
          nasa_eonet: "online",
          nws: "online",
        },
      },
      { headers: { ...RESPONSE_HEADERS, "X-NatureOS-Events-Cache": "hit" } }
    );
  }
  
  // Fetch from all sources in parallel. Earthquake search embeds use a deeper,
  // earthquake-only feed so the globe never waits on unrelated layers.
  const [earthquakes, spaceWeather, eonetEvents, nwsWeather] = earthquakeOnly
    ? [await fetchUSGSEarthquakes(days), [], [], []]
    : await Promise.all([
        fetchUSGSEarthquakes(days),
        fetchNOAASpaceWeather(),
        fetchNASAEONET(),
        fetchNWSActiveWeatherAlerts(),
      ]);
  
  // Combine and sort
  const allEvents = [
    ...earthquakes,
    ...spaceWeather,
    ...eonetEvents,
    ...nwsWeather,
  ];
  
  allEvents.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Update cache
  cachedEvents = allEvents;
  (cachedEvents as any).__cacheKey = cacheKey;
  lastFetchTime = now;
  
  // Ingest events to MINDEX for persistent storage (non-blocking)
  const realEvents = [...earthquakes, ...spaceWeather, ...eonetEvents, ...nwsWeather].map(e => ({
    ...e,
    latitude: e.location?.latitude,
    longitude: e.location?.longitude,
  }));
  if (realEvents.length > 0) {
    ingestEvents("global-events", realEvents);
  }
  
  return NextResponse.json(
    {
      events: allEvents.slice(0, limit),
      lastUpdated: new Date().toISOString(),
      cached: false,
      sources: {
        usgs: earthquakes.length > 0 ? "online" : "offline",
        noaa: spaceWeather.length > 0 ? "online" : "degraded",
        nasa_eonet: eonetEvents.length > 0 ? "online" : "offline",
        nws: nwsWeather.length > 0 ? "online" : "offline",
      },
    },
    { headers: { ...RESPONSE_HEADERS, "X-NatureOS-Events-Cache": "miss" } }
  );
}
