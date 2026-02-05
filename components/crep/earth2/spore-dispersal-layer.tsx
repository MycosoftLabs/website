"use client";

/**
 * Spore Dispersal Layer Component
 * February 5, 2026
 * 
 * Renders spore concentration zones on MapLibre using circles and fill layers
 * Fetches real spore dispersal data from Earth-2 API
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type SporeZone } from "@/lib/earth2/client";

interface SporeDispersalLayerProps {
  map: any; // MapLibre Map instance
  visible: boolean;
  forecastHours: number;
  opacity: number;
  speciesFilter?: string[];
  showConcentrationGradient?: boolean;
  onZoneClick?: (zone: SporeZone) => void;
  onDataLoaded?: (zones: SporeZone[]) => void;
}

const CIRCLE_LAYER_ID = "earth2-spore-circles";
const GRADIENT_LAYER_ID = "earth2-spore-gradient";
const LABEL_LAYER_ID = "earth2-spore-labels";
const SOURCE_ID = "earth2-spore-source";

// Risk level colors (FUSARIUM color scheme)
const RISK_COLORS = {
  low: "#22c55e",        // green-500
  moderate: "#eab308",   // yellow-500
  high: "#f97316",       // orange-500
  critical: "#ef4444",   // red-500
};

const RISK_PRIORITY = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const SPORE_LAYER_IDS = [CIRCLE_LAYER_ID, GRADIENT_LAYER_ID, LABEL_LAYER_ID];

// Debounce helper
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export function SporeDispersalLayer({
  map,
  visible,
  forecastHours,
  opacity,
  speciesFilter,
  showConcentrationGradient = true,
  onZoneClick,
  onDataLoaded,
}: SporeDispersalLayerProps) {
  const layerAddedRef = useRef(false);
  const fetchingRef = useRef(false);
  const [zones, setZones] = useState<SporeZone[]>([]);
  const clientRef = useRef(getEarth2Client());
  
  const debouncedHours = useDebouncedValue(forecastHours, 300);

  const updateData = useCallback(async () => {
    if (!map || !visible) return;
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;

    try {
      const fetchedZones = await clientRef.current.getSporeZones(debouncedHours);
      
      let filteredZones = fetchedZones;
      if (speciesFilter && speciesFilter.length > 0) {
        filteredZones = fetchedZones.filter(z => 
          speciesFilter.some(s => z.species.toLowerCase().includes(s.toLowerCase()))
        );
      }

      setZones(filteredZones);
      onDataLoaded?.(filteredZones);

      const geoJsonData = zonesToGeoJSON(filteredZones);

      // Check if source exists - UPDATE it
      const source = map.getSource(SOURCE_ID);
      if (source) {
        source.setData(geoJsonData);
      } else {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: geoJsonData,
        });

        if (showConcentrationGradient) {
          map.addLayer({
            id: GRADIENT_LAYER_ID,
            type: "circle",
            source: SOURCE_ID,
            paint: {
              "circle-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                3, ["*", ["get", "radius"], 0.15],
                6, ["*", ["get", "radius"], 0.4],
                10, ["*", ["get", "radius"], 1.2],
              ],
              "circle-color": ["get", "color"],
              "circle-opacity": opacity * 0.2,
              "circle-blur": 0.8,
            },
          });
        }

        map.addLayer({
          id: CIRCLE_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              3, ["*", ["get", "radius"], 0.08],
              6, ["*", ["get", "radius"], 0.25],
              10, ["*", ["get", "radius"], 0.6],
            ],
            "circle-color": ["get", "color"],
            "circle-opacity": opacity * 0.5,
            "circle-stroke-width": 2,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-opacity": opacity * 0.9,
          },
        });

        map.addLayer({
          id: LABEL_LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["in", ["get", "riskLevel"], ["literal", ["high", "critical"]]],
          layout: {
            "text-field": ["get", "species"],
            "text-size": 10,
            "text-offset": [0, 1.5],
            "text-anchor": "top",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 1,
            "text-opacity": opacity,
          },
        });

        if (onZoneClick) {
          map.on("click", CIRCLE_LAYER_ID, (e: any) => {
            if (e.features && e.features.length > 0) {
              const props = e.features[0].properties;
              const zone: SporeZone = {
                id: props.id,
                lat: props.lat,
                lon: props.lon,
                radius: props.radius,
                concentration: props.concentration,
                riskLevel: props.riskLevel,
                species: props.species,
              };
              onZoneClick(zone);
            }
          });
          
          map.on("mouseenter", CIRCLE_LAYER_ID, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", CIRCLE_LAYER_ID, () => {
            map.getCanvas().style.cursor = "";
          });
        }
      }

      layerAddedRef.current = true;
    } catch (error) {
      console.error("[Earth-2] Spore dispersal error:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, debouncedHours, opacity, speciesFilter, showConcentrationGradient, onZoneClick, onDataLoaded]);

  useEffect(() => {
    if (!map) return;
    const handleSetup = () => {
      if (visible) {
        updateData();
      } else {
        try {
          SPORE_LAYER_IDS.forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
          });
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
      SPORE_LAYER_IDS.forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      });
    } catch {}
  }, [map, visible]);

  useEffect(() => {
    if (!map) return;
    try {
      if (map.getLayer(CIRCLE_LAYER_ID)) {
        map.setPaintProperty(CIRCLE_LAYER_ID, "circle-opacity", opacity * 0.5);
        map.setPaintProperty(CIRCLE_LAYER_ID, "circle-stroke-opacity", opacity * 0.9);
      }
      if (map.getLayer(GRADIENT_LAYER_ID)) {
        map.setPaintProperty(GRADIENT_LAYER_ID, "circle-opacity", opacity * 0.2);
      }
      if (map.getLayer(LABEL_LAYER_ID)) {
        map.setPaintProperty(LABEL_LAYER_ID, "text-opacity", opacity);
      }
    } catch {}
  }, [map, opacity]);

  useEffect(() => {
    return () => {
      try {
        SPORE_LAYER_IDS.forEach(id => {
          if (map?.getLayer?.(id)) map.removeLayer(id);
        });
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {}
    };
  }, [map]);

  return null;
}

// Convert zones to GeoJSON
function zonesToGeoJSON(zones: SporeZone[]): GeoJSON.FeatureCollection {
  // Sort by risk priority (lower priority = rendered first = appears below)
  const sortedZones = [...zones].sort((a, b) => 
    RISK_PRIORITY[a.riskLevel] - RISK_PRIORITY[b.riskLevel]
  );

  return {
    type: "FeatureCollection",
    features: sortedZones.map((zone) => ({
      type: "Feature",
      properties: {
        id: zone.id,
        lat: zone.lat,
        lon: zone.lon,
        radius: zone.radius,
        concentration: zone.concentration,
        riskLevel: zone.riskLevel,
        species: zone.species,
        color: RISK_COLORS[zone.riskLevel],
      },
      geometry: {
        type: "Point",
        coordinates: [zone.lon, zone.lat],
      },
    })),
  };
}

// Summary component for spore data
export function SporeZoneSummary({ zones }: { zones: SporeZone[] }) {
  const bySeverity = {
    critical: zones.filter(z => z.riskLevel === "critical"),
    high: zones.filter(z => z.riskLevel === "high"),
    moderate: zones.filter(z => z.riskLevel === "moderate"),
    low: zones.filter(z => z.riskLevel === "low"),
  };

  return (
    <div className="bg-black/80 rounded px-3 py-2 text-xs space-y-1">
      <div className="text-emerald-400 font-medium">Spore Zones</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-gray-300">Critical: {bySeverity.critical.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-gray-300">High: {bySeverity.high.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-gray-300">Moderate: {bySeverity.moderate.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-300">Low: {bySeverity.low.length}</span>
        </div>
      </div>
    </div>
  );
}

export default SporeDispersalLayer;
