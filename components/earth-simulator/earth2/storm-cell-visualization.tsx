"use client";

/**
 * Storm Cell Visualization Component
 * February 5, 2026
 * 
 * 3D storm cell rendering from StormScope nowcast data on CesiumJS globe
 * Fetches real storm cell data from Earth-2 API
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type StormCell } from "@/lib/earth2/client";

interface StormCellVisualizationProps {
  viewer: any; // Cesium.Viewer
  visible: boolean;
  forecastMinutes: number;
  opacity: number;
  showLightning?: boolean;
  showTornadoWarnings?: boolean;
  onStormClick?: (storm: StormCell) => void;
  onDataLoaded?: (storms: StormCell[]) => void;
}

// Reflectivity color scale (NWS standard)
const REFLECTIVITY_COLORS = [
  { dbz: 20, color: [0, 192, 0] },      // Light green
  { dbz: 30, color: [0, 255, 0] },      // Green
  { dbz: 40, color: [255, 255, 0] },    // Yellow
  { dbz: 50, color: [255, 128, 0] },    // Orange
  { dbz: 55, color: [255, 0, 0] },      // Red
  { dbz: 60, color: [128, 0, 128] },    // Purple
  { dbz: 65, color: [255, 0, 255] },    // Magenta
];

function getReflectivityColor(dbz: number): [number, number, number] {
  for (let i = REFLECTIVITY_COLORS.length - 1; i >= 0; i--) {
    if (dbz >= REFLECTIVITY_COLORS[i].dbz) {
      return REFLECTIVITY_COLORS[i].color as [number, number, number];
    }
  }
  return [0, 192, 0];
}

export function StormCellVisualization({
  viewer,
  visible,
  forecastMinutes,
  opacity,
  showLightning = true,
  showTornadoWarnings = true,
  onStormClick,
  onDataLoaded,
}: StormCellVisualizationProps) {
  const entitiesRef = useRef<any[]>([]);
  const lightningIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [storms, setStorms] = useState<StormCell[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef(getEarth2Client());

  const createStormCells = useCallback(async () => {
    if (!viewer || !visible) return;

    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    // Clean up existing entities
    entitiesRef.current.forEach((entity) => {
      viewer.entities.remove(entity);
    });
    entitiesRef.current = [];

    // Stop lightning animation
    if (lightningIntervalRef.current) {
      clearInterval(lightningIntervalRef.current);
      lightningIntervalRef.current = null;
    }

    setIsLoading(true);

    try {
      // Fetch storm cells from Earth-2 StormScope API
      const fetchedStorms = await clientRef.current.getStormCells();
      setStorms(fetchedStorms);
      onDataLoaded?.(fetchedStorms);

      fetchedStorms.forEach((cell) => {
        const [r, g, b] = getReflectivityColor(cell.reflectivity);
        const color = Cesium.Color.fromBytes(r, g, b, Math.round(opacity * 200));
        
        // Storm cell cylinder
        const stormEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(cell.lon, cell.lat, 0),
          cylinder: {
            length: cell.topAltitude,
            topRadius: getStormRadius(cell.intensity) * 1000,
            bottomRadius: getStormRadius(cell.intensity) * 600,
            material: color,
            outline: true,
            outlineColor: Cesium.Color.WHITE.withAlpha(opacity * 0.5),
            outlineWidth: 1,
          },
          properties: {
            type: "storm_cell",
            id: cell.id,
            intensity: cell.intensity,
            stormType: cell.type,
          },
        });
        entitiesRef.current.push(stormEntity);

        // Storm info label
        const iconEntity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            cell.lon,
            cell.lat,
            cell.topAltitude + 2000
          ),
          billboard: {
            image: createStormIcon(cell),
            width: 48,
            height: 48,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            heightReference: Cesium.HeightReference.NONE,
          },
          label: {
            text: `${cell.reflectivity} dBZ\n${cell.type.replace("_", " ")}`,
            font: "bold 11px sans-serif",
            fillColor: Cesium.Color.WHITE,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            outlineColor: Cesium.Color.BLACK,
            pixelOffset: new Cesium.Cartesian2(0, -55),
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.7),
            backgroundPadding: new Cesium.Cartesian2(6, 4),
          },
        });
        entitiesRef.current.push(iconEntity);

        // Add movement vector
        if (cell.movementSpeed > 0) {
          const endLat = cell.lat + 
            (cell.movementSpeed * 3600) / 111000 * 
            Math.cos((cell.movementDirection * Math.PI) / 180);
          const endLon = cell.lon +
            (cell.movementSpeed * 3600) /
            (111000 * Math.cos((cell.lat * Math.PI) / 180)) *
            Math.sin((cell.movementDirection * Math.PI) / 180);

          const vectorEntity = viewer.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights([
                cell.lon, cell.lat, cell.topAltitude,
                endLon, endLat, cell.topAltitude,
              ]),
              width: 4,
              material: new Cesium.PolylineArrowMaterialProperty(
                Cesium.Color.YELLOW.withAlpha(opacity * 0.8)
              ),
            },
          });
          entitiesRef.current.push(vectorEntity);
        }

        // Tornado warning zone
        if (cell.hasTornado && showTornadoWarnings) {
          const tornadoEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(cell.lon, cell.lat, 0),
            ellipse: {
              semiMajorAxis: 5000,
              semiMinorAxis: 5000,
              material: Cesium.Color.RED.withAlpha(0.25),
              outline: true,
              outlineColor: Cesium.Color.RED,
              outlineWidth: 4,
            },
          });
          entitiesRef.current.push(tornadoEntity);

          // Rotating tornado indicator
          const tornadoCone = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(cell.lon, cell.lat, 0),
            cylinder: {
              length: 3000,
              topRadius: 100,
              bottomRadius: 2000,
              material: Cesium.Color.fromCssColorString("rgba(100,50,50,0.6)"),
            },
          });
          entitiesRef.current.push(tornadoCone);
        }

        // Hail indicator
        if (cell.hasHail) {
          const hailEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(cell.lon, cell.lat, cell.topAltitude * 0.7),
            point: {
              pixelSize: 15,
              color: Cesium.Color.CYAN,
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 2,
            },
          });
          entitiesRef.current.push(hailEntity);
        }
      });

      // Lightning animation
      if (showLightning) {
        const lightningCells = fetchedStorms.filter((c) => c.hasLightning);
        
        if (lightningCells.length > 0) {
          lightningIntervalRef.current = setInterval(() => {
            const randomCell = lightningCells[Math.floor(Math.random() * lightningCells.length)];
            flashLightning(viewer, randomCell, Cesium);
          }, 1500);
        }
      }

      // Add click handler
      if (onStormClick) {
        viewer.screenSpaceEventHandler.setInputAction((click: any) => {
          const pickedObject = viewer.scene.pick(click.position);
          if (pickedObject && pickedObject.id && pickedObject.id.properties) {
            const props = pickedObject.id.properties;
            if (props.type && props.type.getValue() === "storm_cell") {
              const storm = fetchedStorms.find(s => s.id === props.id.getValue());
              if (storm) onStormClick(storm);
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }

      console.log(`[Earth-2] Storm cells: ${fetchedStorms.length} active storms`);
    } catch (error) {
      console.error("[Earth-2] Storm cell error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [viewer, visible, forecastMinutes, opacity, showLightning, showTornadoWarnings, onStormClick, onDataLoaded]);

  useEffect(() => {
    createStormCells();

    return () => {
      entitiesRef.current.forEach((entity) => {
        if (viewer) viewer.entities.remove(entity);
      });
      if (lightningIntervalRef.current) {
        clearInterval(lightningIntervalRef.current);
      }
    };
  }, [createStormCells, viewer]);

  return null;
}

// Helper functions
function getStormRadius(intensity: StormCell["intensity"]): number {
  switch (intensity) {
    case "severe": return 35;
    case "strong": return 25;
    case "moderate": return 18;
    default: return 12;
  }
}

function createStormIcon(cell: StormCell): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    // Background circle
    const [r, g, b] = getReflectivityColor(cell.reflectivity);
    ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
    ctx.beginPath();
    ctx.arc(24, 24, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Lightning bolt if applicable
    if (cell.hasLightning) {
      ctx.strokeStyle = "#FFD700";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(24, 10);
      ctx.lineTo(18, 24);
      ctx.lineTo(26, 24);
      ctx.lineTo(20, 38);
      ctx.stroke();
    }

    // Tornado indicator
    if (cell.hasTornado) {
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(24, 24, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hail indicator
    if (cell.hasHail) {
      ctx.fillStyle = "#00FFFF";
      ctx.beginPath();
      ctx.arc(36, 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  return canvas;
}

function flashLightning(viewer: any, cell: StormCell, Cesium: any) {
  const offsetLon = cell.lon + (Math.random() - 0.5) * 0.3;
  const offsetLat = cell.lat + (Math.random() - 0.5) * 0.3;
  
  // Lightning bolt line
  const boltEntity = viewer.entities.add({
    polyline: {
      positions: Cesium.Cartesian3.fromDegreesArrayHeights([
        offsetLon, offsetLat, cell.topAltitude,
        offsetLon + (Math.random() - 0.5) * 0.1, offsetLat + (Math.random() - 0.5) * 0.1, cell.topAltitude * 0.5,
        offsetLon + (Math.random() - 0.5) * 0.05, offsetLat + (Math.random() - 0.5) * 0.05, 0,
      ]),
      width: 3,
      material: Cesium.Color.YELLOW,
    },
  });

  // Flash point
  const flashEntity = viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(
      offsetLon,
      offsetLat,
      cell.topAltitude * Math.random()
    ),
    point: {
      pixelSize: 30,
      color: Cesium.Color.WHITE,
    },
  });

  setTimeout(() => {
    viewer.entities.remove(boltEntity);
    viewer.entities.remove(flashEntity);
  }, 150);
}

export default StormCellVisualization;
