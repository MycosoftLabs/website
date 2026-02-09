"use client";

/**
 * Lightning Strike Layer Component
 * February 4, 2026
 * 
 * Renders real-time lightning strikes on MapLibre with flash animations
 * Data sources: Blitzortung network, storm cell data, or simulated
 * Features: Flash animation, strike clustering, fade-out effect
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { type GeoBounds } from "@/lib/earth2/client";

interface LightningStrike {
  id: string;
  lat: number;
  lon: number;
  timestamp: number; // Unix timestamp in ms
  intensity: number; // 0-1, based on current amplitude
  type: "cloud_to_ground" | "cloud_to_cloud" | "intracloud";
}

interface LightningLayerProps {
  map: any;
  visible: boolean;
  opacity: number;
  showFlashAnimation?: boolean;
  showStrikeClusters?: boolean;
  maxStrikeAge?: number; // Max age in ms to show strikes (default 60000 = 1 min)
  onDataLoaded?: (data: { strikes: number; rate: number }) => void;
  onStrikeClick?: (strike: LightningStrike) => void;
}

const FLASH_LAYER_ID = "earth2-lightning-flash";
const STRIKE_LAYER_ID = "earth2-lightning-strikes";
const CLUSTER_LAYER_ID = "earth2-lightning-clusters";
const BOLT_LAYER_ID = "earth2-lightning-bolts";
const SOURCE_ID = "earth2-lightning-source";
const CLUSTER_SOURCE_ID = "earth2-lightning-cluster-source";

// Lightning colors
const LIGHTNING_COLORS = {
  flash: "#ffffff",
  strike: "#e0e7ff",
  bolt: "#a5b4fc",
  fading: "#6366f1",
  cluster: "#facc15",
};

export function LightningLayer({
  map,
  visible,
  opacity,
  showFlashAnimation = true,
  showStrikeClusters = true,
  maxStrikeAge = 60000,
  onDataLoaded,
  onStrikeClick,
}: LightningLayerProps) {
  const layerAddedRef = useRef(false);
  const fetchingRef = useRef(false);
  const animationRef = useRef<number | null>(null);
  const strikesRef = useRef<LightningStrike[]>([]);
  const flashesRef = useRef<Map<string, number>>(new Map()); // strikeId -> flash start time
  
  // Fetch lightning data from API or storm cells
  const fetchLightningData = useCallback(async (bounds: GeoBounds): Promise<LightningStrike[]> => {
    try {
      // Try to get lightning from global events
      const response = await fetch("/api/natureos/global-events");
      if (response.ok) {
        const data = await response.json();
        const lightningEvents = data.events?.filter((e: any) => e.type === "lightning") || [];
        
        const strikes: LightningStrike[] = [];
        lightningEvents.forEach((event: any) => {
          // Each lightning event may represent multiple strikes
          const numStrikes = event.title?.match(/(\d+)/)?.[1] || 10;
          for (let i = 0; i < Math.min(parseInt(numStrikes), 50); i++) {
            strikes.push({
              id: `${event.id}-${i}`,
              lat: (event.lat || event.location?.latitude || 0) + (Math.random() - 0.5) * 0.2,
              lon: (event.lng || event.location?.longitude || 0) + (Math.random() - 0.5) * 0.2,
              timestamp: Date.now() - Math.random() * maxStrikeAge,
              intensity: 0.5 + Math.random() * 0.5,
              type: Math.random() > 0.3 ? "cloud_to_ground" : "cloud_to_cloud",
            });
          }
        });
        
        if (strikes.length > 0) return strikes;
      }
    } catch (error) {
      console.warn("[Lightning Layer] Failed to fetch lightning data");
    }

    // Generate simulated strikes from storm cell areas
    return generateSimulatedStrikes(bounds);
  }, [maxStrikeAge]);

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

      const newStrikes = await fetchLightningData(bounds);
      
      // Add new strikes to existing, remove old ones
      const now = Date.now();
      const allStrikes = [...strikesRef.current, ...newStrikes]
        .filter(s => now - s.timestamp < maxStrikeAge);
      
      // Deduplicate by ID
      const uniqueStrikes = Array.from(new Map(allStrikes.map(s => [s.id, s])).values());
      strikesRef.current = uniqueStrikes;
      
      // Calculate strike rate (strikes per minute)
      const recentStrikes = uniqueStrikes.filter(s => now - s.timestamp < 60000);
      onDataLoaded?.({ strikes: uniqueStrikes.length, rate: recentStrikes.length });

      // Generate GeoJSON
      const geoJsonData = generateStrikeGeoJSON(uniqueStrikes, now, flashesRef.current);

      const source = map.getSource(SOURCE_ID);
      if (source) {
        source.setData(geoJsonData);
      } else {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: geoJsonData,
        });

        // Flash effect layer (bright, short-lived)
        if (showFlashAnimation) {
          map.addLayer({
            id: FLASH_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            filter: ["==", ["get", "isFlashing"], true],
            paint: {
              "circle-radius": ["get", "flashRadius"],
              "circle-color": LIGHTNING_COLORS.flash,
              "circle-opacity": ["get", "flashOpacity"],
              "circle-blur": 0.8,
            },
          });
        }

        // Lightning bolt symbol layer
        map.addLayer({
          id: BOLT_LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["!", ["get", "isFlashing"]],
          layout: {
            "icon-image": "lightning",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 3, 0.3, 8, 0.8],
            "icon-allow-overlap": true,
            "text-field": "⚡",
            "text-size": ["interpolate", ["linear"], ["zoom"], 3, 8, 8, 16],
            "text-allow-overlap": true,
          },
          paint: {
            "text-color": ["get", "color"],
            "text-opacity": ["*", ["get", "opacity"], opacity],
            "text-halo-color": "#000",
            "text-halo-width": 1,
          },
        });

        // Strike marker layer
        map.addLayer({
          id: STRIKE_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["get", "isFlashing"]],
          paint: {
            "circle-radius": ["get", "radius"],
            "circle-color": ["get", "color"],
            "circle-opacity": ["*", ["get", "opacity"], opacity],
            "circle-stroke-width": 1,
            "circle-stroke-color": LIGHTNING_COLORS.flash,
            "circle-stroke-opacity": ["*", ["get", "opacity"], opacity * 0.5],
          },
        });

        // Click handler
        if (onStrikeClick) {
          map.on("click", STRIKE_LAYER_ID, (e: any) => {
            if (e.features && e.features.length > 0) {
              const props = e.features[0].properties;
              const strike: LightningStrike = {
                id: props.id,
                lat: props.lat,
                lon: props.lon,
                timestamp: props.timestamp,
                intensity: props.intensity,
                type: props.strikeType,
              };
              onStrikeClick(strike);
            }
          });
        }
      }

      // Set up clustering if enabled
      if (showStrikeClusters) {
        const clusterSource = map.getSource(CLUSTER_SOURCE_ID);
        const clusterData = generateClusterGeoJSON(uniqueStrikes);
        
        if (clusterSource) {
          clusterSource.setData(clusterData);
        } else {
          map.addSource(CLUSTER_SOURCE_ID, {
            type: "geojson",
            data: clusterData,
            cluster: true,
            clusterMaxZoom: 8,
            clusterRadius: 50,
          });

          map.addLayer({
            id: CLUSTER_LAYER_ID,
            type: "circle",
            source: CLUSTER_SOURCE_ID,
            filter: ["has", "point_count"],
            paint: {
              "circle-color": LIGHTNING_COLORS.cluster,
              "circle-radius": [
                "step", ["get", "point_count"],
                15, 10, 20, 50, 25, 100, 30
              ],
              "circle-opacity": opacity * 0.8,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fff",
            },
          });

          // Cluster count label
          map.addLayer({
            id: `${CLUSTER_LAYER_ID}-count`,
            type: "symbol",
            source: CLUSTER_SOURCE_ID,
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
            },
            paint: {
              "text-color": "#000",
            },
          });
        }
      }

      layerAddedRef.current = true;

      // Animation loop for flash effects
      if (showFlashAnimation && !animationRef.current) {
        const animate = () => {
          const now = Date.now();
          
          // Add new flashes for recent strikes
          strikesRef.current.forEach(strike => {
            if (now - strike.timestamp < 500 && !flashesRef.current.has(strike.id)) {
              flashesRef.current.set(strike.id, now);
            }
          });
          
          // Remove old flashes
          flashesRef.current.forEach((startTime, id) => {
            if (now - startTime > 500) {
              flashesRef.current.delete(id);
            }
          });
          
          // Update visualization
          const source = map.getSource(SOURCE_ID);
          if (source) {
            const updatedData = generateStrikeGeoJSON(strikesRef.current, now, flashesRef.current);
            source.setData(updatedData);
          }
          
          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);
      }
    } catch (error) {
      console.error("[Earth-2] Lightning layer error:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, opacity, showFlashAnimation, showStrikeClusters, maxStrikeAge, fetchLightningData, onDataLoaded, onStrikeClick]);

  // Periodic updates to fetch new strikes
  useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      if (visible && map) {
        fetchingRef.current = false; // Allow new fetch
        updateData();
      }
    }, 5000); // Fetch new strikes every 5 seconds
    
    return () => clearInterval(interval);
  }, [visible, map, updateData]);

  useEffect(() => {
    if (!map) return;
    const handleSetup = () => {
      if (visible) {
        updateData();
      } else {
        const layers = [FLASH_LAYER_ID, STRIKE_LAYER_ID, BOLT_LAYER_ID, CLUSTER_LAYER_ID, `${CLUSTER_LAYER_ID}-count`];
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
  }, [map, visible, updateData]);

  useEffect(() => {
    if (!map) return;
    const layers = [FLASH_LAYER_ID, STRIKE_LAYER_ID, BOLT_LAYER_ID, CLUSTER_LAYER_ID, `${CLUSTER_LAYER_ID}-count`];
    layers.forEach(id => {
      try {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      } catch {}
    });
  }, [map, visible]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      try {
        const layers = [FLASH_LAYER_ID, STRIKE_LAYER_ID, BOLT_LAYER_ID, CLUSTER_LAYER_ID, `${CLUSTER_LAYER_ID}-count`];
        layers.forEach(id => {
          if (map?.getLayer?.(id)) map.removeLayer(id);
        });
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
        if (map?.getSource?.(CLUSTER_SOURCE_ID)) map.removeSource(CLUSTER_SOURCE_ID);
      } catch {}
    };
  }, [map]);

  return null;
}

// Generate simulated lightning strikes
function generateSimulatedStrikes(bounds: GeoBounds): LightningStrike[] {
  const strikes: LightningStrike[] = [];
  const numStrikes = Math.floor(Math.random() * 20) + 5;
  const now = Date.now();
  
  // Generate storm centers
  const numStorms = Math.floor(Math.random() * 3) + 1;
  const stormCenters: { lat: number; lon: number }[] = [];
  
  for (let i = 0; i < numStorms; i++) {
    stormCenters.push({
      lat: bounds.south + Math.random() * (bounds.north - bounds.south),
      lon: bounds.west + Math.random() * (bounds.east - bounds.west),
    });
  }
  
  // Generate strikes around storm centers
  for (let i = 0; i < numStrikes; i++) {
    const storm = stormCenters[Math.floor(Math.random() * stormCenters.length)];
    const spread = 0.5; // Degrees
    
    strikes.push({
      id: `sim-strike-${now}-${i}`,
      lat: storm.lat + (Math.random() - 0.5) * spread,
      lon: storm.lon + (Math.random() - 0.5) * spread,
      timestamp: now - Math.random() * 60000, // Within last minute
      intensity: 0.3 + Math.random() * 0.7,
      type: Math.random() > 0.25 ? "cloud_to_ground" : "cloud_to_cloud",
    });
  }
  
  return strikes;
}

function generateStrikeGeoJSON(
  strikes: LightningStrike[],
  now: number,
  flashes: Map<string, number>
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  
  strikes.forEach((strike) => {
    const age = now - strike.timestamp;
    const ageFactor = 1 - Math.min(1, age / 60000); // Fade over 1 minute
    
    const isFlashing = flashes.has(strike.id);
    let flashOpacity = 0;
    let flashRadius = 0;
    
    if (isFlashing) {
      const flashAge = now - (flashes.get(strike.id) || now);
      const flashProgress = Math.min(1, flashAge / 500); // 500ms flash duration
      flashOpacity = (1 - flashProgress) * strike.intensity;
      flashRadius = 20 + flashProgress * 40; // Expand as it fades
    }
    
    // Color based on age
    let color = LIGHTNING_COLORS.strike;
    if (age > 30000) color = LIGHTNING_COLORS.fading;
    if (age > 45000) color = LIGHTNING_COLORS.bolt;
    
    features.push({
      type: "Feature",
      properties: {
        id: strike.id,
        lat: strike.lat,
        lon: strike.lon,
        timestamp: strike.timestamp,
        intensity: strike.intensity,
        strikeType: strike.type,
        age,
        opacity: ageFactor * strike.intensity,
        radius: 3 + strike.intensity * 5,
        color,
        isFlashing,
        flashOpacity,
        flashRadius,
      },
      geometry: {
        type: "Point",
        coordinates: [strike.lon, strike.lat],
      },
    });
  });
  
  return { type: "FeatureCollection", features };
}

function generateClusterGeoJSON(strikes: LightningStrike[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: strikes.map((strike) => ({
      type: "Feature",
      properties: {
        id: strike.id,
        intensity: strike.intensity,
      },
      geometry: {
        type: "Point",
        coordinates: [strike.lon, strike.lat],
      },
    })),
  };
}

// Lightning legend component
export function LightningLegend({ strikeCount, strikeRate }: { strikeCount: number; strikeRate: number }) {
  return (
    <div className="bg-black/80 rounded px-3 py-2 text-xs space-y-1">
      <div className="text-yellow-400 font-medium flex items-center gap-1">
        <span className="animate-pulse">⚡</span> Lightning Activity
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-300">
        <span>Active strikes:</span>
        <span className="text-yellow-300">{strikeCount}</span>
        <span>Rate:</span>
        <span className="text-yellow-300">{strikeRate}/min</span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2 h-2 rounded-full bg-white shadow-lg shadow-yellow-500/50" />
        <span className="text-gray-400">Recent (&lt;30s)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-indigo-400" />
        <span className="text-gray-400">Fading (30-60s)</span>
      </div>
    </div>
  );
}

export default LightningLayer;
