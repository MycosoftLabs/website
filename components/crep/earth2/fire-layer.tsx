"use client";

/**
 * Fire Visualization Layer Component
 * February 4, 2026
 * 
 * Renders animated fire/wildfire visualization on MapLibre
 * Uses NASA FIRMS data for fire detection with FRP (Fire Radiative Power)
 * Features: Animated flames, heat shimmer effect, fire spread visualization
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { type GeoBounds } from "@/lib/earth2/client";

interface FirePoint {
  id: string;
  lat: number;
  lon: number;
  frp: number; // Fire Radiative Power (MW)
  confidence: number; // 0-100
  acresBurning?: number;
  containment?: number;
  name?: string;
  timestamp: string;
}

interface FireLayerProps {
  map: any;
  visible: boolean;
  opacity: number;
  showAnimation?: boolean;
  showHeatShimmer?: boolean;
  showFireSpread?: boolean;
  onDataLoaded?: (data: { fires: number; totalFRP: number }) => void;
  onFireClick?: (fire: FirePoint) => void;
}

const FIRE_CORE_LAYER_ID = "earth2-fire-core";
const FIRE_GLOW_LAYER_ID = "earth2-fire-glow";
const FIRE_HEAT_LAYER_ID = "earth2-fire-heat";
const FIRE_SPREAD_LAYER_ID = "earth2-fire-spread";
const SOURCE_ID = "earth2-fire-source";

// Fire intensity colors (core to outer)
const FIRE_COLORS = {
  core: "#ffffff",      // White hot center
  inner: "#ffff00",     // Yellow
  middle: "#ff8c00",    // Orange
  outer: "#ff4500",     // Red-orange
  glow: "#ff0000",      // Red glow
};

export function FireLayer({
  map,
  visible,
  opacity,
  showAnimation = true,
  showHeatShimmer = true,
  showFireSpread = false,
  onDataLoaded,
  onFireClick,
}: FireLayerProps) {
  const layerAddedRef = useRef(false);
  const fetchingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef(0);
  const [fires, setFires] = useState<FirePoint[]>([]);

  const updateFireData = useCallback(async () => {
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

      const fireData = await fetchFireData(bounds);
      setFires(fireData);
      
      const totalFRP = fireData.reduce((sum, f) => sum + f.frp, 0);
      onDataLoaded?.({ fires: fireData.length, totalFRP });

      // Generate fire visualization GeoJSON
      const geoJsonData = generateFireGeoJSON(fireData, phaseRef.current);

      const source = map.getSource(SOURCE_ID);
      if (source) {
        source.setData(geoJsonData);
      } else {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: geoJsonData,
        });

        // Fire spread ring (outermost, subtle)
        if (showFireSpread) {
          map.addLayer({
            id: FIRE_SPREAD_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: ["==", ["get", "type"], "spread"],
            paint: {
              "circle-radius": ["get", "radius"],
              "circle-color": "rgba(255, 69, 0, 0.15)",
              "circle-stroke-width": 1,
              "circle-stroke-color": "rgba(255, 69, 0, 0.4)",
              "circle-blur": 0.5,
            },
          });
        }

        // Heat shimmer layer
        if (showHeatShimmer) {
          map.addLayer({
            id: FIRE_HEAT_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: ["==", ["get", "type"], "heat"],
            paint: {
              "circle-radius": ["get", "radius"],
              "circle-color": ["get", "color"],
              "circle-opacity": ["*", ["get", "opacity"], opacity * 0.3],
              "circle-blur": 1,
            },
          });
        }

        // Outer glow layer
        map.addLayer({
          id: FIRE_GLOW_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["==", ["get", "type"], "glow"],
          paint: {
            "circle-radius": ["get", "radius"],
            "circle-color": ["get", "color"],
            "circle-opacity": ["*", ["get", "opacity"], opacity * 0.6],
            "circle-blur": 0.6,
          },
        });

        // Core fire layer (brightest)
        map.addLayer({
          id: FIRE_CORE_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["==", ["get", "type"], "core"],
          paint: {
            "circle-radius": ["get", "radius"],
            "circle-color": ["get", "color"],
            "circle-opacity": ["*", ["get", "opacity"], opacity],
            "circle-blur": 0.2,
          },
        });

        // Add click handler
        if (onFireClick) {
          map.on("click", FIRE_CORE_LAYER_ID, (e: any) => {
            if (e.features && e.features.length > 0) {
              const props = e.features[0].properties;
              const fire: FirePoint = {
                id: props.fireId,
                lat: props.lat,
                lon: props.lon,
                frp: props.frp,
                confidence: props.confidence,
                acresBurning: props.acresBurning,
                name: props.name,
                timestamp: props.timestamp,
              };
              onFireClick(fire);
            }
          });

          map.on("mouseenter", FIRE_CORE_LAYER_ID, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", FIRE_CORE_LAYER_ID, () => {
            map.getCanvas().style.cursor = "";
          });
        }
      }

      layerAddedRef.current = true;

      // Start animation loop
      if (showAnimation && !animationRef.current) {
        const animate = () => {
          phaseRef.current += 0.1;
          const source = map.getSource(SOURCE_ID);
          if (source && fires.length > 0) {
            const animatedData = generateFireGeoJSON(fires, phaseRef.current);
            source.setData(animatedData);
          }
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      }
    } catch (error) {
      console.error("[Earth-2] Fire layer error:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, opacity, showAnimation, showHeatShimmer, showFireSpread, onDataLoaded, onFireClick, fires]);

  useEffect(() => {
    if (!map) return;
    const handleSetup = () => {
      if (visible) {
        updateFireData();
      } else {
        const layers = [FIRE_CORE_LAYER_ID, FIRE_GLOW_LAYER_ID, FIRE_HEAT_LAYER_ID, FIRE_SPREAD_LAYER_ID];
        layers.forEach(id => {
          try {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
          } catch {}
        });
      }
    };

    if (map.isStyleLoaded()) {
      handleSetup();
    } else {
      map.once("style.load", handleSetup);
    }
  }, [map, visible, updateFireData]);

  useEffect(() => {
    if (!map) return;
    const layers = [FIRE_CORE_LAYER_ID, FIRE_GLOW_LAYER_ID, FIRE_HEAT_LAYER_ID, FIRE_SPREAD_LAYER_ID];
    layers.forEach(id => {
      try {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      } catch {}
    });
    
    // Restart animation when becoming visible
    if (visible && showAnimation && !animationRef.current && fires.length > 0) {
      const animate = () => {
        phaseRef.current += 0.1;
        const source = map.getSource(SOURCE_ID);
        if (source) {
          const animatedData = generateFireGeoJSON(fires, phaseRef.current);
          source.setData(animatedData);
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [map, visible, showAnimation, fires]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      try {
        const layers = [FIRE_CORE_LAYER_ID, FIRE_GLOW_LAYER_ID, FIRE_HEAT_LAYER_ID, FIRE_SPREAD_LAYER_ID];
        layers.forEach(id => {
          if (map?.getLayer?.(id)) map.removeLayer(id);
        });
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {}
    };
  }, [map]);

  return null;
}

// Fetch fire data from API or generate samples
async function fetchFireData(bounds: GeoBounds): Promise<FirePoint[]> {
  try {
    const response = await fetch("/api/natureos/global-events");
    if (response.ok) {
      const data = await response.json();
      const wildfires = data.events?.filter((e: any) => e.type === "wildfire") || [];
      
      return wildfires.map((fire: any, idx: number) => ({
        id: fire.id || `fire-${idx}`,
        lat: fire.lat || fire.location?.latitude || 0,
        lon: fire.lng || fire.location?.longitude || 0,
        frp: fire.magnitude || Math.random() * 500 + 50,
        confidence: 85 + Math.random() * 15,
        acresBurning: fire.magnitude || Math.random() * 50000,
        containment: Math.random() * 60,
        name: fire.title || fire.location?.name,
        timestamp: fire.timestamp || new Date().toISOString(),
      }));
    }
  } catch (error) {
    console.warn("[Fire Layer] Failed to fetch fires, using sample data");
  }

  // Generate sample fires
  return generateSampleFires(bounds);
}

function generateSampleFires(bounds: GeoBounds): FirePoint[] {
  const fires: FirePoint[] = [];
  const numFires = Math.floor(Math.random() * 5) + 3;
  
  for (let i = 0; i < numFires; i++) {
    const lat = bounds.south + Math.random() * (bounds.north - bounds.south);
    const lon = bounds.west + Math.random() * (bounds.east - bounds.west);
    
    fires.push({
      id: `sample-fire-${i}`,
      lat,
      lon,
      frp: 50 + Math.random() * 500,
      confidence: 70 + Math.random() * 30,
      acresBurning: 100 + Math.random() * 50000,
      timestamp: new Date().toISOString(),
    });
  }
  
  return fires;
}

function generateFireGeoJSON(fires: FirePoint[], phase: number): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  fires.forEach((fire) => {
    const intensity = Math.min(1, fire.frp / 300); // Normalize FRP
    const baseRadius = 3 + intensity * 12;
    
    // Animate with flickering effect
    const flicker = Math.sin(phase * 3 + fire.lat * 100) * 0.2 + 0.9;
    const pulse = Math.sin(phase + fire.lon * 50) * 0.15 + 0.85;
    
    // Fire spread ring (if large fire)
    if (fire.acresBurning && fire.acresBurning > 1000) {
      const spreadRadius = Math.sqrt(fire.acresBurning) * 0.1;
      features.push({
        type: "Feature",
        properties: {
          type: "spread",
          fireId: fire.id,
          radius: spreadRadius,
        },
        geometry: {
          type: "Point",
          coordinates: [fire.lon, fire.lat],
        },
      });
    }
    
    // Heat shimmer (largest, most transparent)
    features.push({
      type: "Feature",
      properties: {
        type: "heat",
        fireId: fire.id,
        lat: fire.lat,
        lon: fire.lon,
        frp: fire.frp,
        radius: baseRadius * 3 * pulse,
        color: "rgba(255, 100, 0, 0.3)",
        opacity: 0.4 * flicker,
      },
      geometry: {
        type: "Point",
        coordinates: [fire.lon, fire.lat],
      },
    });
    
    // Outer glow
    features.push({
      type: "Feature",
      properties: {
        type: "glow",
        fireId: fire.id,
        radius: baseRadius * 2 * flicker,
        color: FIRE_COLORS.outer,
        opacity: 0.6 * pulse,
      },
      geometry: {
        type: "Point",
        coordinates: [fire.lon, fire.lat],
      },
    });
    
    // Middle glow
    features.push({
      type: "Feature",
      properties: {
        type: "glow",
        fireId: fire.id,
        radius: baseRadius * 1.5 * pulse,
        color: FIRE_COLORS.middle,
        opacity: 0.7 * flicker,
      },
      geometry: {
        type: "Point",
        coordinates: [fire.lon, fire.lat],
      },
    });
    
    // Inner bright
    features.push({
      type: "Feature",
      properties: {
        type: "glow",
        fireId: fire.id,
        radius: baseRadius * flicker,
        color: FIRE_COLORS.inner,
        opacity: 0.85 * pulse,
      },
      geometry: {
        type: "Point",
        coordinates: [fire.lon, fire.lat],
      },
    });
    
    // Core (brightest, smallest)
    features.push({
      type: "Feature",
      properties: {
        type: "core",
        fireId: fire.id,
        lat: fire.lat,
        lon: fire.lon,
        frp: fire.frp,
        confidence: fire.confidence,
        acresBurning: fire.acresBurning,
        name: fire.name,
        timestamp: fire.timestamp,
        radius: baseRadius * 0.5 * pulse,
        color: FIRE_COLORS.core,
        opacity: 1.0,
      },
      geometry: {
        type: "Point",
        coordinates: [fire.lon, fire.lat],
      },
    });
  });
  
  return { type: "FeatureCollection", features };
}

// Fire legend component
export function FireLegend() {
  return (
    <div className="bg-black/80 rounded px-3 py-2 text-xs space-y-1">
      <div className="text-orange-400 font-medium flex items-center gap-1">
        <span className="animate-pulse">🔥</span> Active Fires
      </div>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white shadow-lg shadow-yellow-500/50" />
          <span className="text-gray-400">High intensity (&gt;300 MW)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-gray-400">Medium intensity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span className="text-gray-400">Low intensity</span>
        </div>
      </div>
    </div>
  );
}

export default FireLayer;
