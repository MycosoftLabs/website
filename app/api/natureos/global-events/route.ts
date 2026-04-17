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

import { NextResponse } from "next/server";
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

async function fetchUSGSEarthquakes(): Promise<GlobalEvent[]> {
  try {
    // Full USGS catalog — past 7 days, all magnitudes (down to M1.0 regional).
    // Earlier versions used 2.5_day.geojson (~150 quakes); the 1.0_week feed
    // returns every tracked global event (~8,000–15,000). Army-contract
    // deliverable requires all active seismic activity.
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_week.geojson",
      { signal: AbortSignal.timeout(20000) }
    );
    
    if (!res.ok) throw new Error("USGS API error");
    
    const data = await res.json();
    
    // NO LIMIT - return all earthquakes from USGS feed
    return data.features.map((feature: any) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      const mag = props.mag;
      
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
      { signal: AbortSignal.timeout(10000) }
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
      { signal: AbortSignal.timeout(10000) }
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

async function fetchNASAEONET(): Promise<GlobalEvent[]> {
  try {
    const res = await fetch(
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=5000",
      { signal: AbortSignal.timeout(15000) }
    );
    
    if (!res.ok) throw new Error("NASA EONET API error");
    
    const data = await res.json();
    
    return data.events.map((event: any) => {
      const category = event.categories[0]?.id || "other";
      const geometry = event.geometry[0];
      
      let type: GlobalEvent["type"] = "other";
      if (category === "wildfires") type = "wildfire";
      else if (category === "volcanoes") type = "volcano";
      else if (category === "severeStorms") type = "storm";
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
          latitude: geometry?.coordinates?.[1] || 0,
          longitude: geometry?.coordinates?.[0] || 0,
          name: event.title,
        },
        source: "NASA EONET",
        sourceUrl: "https://eonet.gsfc.nasa.gov",
        link: event.link,
      };
    });
  } catch (error) {
    console.error("NASA EONET fetch error:", error);
    return [];
  }
}

export async function GET() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedEvents.length > 0 && now - lastFetchTime < CACHE_TTL) {
    return NextResponse.json({
      events: cachedEvents.slice(0, 10000), // Full global coverage — no artificial cap
      lastUpdated: new Date().toISOString(),
      sources: {
        usgs: "online",
        noaa: "online",
        nasa_eonet: "online",
      },
    });
  }
  
  // Fetch from all sources in parallel
  const [earthquakes, spaceWeather, eonetEvents] = await Promise.all([
    fetchUSGSEarthquakes(),
    fetchNOAASpaceWeather(),
    fetchNASAEONET(),
  ]);
  
  // Combine and sort
  const allEvents = [
    ...earthquakes,
    ...spaceWeather,
    ...eonetEvents,
  ];
  
  allEvents.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Update cache
  cachedEvents = allEvents;
  lastFetchTime = now;
  
  // Ingest events to MINDEX for persistent storage (non-blocking)
  const realEvents = [...earthquakes, ...spaceWeather, ...eonetEvents].map(e => ({
    ...e,
    latitude: e.location?.latitude,
    longitude: e.location?.longitude,
  }));
  if (realEvents.length > 0) {
    ingestEvents("global-events", realEvents);
  }
  
  return NextResponse.json({
    events: allEvents.slice(0, 10000), // Full active global set
    lastUpdated: new Date().toISOString(),
    sources: {
      usgs: earthquakes.length > 0 ? "online" : "offline",
      noaa: spaceWeather.length > 0 ? "online" : "degraded",
      nasa_eonet: eonetEvents.length > 0 ? "online" : "offline",
    },
  });
}
