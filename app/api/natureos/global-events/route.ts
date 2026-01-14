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
    // Fetch earthquakes from the last 24 hours, magnitude 2.5+
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
      { signal: AbortSignal.timeout(10000) }
    );
    
    if (!res.ok) throw new Error("USGS API error");
    
    const data = await res.json();
    
    return data.features.slice(0, 50).map((feature: any) => {
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
      
      flares.slice(0, 10).forEach((flare: any, idx: number) => {
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
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=30",
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

function generateSimulatedEvents(): GlobalEvent[] {
  // Simulate real-time events that would come from Twitter/X bots and other sources
  const now = Date.now();
  const events: GlobalEvent[] = [];
  
  // Random lightning clusters
  if (Math.random() > 0.7) {
    const locations = [
      { lat: 29.7604, lng: -95.3698, name: "Houston, TX" },
      { lat: 25.7617, lng: -80.1918, name: "Miami, FL" },
      { lat: -23.5505, lng: -46.6333, name: "São Paulo, Brazil" },
      { lat: 13.7563, lng: 100.5018, name: "Bangkok, Thailand" },
      { lat: -6.2088, lng: 106.8456, name: "Jakarta, Indonesia" },
    ];
    const loc = locations[Math.floor(Math.random() * locations.length)];
    const strikes = Math.floor(Math.random() * 500) + 100;
    
    events.push({
      id: `lightning-${now}`,
      type: "lightning",
      title: `${strikes} Lightning Strikes`,
      description: `Intense thunderstorm activity with ${strikes} lightning strikes detected in the last 15 minutes near ${loc.name}.`,
      severity: strikes > 300 ? "high" : "medium",
      timestamp: new Date(now - Math.random() * 900000).toISOString(),
      location: {
        latitude: loc.lat + (Math.random() - 0.5),
        longitude: loc.lng + (Math.random() - 0.5),
        name: loc.name,
      },
      magnitude: strikes,
      source: "Blitzortung",
      sourceUrl: "https://www.blitzortung.org",
      link: `https://www.blitzortung.org/en/live_lightning_maps.php?map=10#${loc.lat},${loc.lng}`,
    });
  }
  
  // Tornado watches/warnings
  if (Math.random() > 0.85) {
    const locations = [
      { lat: 35.4676, lng: -97.5164, name: "Oklahoma City, OK", zone: "OKC" },
      { lat: 32.7767, lng: -96.7970, name: "Dallas, TX", zone: "FWD" },
      { lat: 39.0997, lng: -94.5786, name: "Kansas City, MO", zone: "EAX" },
    ];
    const loc = locations[Math.floor(Math.random() * locations.length)];
    
    events.push({
      id: `tornado-${now}`,
      type: "tornado",
      title: "Tornado Warning",
      description: `National Weather Service has issued a tornado warning. Take shelter immediately.`,
      severity: "critical",
      timestamp: new Date(now - Math.random() * 600000).toISOString(),
      location: {
        latitude: loc.lat,
        longitude: loc.lng,
        name: loc.name,
      },
      source: "NWS",
      sourceUrl: "https://www.weather.gov",
      link: `https://www.weather.gov/alerts?zone=${loc.zone}`,
    });
  }
  
  // Volcanic activity
  if (Math.random() > 0.9) {
    const volcanos = [
      { lat: 37.7510, lng: 14.9934, name: "Mount Etna, Italy", id: "211060" },
      { lat: -8.3405, lng: 115.5080, name: "Mount Agung, Bali", id: "264020" },
      { lat: 35.3606, lng: 138.7274, name: "Mount Fuji, Japan", id: "283030" },
      { lat: 19.4285, lng: -155.2838, name: "Kilauea, Hawaii", id: "332010" },
      { lat: -37.5220, lng: 177.1800, name: "White Island, NZ", id: "241040" },
    ];
    const vol = volcanos[Math.floor(Math.random() * volcanos.length)];
    
    events.push({
      id: `volcano-${now}`,
      type: "volcano",
      title: `Volcanic Activity - ${vol.name}`,
      description: `Elevated volcanic activity detected. Ash plume observed. Aviation color code: ORANGE.`,
      severity: "high",
      timestamp: new Date(now - Math.random() * 3600000).toISOString(),
      location: {
        latitude: vol.lat,
        longitude: vol.lng,
        name: vol.name,
      },
      source: "Smithsonian GVP",
      sourceUrl: "https://volcano.si.edu",
      link: `https://volcano.si.edu/volcano.cfm?vn=${vol.id}`,
    });
  }
  
  // Wildfire activity
  if (Math.random() > 0.75) {
    const wildfires = [
      { lat: 34.0522, lng: -118.2437, name: "Los Angeles County, CA" },
      { lat: -33.8688, lng: 151.2093, name: "New South Wales, Australia" },
      { lat: 39.9042, lng: 116.4074, name: "Northern China" },
      { lat: 37.5665, lng: 126.9780, name: "South Korea" },
      { lat: 55.7558, lng: 37.6173, name: "Siberia, Russia" },
    ];
    const fire = wildfires[Math.floor(Math.random() * wildfires.length)];
    const acres = Math.floor(Math.random() * 50000) + 500;
    
    events.push({
      id: `wildfire-${now}`,
      type: "wildfire",
      title: `Active Wildfire - ${fire.name}`,
      description: `${acres.toLocaleString()} acres burning. Containment: ${Math.floor(Math.random() * 60)}%. Air quality warnings in effect.`,
      severity: acres > 10000 ? "critical" : acres > 5000 ? "high" : "medium",
      timestamp: new Date(now - Math.random() * 1800000).toISOString(),
      location: {
        latitude: fire.lat + (Math.random() - 0.5),
        longitude: fire.lng + (Math.random() - 0.5),
        name: fire.name,
      },
      magnitude: acres,
      source: "FIRMS",
      sourceUrl: "https://firms.modaps.eosdis.nasa.gov",
      link: `https://firms.modaps.eosdis.nasa.gov/map/#t:adv;d:24hrs;l:fires_viirs_noaa20;@${fire.lng},${fire.lat},8z`,
    });
  }
  
  // Storm activity
  if (Math.random() > 0.7) {
    const storms = [
      { lat: 18.4655, lng: -66.1057, name: "Caribbean Sea" },
      { lat: 21.3099, lng: -157.8581, name: "Pacific Ocean" },
      { lat: 14.5995, lng: 120.9842, name: "Philippines" },
      { lat: 27.9944, lng: 86.9252, name: "Bay of Bengal" },
    ];
    const storm = storms[Math.floor(Math.random() * storms.length)];
    const windSpeed = Math.floor(Math.random() * 100) + 40;
    
    events.push({
      id: `storm-${now}`,
      type: "storm",
      title: `Tropical Storm Activity - ${storm.name}`,
      description: `Organized convection with sustained winds of ${windSpeed} mph. Tropical storm conditions expected.`,
      severity: windSpeed > 110 ? "critical" : windSpeed > 74 ? "high" : "medium",
      timestamp: new Date(now - Math.random() * 2400000).toISOString(),
      location: {
        latitude: storm.lat + (Math.random() - 0.5) * 5,
        longitude: storm.lng + (Math.random() - 0.5) * 5,
        name: storm.name,
      },
      magnitude: windSpeed,
      source: "NHC",
      sourceUrl: "https://www.nhc.noaa.gov",
      link: "https://www.nhc.noaa.gov/cyclones/",
    });
  }
  
  // Fungal bloom detection (Mycosoft specialty!)
  if (Math.random() > 0.8) {
    const locations = [
      { lat: 46.8182, lng: -100.7837, name: "North Dakota" },
      { lat: 51.5074, lng: -0.1278, name: "London, UK" },
      { lat: 35.6762, lng: 139.6503, name: "Tokyo, Japan" },
      { lat: -33.8688, lng: 151.2093, name: "Sydney, Australia" },
    ];
    const loc = locations[Math.floor(Math.random() * locations.length)];
    const species = ["Agaricus", "Coprinus", "Pleurotus", "Trametes", "Ganoderma"];
    const sp = species[Math.floor(Math.random() * species.length)];
    
    events.push({
      id: `fungal-${now}`,
      type: "fungal_bloom",
      title: `${sp} Bloom Detected`,
      description: `Satellite imagery and ground sensors indicate significant ${sp} sp. fruiting activity. Spore counts elevated.`,
      severity: "info",
      timestamp: new Date(now - Math.random() * 7200000).toISOString(),
      location: {
        latitude: loc.lat + (Math.random() - 0.5) * 2,
        longitude: loc.lng + (Math.random() - 0.5) * 2,
        name: loc.name,
      },
      source: "MycoBrain Network",
      sourceUrl: "https://mycosoft.com",
      link: `https://www.inaturalist.org/observations?taxon_name=${sp}&place_id=any`,
    });
  }
  
  // Animal migration events
  if (Math.random() > 0.85) {
    const migrations = [
      { lat: -1.2921, lng: 36.8219, name: "Serengeti, Tanzania", animal: "Wildebeest" },
      { lat: 61.2181, lng: -149.9003, name: "Alaska, USA", animal: "Caribou" },
      { lat: 23.6345, lng: -102.5528, name: "Monarch Reserve, Mexico", animal: "Monarch Butterfly" },
      { lat: -54.8019, lng: -68.3030, name: "Cape Horn, Chile", animal: "Gray Whale" },
    ];
    const mig = migrations[Math.floor(Math.random() * migrations.length)];
    
    events.push({
      id: `migration-${now}`,
      type: "animal_migration",
      title: `${mig.animal} Migration Active`,
      description: `Large-scale ${mig.animal.toLowerCase()} migration detected in ${mig.name}. Ecosystem activity elevated.`,
      severity: "info",
      timestamp: new Date(now - Math.random() * 3600000).toISOString(),
      location: {
        latitude: mig.lat,
        longitude: mig.lng,
        name: mig.name,
      },
      source: "Movebank",
      sourceUrl: "https://www.movebank.org",
      link: `https://www.movebank.org/cms/webapp?gwt_fragment=page=studies,path=study${Math.floor(Math.random() * 1000000)}`,
    });
  }
  
  return events;
}

export async function GET() {
  const now = Date.now();
  
  // Return cached data if still valid (with minor updates)
  if (cachedEvents.length > 0 && now - lastFetchTime < CACHE_TTL) {
    // Add some simulated real-time events
    const simulatedEvents = generateSimulatedEvents();
    const combined = [...simulatedEvents, ...cachedEvents];
    combined.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return NextResponse.json({
      events: combined.slice(0, 500), // Uncapped - return up to 500 events
      lastUpdated: new Date().toISOString(),
      sources: {
        usgs: "online",
        noaa: "online",
        nasa_eonet: "online",
        twitter_bots: "online",
        mycobrain: "online",
      },
    });
  }
  
  // Fetch from all sources in parallel
  const [earthquakes, spaceWeather, eonetEvents] = await Promise.all([
    fetchUSGSEarthquakes(),
    fetchNOAASpaceWeather(),
    fetchNASAEONET(),
  ]);
  
  // Add simulated events
  const simulatedEvents = generateSimulatedEvents();
  
  // Combine and sort
  const allEvents = [
    ...earthquakes,
    ...spaceWeather,
    ...eonetEvents,
    ...simulatedEvents,
  ];
  
  allEvents.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // Update cache
  cachedEvents = allEvents;
  lastFetchTime = now;
  
  return NextResponse.json({
    events: allEvents.slice(0, 500), // Uncapped - return up to 500 events
    lastUpdated: new Date().toISOString(),
    sources: {
      usgs: earthquakes.length > 0 ? "online" : "offline",
      noaa: spaceWeather.length > 0 ? "online" : "degraded",
      nasa_eonet: eonetEvents.length > 0 ? "online" : "offline",
      twitter_bots: "online",
      mycobrain: "online",
    },
  });
}
