"use client";

/**
 * Storm Cells Layer Component
 * February 5, 2026
 * 
 * Renders storm cells from StormScope nowcast on MapLibre
 * Shows storm intensity, movement vectors, and threat areas
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type GeoBounds, type StormCell } from "@/lib/earth2/client";

interface StormCellsLayerProps {
  map: any;
  visible: boolean;
  forecastHours: number;
  opacity: number;
  showMovement?: boolean;
  showThreatAreas?: boolean;
  onDataLoaded?: (data: { cells: StormCell[]; severeCount: number }) => void;
}

const FILL_LAYER_ID = "earth2-storm-fill";
const OUTLINE_LAYER_ID = "earth2-storm-outline";
const MOVEMENT_LAYER_ID = "earth2-storm-movement";
const THREAT_LAYER_ID = "earth2-storm-threat";
const ICON_LAYER_ID = "earth2-storm-icons";
const SOURCE_ID = "earth2-storm-source";

// Storm intensity colors (radar reflectivity scale)
const INTENSITY_COLORS = {
  weak: "#ffeb3b",      // Yellow - weak
  moderate: "#ff9800",   // Orange - moderate
  strong: "#f44336",     // Red - strong
  severe: "#9c27b0",     // Purple - severe
  extreme: "#e91e63",    // Pink/Magenta - extreme
};

function getIntensityColor(reflectivity: number): string {
  if (reflectivity >= 60) return INTENSITY_COLORS.extreme;
  if (reflectivity >= 50) return INTENSITY_COLORS.severe;
  if (reflectivity >= 40) return INTENSITY_COLORS.strong;
  if (reflectivity >= 30) return INTENSITY_COLORS.moderate;
  return INTENSITY_COLORS.weak;
}

function getIntensityLabel(reflectivity: number): string {
  if (reflectivity >= 60) return "EXTREME";
  if (reflectivity >= 50) return "SEVERE";
  if (reflectivity >= 40) return "STRONG";
  if (reflectivity >= 30) return "MODERATE";
  return "WEAK";
}

const STORM_LAYER_IDS = [FILL_LAYER_ID, OUTLINE_LAYER_ID, MOVEMENT_LAYER_ID, THREAT_LAYER_ID, ICON_LAYER_ID];

export function StormCellsLayer({
  map,
  visible,
  forecastHours,
  opacity,
  showMovement = true,
  showThreatAreas = true,
  onDataLoaded,
}: StormCellsLayerProps) {
  const layerAddedRef = useRef(false);
  const fetchingRef = useRef(false);
  const clientRef = useRef(getEarth2Client());

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

      const cells = await clientRef.current.getStormCells(bounds);
      const severeCount = cells.filter(c => c.reflectivity >= 50).length;
      
      onDataLoaded?.({ cells, severeCount });

      const stormData = generateStormGeoJSON(cells, forecastHours, showMovement, showThreatAreas);

      // Check if source exists - UPDATE it
      const source = map.getSource(SOURCE_ID);
      if (source) {
        source.setData(stormData);
      } else {
        map.addSource(SOURCE_ID, {
          type: "geojson",
          data: stormData,
        });

        if (showThreatAreas) {
          map.addLayer({
            id: THREAT_LAYER_ID,
            type: "fill",
            source: SOURCE_ID,
            filter: ["==", ["get", "featureType"], "threat"],
            paint: {
              "fill-color": ["get", "color"],
              "fill-opacity": opacity * 0.2,
            },
          });
        }

        map.addLayer({
          id: FILL_LAYER_ID,
          type: "fill",
          source: SOURCE_ID,
          filter: ["==", ["get", "featureType"], "cell"],
          paint: {
            "fill-color": ["get", "color"],
            "fill-opacity": opacity * 0.5,
          },
        });

        map.addLayer({
          id: OUTLINE_LAYER_ID,
          type: "line",
          source: SOURCE_ID,
          filter: ["==", ["get", "featureType"], "cell"],
          paint: {
            "line-color": ["get", "color"],
            "line-width": [
              "interpolate",
              ["linear"],
              ["get", "reflectivity"],
              20, 2,
              40, 3,
              60, 5,
            ],
            "line-opacity": opacity,
          },
        });

        if (showMovement) {
          map.addLayer({
            id: MOVEMENT_LAYER_ID,
            type: "line",
            source: SOURCE_ID,
            filter: ["==", ["get", "featureType"], "movement"],
            paint: {
              "line-color": "#ffffff",
              "line-width": 2,
              "line-opacity": opacity * 0.8,
            },
            layout: {
              "line-cap": "round",
            },
          });
        }

        map.addLayer({
          id: ICON_LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          filter: ["==", ["get", "featureType"], "label"],
          layout: {
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-allow-overlap": true,
            "text-anchor": "bottom",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": ["get", "color"],
            "text-halo-width": 2,
            "text-opacity": opacity,
          },
        });
      }

      layerAddedRef.current = true;
    } catch (error) {
      console.error("[Earth-2] Storm cells layer error:", error);
    } finally {
      fetchingRef.current = false;
    }
  }, [map, visible, forecastHours, opacity, showMovement, showThreatAreas, onDataLoaded]);

  useEffect(() => {
    if (!map) return;
    const handleSetup = () => {
      if (visible) {
        updateData();
      } else {
        try {
          STORM_LAYER_IDS.forEach(id => {
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
    if (!map) return;
    try {
      STORM_LAYER_IDS.forEach(id => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        }
      });
    } catch {}
  }, [map, visible]);

  useEffect(() => {
    if (!map) return;
    try {
      if (map.getLayer(FILL_LAYER_ID)) {
        map.setPaintProperty(FILL_LAYER_ID, "fill-opacity", opacity * 0.5);
      }
      if (map.getLayer(OUTLINE_LAYER_ID)) {
        map.setPaintProperty(OUTLINE_LAYER_ID, "line-opacity", opacity);
      }
    } catch {}
  }, [map, opacity]);

  useEffect(() => {
    return () => {
      try {
        STORM_LAYER_IDS.forEach(id => {
          if (map?.getLayer?.(id)) map.removeLayer(id);
        });
        if (map?.getSource?.(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch {}
    };
  }, [map]);

  return null;
}

function generateStormGeoJSON(
  cells: StormCell[],
  forecastHours: number,
  showMovement: boolean,
  showThreatAreas: boolean
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const cell of cells) {
    const color = getIntensityColor(cell.reflectivity);
    const label = getIntensityLabel(cell.reflectivity);
    
    // Storm cell polygon (simplified as circle approximation)
    const radiusKm = cell.size / 2;
    const radiusDeg = radiusKm / 111; // Rough conversion
    const cellPolygon = generateCirclePolygon(cell.lon, cell.lat, radiusDeg, 16);

    features.push({
      type: "Feature",
      properties: {
        featureType: "cell",
        id: cell.id,
        reflectivity: cell.reflectivity,
        color,
        intensity: label,
        hasTornado: cell.hasTornado,
      },
      geometry: {
        type: "Polygon",
        coordinates: [cellPolygon],
      },
    });

    // Movement vector
    if (showMovement && cell.movementSpeed > 5) {
      const movementDist = (cell.movementSpeed * forecastHours) / 111; // km to deg
      const radians = (cell.movementDirection * Math.PI) / 180;
      const endLon = cell.lon + movementDist * Math.sin(radians);
      const endLat = cell.lat + movementDist * Math.cos(radians);

      features.push({
        type: "Feature",
        properties: {
          featureType: "movement",
          speed: cell.movementSpeed,
          direction: cell.movementDirection,
        },
        geometry: {
          type: "LineString",
          coordinates: [
            [cell.lon, cell.lat],
            [endLon, endLat],
          ],
        },
      });

      // Threat area (projected path)
      if (showThreatAreas && cell.reflectivity >= 40) {
        const threatPolygon = generateThreatPolygon(
          cell.lon, cell.lat, endLon, endLat, radiusDeg * 1.5
        );
        features.push({
          type: "Feature",
          properties: {
            featureType: "threat",
            color,
          },
          geometry: {
            type: "Polygon",
            coordinates: [threatPolygon],
          },
        });
      }
    }

    // Label
    features.push({
      type: "Feature",
      properties: {
        featureType: "label",
        label: cell.hasTornado ? "⚠️ TORNADO" : `${Math.round(cell.reflectivity)} dBZ`,
        color,
      },
      geometry: {
        type: "Point",
        coordinates: [cell.lon, cell.lat],
      },
    });
  }

  return { type: "FeatureCollection", features };
}

function generateCirclePolygon(
  centerLon: number,
  centerLat: number,
  radius: number,
  segments: number
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    coords.push([
      centerLon + radius * Math.cos(angle),
      centerLat + radius * Math.sin(angle),
    ]);
  }
  return coords;
}

function generateThreatPolygon(
  startLon: number,
  startLat: number,
  endLon: number,
  endLat: number,
  width: number
): [number, number][] {
  const dx = endLon - startLon;
  const dy = endLat - startLat;
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = (-dy / length) * width;
  const perpY = (dx / length) * width;

  return [
    [startLon + perpX, startLat + perpY],
    [endLon + perpX, endLat + perpY],
    [endLon - perpX, endLat - perpY],
    [startLon - perpX, startLat - perpY],
    [startLon + perpX, startLat + perpY],
  ];
}

export function StormCellsLegend() {
  return (
    <div className="bg-black/80 rounded px-2 py-1.5 text-[10px]">
      <div className="text-red-400 mb-1">Storm Intensity (dBZ)</div>
      <div className="space-y-0.5">
        {Object.entries(INTENSITY_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
            <span className="text-gray-400 capitalize">{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StormCellsLayer;
