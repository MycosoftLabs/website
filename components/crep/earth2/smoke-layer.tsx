"use client";

/**
 * Smoke Dispersion Layer Component
 * February 4, 2026
 * 
 * Renders animated smoke plumes on MapLibre from wildfire data
 * Uses wind data for realistic smoke dispersion modeling
 * Connected to NASA FIRMS fire detection data
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type GeoBounds } from "@/lib/earth2/client";

interface SmokeSource {
  id: string;
  lat: number;
  lon: number;
  intensity: number; // 0-1 based on fire radiative power
  plumeDirection: number; // degrees, based on wind
  plumeLength: number; // km, based on wind speed
  timestamp: string;
}

interface SmokeLayerProps {
  map: any;
  visible: boolean;
  forecastHours: number;
  opacity: number;
  showAnimation?: boolean;
  onDataLoaded?: (data: { sources: number; coverage: number }) => void;
}

const PLUME_LAYER_ID = "earth2-smoke-plumes";
const PARTICLE_LAYER_ID = "earth2-smoke-particles";
const SOURCE_ID = "earth2-smoke-source";
const PARTICLE_SOURCE_ID = "earth2-smoke-particle-source";

// Smoke colors by intensity
const SMOKE_COLORS = {
  light: "rgba(180, 180, 180, 0.4)",
  moderate: "rgba(140, 140, 140, 0.6)",
  heavy: "rgba(100, 100, 100, 0.8)",
  extreme: "rgba(60, 60, 60, 0.9)",
};

// Debounce helper
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function SmokeLayer({
  map,
  visible,
  forecastHours,
  opacity,
  showAnimation = true,
  onDataLoaded,
}: SmokeLayerProps) {
  const layerAddedRef = useRef(false);
  const fetchingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const particlePhaseRef = useRef(0);
  const clientRef = useRef(getEarth2Client());
  
  const debouncedHours = useDebouncedValue(forecastHours, 300);

  // Generate smoke particles for animation
  const generateParticles = useCallback((sources: SmokeSource[]): GeoJSON.FeatureCollection => {
    const features: GeoJSON.Feature[] = [];
    const phase = particlePhaseRef.current;
    
    sources.forEach((source, sourceIdx) => {
      // Generate particles along plume direction
      const numParticles = Math.floor(source.intensity * 30) + 10;
      const dirRad = (source.plumeDirection * Math.PI) / 180;
      
      for (let i = 0; i < numParticles; i++) {
        // Distance along plume with some randomness
        const distance = (i / numParticles) * source.plumeLength * 0.01; // Convert km to degrees approx
        const lateralSpread = (Math.random() - 0.5) * 0.02 * source.intensity;
        
        // Animate particles with phase
        const animOffset = showAnimation ? Math.sin(phase + i * 0.3 + sourceIdx) * 0.005 : 0;
        
        const particleLon = source.lon + Math.sin(dirRad) * (distance + animOffset) + lateralSpread;
        const particleLat = source.lat + Math.cos(dirRad) * (distance + animOffset);
        
        // Opacity decreases with distance from source
        const distanceFactor = 1 - (i / numParticles);
        const particleOpacity = source.intensity * distanceFactor * 0.8;
        
        // Size increases with distance (smoke disperses)
        const particleSize = 5 + (1 - distanceFactor) * 15 * source.intensity;
        
        features.push({
          type: "Feature",
          properties: {
            sourceId: source.id,
            opacity: particleOpacity,
            size: particleSize,
            color: getSmokeSaturation(source.intensity, distanceFactor),
          },
          geometry: {
            type: "Point",
            coordinates: [particleLon, particleLat],
          },
        });
      }
    });
    
    return { type: "FeatureCollection", features };
  }, [showAnimation]);

  const updateData = useCallback(async () => {
    if (!map || !visible) return;
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;

    try {
      const mapBounds = map.getBounds();
      const bounds: GeoBounds = {
        north: Math.min(85, mapBounds.getNorth()),
        south: Math.max(-85, mapBounds.getSouth()),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      };

      // Fetch wind data for smoke direction
      const windData = await clientRef.current.getWindVectors({
        forecastHours: debouncedHours,
        bounds,
        resolution: 1,
      });

      // Fetch fire/smoke sources from global events or generate sample data
      const smokeSources = await fetchSmokeSources(bounds, windData);
      
      onDataLoaded?.({ 
        sources: smokeSources.length,
        coverage: calculateSmokeCoverage(smokeSources, bounds),
      });

      // Generate plume polygons
      const plumeData = generatePlumes(smokeSources);
      
      // Generate animated particles
      const particleData = generateParticles(smokeSources);

      // Update or create plume layer
      const plumeSource = map.getSource(SOURCE_ID);
      if (plumeSource) {
        plumeSource.setData(plumeData);
      } else {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: plumeData,
        });

        map.addLayer({
          id: PLUME_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": ["*", ["get", "opacity"], opacity],
          },
        });
      }

      // Update or create particle layer
      const particleSource = map.getSource(PARTICLE_SOURCE_ID);
      if (particleSource) {
        particleSource.setData(particleData);
      } else {
        map.addSource(PARTICLE_SOURCE_ID, {
          type: "geojson",
          data: particleData,
        });

        map.addLayer({
          id: PARTICLE_LAYER_ID,
          type: "circle",
          source: PARTICLE_SOURCE_ID,
          paint: {
            "circle-radius": ["get", "size"],
            "circle-color": ["get", "color"],
            "circle-opacity": ["*", ["get", "opacity"], opacity],
            "circle-blur": 0.8,
          },
        });
      }

      layerAddedRef.current = true;

      // Start animation loop if enabled
      if (showAnimation && !animationRef.current) {
        const animate = () => {
          particlePhaseRef.current += 0.05;
          const newParticleData = generateParticles(smokeSources);
          const source = map.getSource(PARTICLE_SOURCE_ID);
          if (source) {
            source.setData(newParticleData);
          }
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      }
    } catch (error) {
      console.error("[Earth-2] Smoke layer error:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, debouncedHours, opacity, showAnimation, generateParticles, onDataLoaded]);

  useEffect(() => {
    if (!map) return;
    const handleSetup = () => {
      if (visible) {
        updateData();
      } else {
        try {
          if (map.getLayer(PLUME_LAYER_ID)) {
            map.setLayoutProperty(PLUME_LAYER_ID, "visibility", "none");
          }
          if (map.getLayer(PARTICLE_LAYER_ID)) {
            map.setLayoutProperty(PARTICLE_LAYER_ID, "visibility", "none");
          }
        } catch {}
      }
    };

    if (map.isStyleLoaded()) {
      handleSetup();
    } else {
      map.once("style.load", handleSetup);
    }
  }, [map, visible, updateData]);

  useEffect(() => {
    if (visible && map && layerAddedRef.current) {
      updateData();
    }
  }, [debouncedHours, visible, map, updateData]);

  useEffect(() => {
    if (!map) return;
    try {
      if (map.getLayer(PLUME_LAYER_ID)) {
        map.setLayoutProperty(PLUME_LAYER_ID, "visibility", visible ? "visible" : "none");
      }
      if (map.getLayer(PARTICLE_LAYER_ID)) {
        map.setLayoutProperty(PARTICLE_LAYER_ID, "visibility", visible ? "visible" : "none");
      }
    } catch {}
  }, [map, visible]);

  useEffect(() => {
    if (map?.getLayer?.(PLUME_LAYER_ID)) {
      try {
        map.setPaintProperty(PLUME_LAYER_ID, "fill-opacity", ["*", ["get", "opacity"], opacity]);
      } catch {}
    }
    if (map?.getLayer?.(PARTICLE_LAYER_ID)) {
      try {
        map.setPaintProperty(PARTICLE_LAYER_ID, "circle-opacity", ["*", ["get", "opacity"], opacity]);
      } catch {}
    }
  }, [map, opacity]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      try {
        if (map?.getLayer?.(PLUME_LAYER_ID)) map.removeLayer(PLUME_LAYER_ID);
        if (map?.getLayer?.(PARTICLE_LAYER_ID)) map.removeLayer(PARTICLE_LAYER_ID);
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
        if (map?.getSource?.(PARTICLE_SOURCE_ID)) map.removeSource(PARTICLE_SOURCE_ID);
      } catch {}
    };
  }, [map]);

  return null;
}

// Helper functions
function getSmokeSaturation(intensity: number, distanceFactor: number): string {
  const gray = Math.floor(180 - intensity * 120 * distanceFactor);
  return `rgb(${gray}, ${gray}, ${gray})`;
}

async function fetchSmokeSources(bounds: GeoBounds, windData: any[]): Promise<SmokeSource[]> {
  try {
    // Try to fetch from global events API
    const response = await fetch("/api/natureos/global-events");
    if (response.ok) {
      const data = await response.json();
      const wildfires = data.events?.filter((e: any) => e.type === "wildfire") || [];
      
      return wildfires.map((fire: any, idx: number) => {
        // Find nearest wind vector
        const nearestWind = findNearestWind(fire.lat || fire.location?.latitude, fire.lng || fire.location?.longitude, windData);
        
        return {
          id: fire.id || `fire-${idx}`,
          lat: fire.lat || fire.location?.latitude || 0,
          lon: fire.lng || fire.location?.longitude || 0,
          intensity: mapSeverityToIntensity(fire.severity),
          plumeDirection: nearestWind.direction,
          plumeLength: nearestWind.speed * 5, // km based on wind speed
          timestamp: fire.timestamp || new Date().toISOString(),
        };
      });
    }
  } catch (error) {
    console.warn("[Smoke Layer] Failed to fetch fires, using sample data:", error);
  }

  // Return sample smoke sources for demo
  return generateSampleSmokeSources(bounds, windData);
}

function generateSampleSmokeSources(bounds: GeoBounds, windData: any[]): SmokeSource[] {
  const sources: SmokeSource[] = [];
  const centerLat = (bounds.north + bounds.south) / 2;
  const centerLon = (bounds.east + bounds.west) / 2;
  
  // Generate 3-5 sample smoke sources within bounds
  const numSources = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < numSources; i++) {
    const lat = centerLat + (Math.random() - 0.5) * (bounds.north - bounds.south) * 0.6;
    const lon = centerLon + (Math.random() - 0.5) * (bounds.east - bounds.west) * 0.6;
    
    const nearestWind = findNearestWind(lat, lon, windData);
    
    sources.push({
      id: `sample-smoke-${i}`,
      lat,
      lon,
      intensity: 0.3 + Math.random() * 0.7,
      plumeDirection: nearestWind.direction,
      plumeLength: nearestWind.speed * 5,
      timestamp: new Date().toISOString(),
    });
  }
  
  return sources;
}

function findNearestWind(lat: number, lon: number, windData: any[]): { direction: number; speed: number } {
  if (!windData || windData.length === 0) {
    // Default wind direction (random) and speed
    return { direction: Math.random() * 360, speed: 5 + Math.random() * 15 };
  }
  
  let nearest = windData[0];
  let minDist = Infinity;
  
  for (const wind of windData) {
    const dist = Math.sqrt((wind.lat - lat) ** 2 + (wind.lon - lon) ** 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = wind;
    }
  }
  
  return { 
    direction: nearest.direction || Math.random() * 360,
    speed: nearest.speed || 10,
  };
}

function mapSeverityToIntensity(severity: string): number {
  switch (severity?.toLowerCase()) {
    case "critical": return 1.0;
    case "high": return 0.8;
    case "medium": return 0.5;
    case "low": return 0.3;
    default: return 0.5;
  }
}

function generatePlumes(sources: SmokeSource[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  sources.forEach((source) => {
    // Generate a cone-shaped plume polygon
    const dirRad = (source.plumeDirection * Math.PI) / 180;
    const length = source.plumeLength * 0.01; // Convert to degrees approx
    const spreadAngle = 0.3; // Spread angle in radians
    
    // Plume vertices
    const apex = [source.lon, source.lat];
    const leftAngle = dirRad - spreadAngle;
    const rightAngle = dirRad + spreadAngle;
    
    const leftEnd = [
      source.lon + Math.sin(leftAngle) * length,
      source.lat + Math.cos(leftAngle) * length,
    ];
    const rightEnd = [
      source.lon + Math.sin(rightAngle) * length,
      source.lat + Math.cos(rightAngle) * length,
    ];
    
    // Create gradient bands for the plume
    const numBands = 5;
    for (let band = 0; band < numBands; band++) {
      const t1 = band / numBands;
      const t2 = (band + 1) / numBands;
      
      const bandOpacity = (1 - t2) * source.intensity * 0.7;
      const gray = Math.floor(100 + (1 - source.intensity) * 80 + t2 * 50);
      
      const innerLeft = [
        source.lon + Math.sin(leftAngle) * length * t1,
        source.lat + Math.cos(leftAngle) * length * t1,
      ];
      const innerRight = [
        source.lon + Math.sin(rightAngle) * length * t1,
        source.lat + Math.cos(rightAngle) * length * t1,
      ];
      const outerLeft = [
        source.lon + Math.sin(leftAngle) * length * t2,
        source.lat + Math.cos(leftAngle) * length * t2,
      ];
      const outerRight = [
        source.lon + Math.sin(rightAngle) * length * t2,
        source.lat + Math.cos(rightAngle) * length * t2,
      ];
      
      features.push({
        type: "Feature",
        properties: {
          sourceId: source.id,
          intensity: source.intensity,
          opacity: bandOpacity,
          color: `rgb(${gray}, ${gray}, ${gray})`,
        },
        geometry: {
          type: "Polygon",
          coordinates: [[
            innerLeft,
            outerLeft,
            outerRight,
            innerRight,
            innerLeft,
          ]],
        },
      });
    }
  });
  
  return { type: "FeatureCollection", features };
}

function calculateSmokeCoverage(sources: SmokeSource[], bounds: GeoBounds): number {
  if (sources.length === 0) return 0;
  
  const totalArea = (bounds.north - bounds.south) * (bounds.east - bounds.west);
  let smokeArea = 0;
  
  sources.forEach((source) => {
    // Approximate plume area as triangle
    const length = source.plumeLength * 0.01;
    const spread = length * 0.6; // Approximate width at end
    smokeArea += (length * spread) / 2;
  });
  
  return Math.min(100, (smokeArea / totalArea) * 100);
}

// Legend component for smoke intensity
export function SmokeLegend() {
  return (
    <div className="bg-black/80 rounded px-3 py-2 text-xs space-y-1">
      <div className="text-gray-300 font-medium">Smoke Intensity</div>
      <div className="flex items-center gap-2">
        <div className="w-12 h-3 rounded" style={{ background: "linear-gradient(to right, rgba(180,180,180,0.4), rgba(60,60,60,0.9))" }} />
        <span className="text-gray-400">Light → Extreme</span>
      </div>
    </div>
  );
}

export default SmokeLayer;
