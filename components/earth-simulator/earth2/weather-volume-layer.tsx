"use client";

/**
 * Weather Volume Layer Component
 * February 5, 2026
 * 
 * 3D volumetric cloud/precipitation rendering on CesiumJS globe
 * Fetches real data from Earth-2 API with CorrDiff high-resolution downscaling
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type GeoBounds } from "@/lib/earth2/client";

interface WeatherVolumeLayerProps {
  viewer: any; // Cesium.Viewer
  visible: boolean;
  forecastHours: number;
  opacity: number;
  variable?: "clouds" | "precipitation" | "both";
  model?: "atlas-era5" | "stormscope" | "corrdiff";
  onDataLoaded?: (stats: { cloudCover: number; precipitationRate: number }) => void;
}

interface CloudData {
  lat: number;
  lon: number;
  altitude: number;
  coverage: number;
  size: number;
  precipitation: number;
  cloudType: "cumulus" | "stratus" | "cumulonimbus" | "cirrus";
}

export function WeatherVolumeLayer({
  viewer,
  visible,
  forecastHours,
  opacity,
  variable = "both",
  model = "atlas-era5",
  onDataLoaded,
}: WeatherVolumeLayerProps) {
  const billboardsRef = useRef<any>(null);
  const pointsRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef(getEarth2Client());

  const createCloudVisualization = useCallback(async () => {
    if (!viewer || !visible) return;

    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    // Remove existing primitives
    if (billboardsRef.current) {
      viewer.scene.primitives.remove(billboardsRef.current);
    }
    if (pointsRef.current) {
      viewer.scene.primitives.remove(pointsRef.current);
    }

    setIsLoading(true);

    try {
      // Get camera view bounds
      const rectangle = viewer.camera.computeViewRectangle();
      const bounds: GeoBounds = rectangle ? {
        north: Math.min(85, Cesium.Math.toDegrees(rectangle.north)),
        south: Math.max(-85, Cesium.Math.toDegrees(rectangle.south)),
        east: Cesium.Math.toDegrees(rectangle.east),
        west: Cesium.Math.toDegrees(rectangle.west),
      } : { north: 85, south: -85, east: 180, west: -180 };

      // Fetch weather data from Earth-2 API
      const precipData = await clientRef.current.getWeatherGrid({
        variable: "tp",
        forecastHours,
        bounds,
        resolution: 0.5,
      });

      const humidityData = await clientRef.current.getWeatherGrid({
        variable: "tcwv",
        forecastHours,
        bounds,
        resolution: 0.5,
      });

      // Generate cloud data from weather grids
      const cloudData = generateCloudDataFromGrid(
        precipData.grid,
        humidityData.grid,
        bounds,
        forecastHours
      );

      // Calculate statistics
      let totalCoverage = 0;
      let totalPrecip = 0;
      cloudData.forEach(c => {
        totalCoverage += c.coverage;
        totalPrecip += c.precipitation;
      });
      const avgCoverage = cloudData.length > 0 ? totalCoverage / cloudData.length : 0;
      const avgPrecip = cloudData.length > 0 ? totalPrecip / cloudData.length : 0;
      onDataLoaded?.({ cloudCover: avgCoverage * 100, precipitationRate: avgPrecip });

      // Create billboard collection for cloud particles
      const billboards = viewer.scene.primitives.add(
        new Cesium.BillboardCollection()
      );
      billboardsRef.current = billboards;

      // Create point collection for precipitation
      const points = viewer.scene.primitives.add(
        new Cesium.PointPrimitiveCollection()
      );
      pointsRef.current = points;

      cloudData.forEach((cloud) => {
        const position = Cesium.Cartesian3.fromDegrees(
          cloud.lon,
          cloud.lat,
          cloud.altitude
        );

        // Cloud billboard
        if (variable === "clouds" || variable === "both") {
          const precipColor = getPrecipitationColor(cloud.precipitation);
          const cloudImage = createCloudImage(cloud.coverage, precipColor, cloud.cloudType);

          billboards.add({
            position,
            image: cloudImage,
            width: cloud.size,
            height: cloud.size * 0.6,
            color: Cesium.Color.fromAlpha(Cesium.Color.WHITE, opacity * cloud.coverage),
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          });
        }

        // Precipitation particles
        if ((variable === "precipitation" || variable === "both") && cloud.precipitation > 0.5) {
          for (let i = 0; i < Math.min(cloud.precipitation, 10); i++) {
            const dropPosition = Cesium.Cartesian3.fromDegrees(
              cloud.lon + (Math.random() - 0.5) * 0.5,
              cloud.lat + (Math.random() - 0.5) * 0.5,
              cloud.altitude * Math.random()
            );
            
            points.add({
              position: dropPosition,
              pixelSize: 2 + Math.random() * 2,
              color: Cesium.Color.fromCssColorString("rgba(100,150,255,0.6)"),
            });
          }
        }
      });

      console.log(`[Earth-2] Weather volume: ${cloudData.length} clouds, model=${model}, ${forecastHours}h`);
    } catch (error) {
      console.error("[Earth-2] Weather volume error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [viewer, visible, forecastHours, opacity, variable, model, onDataLoaded]);

  useEffect(() => {
    createCloudVisualization();

    return () => {
      if (viewer && billboardsRef.current) {
        viewer.scene.primitives.remove(billboardsRef.current);
      }
      if (viewer && pointsRef.current) {
        viewer.scene.primitives.remove(pointsRef.current);
      }
    };
  }, [createCloudVisualization]);

  // Update opacity
  useEffect(() => {
    if (billboardsRef.current) {
      const Cesium = (window as any).Cesium;
      if (!Cesium) return;

      for (let i = 0; i < billboardsRef.current.length; i++) {
        const billboard = billboardsRef.current.get(i);
        billboard.color = Cesium.Color.fromAlpha(Cesium.Color.WHITE, opacity);
      }
    }
  }, [opacity]);

  return null;
}

// Generate cloud data from weather grids
function generateCloudDataFromGrid(
  precipGrid: number[][],
  humidityGrid: number[][],
  bounds: GeoBounds,
  forecastHours: number
): CloudData[] {
  const clouds: CloudData[] = [];
  
  const latSteps = precipGrid.length;
  const lonSteps = precipGrid[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  for (let i = 0; i < latSteps; i += 2) { // Skip every other for performance
    for (let j = 0; j < lonSteps; j += 2) {
      const precip = precipGrid[i]?.[j] || 0;
      const humidity = humidityGrid[i]?.[j] || 0;
      
      // Only create clouds where there's sufficient humidity
      const coverage = Math.min(1, (humidity / 50) * 0.8 + (precip / 10) * 0.2);
      
      if (coverage > 0.2) {
        const lat = bounds.south + (i + 0.5) * latStep;
        const lon = bounds.west + (j + 0.5) * lonStep;
        
        // Determine cloud type based on precipitation and humidity
        let cloudType: CloudData["cloudType"] = "cumulus";
        if (precip > 5) {
          cloudType = "cumulonimbus";
        } else if (humidity > 40 && precip < 1) {
          cloudType = "stratus";
        } else if (humidity > 30 && lat > 45) {
          cloudType = "cirrus";
        }

        clouds.push({
          lat,
          lon,
          altitude: getCloudAltitude(cloudType),
          coverage,
          size: 50000 + coverage * 100000,
          precipitation: precip,
          cloudType,
        });
      }
    }
  }

  return clouds;
}

function getCloudAltitude(cloudType: CloudData["cloudType"]): number {
  switch (cloudType) {
    case "cirrus": return 10000 + Math.random() * 3000;
    case "cumulonimbus": return 8000 + Math.random() * 7000;
    case "stratus": return 2000 + Math.random() * 2000;
    case "cumulus": 
    default: return 4000 + Math.random() * 3000;
  }
}

function getPrecipitationColor(precipitation: number): string {
  if (precipitation === 0) return "rgba(255,255,255,0.5)";
  if (precipitation < 2) return "rgba(200,200,255,0.6)";
  if (precipitation < 5) return "rgba(150,150,255,0.7)";
  if (precipitation < 10) return "rgba(100,100,255,0.8)";
  return "rgba(50,50,200,0.9)";
}

function createCloudImage(coverage: number, color: string, cloudType: CloudData["cloudType"]): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  
  if (ctx) {
    // Create cloud-like shape based on type
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
    
    switch (cloudType) {
      case "cumulonimbus":
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.3, "rgba(100,100,120,0.8)");
        gradient.addColorStop(0.7, "rgba(60,60,80,0.4)");
        gradient.addColorStop(1, "rgba(40,40,60,0)");
        break;
      case "stratus":
        gradient.addColorStop(0, "rgba(180,180,190,0.6)");
        gradient.addColorStop(0.6, "rgba(160,160,170,0.4)");
        gradient.addColorStop(1, "rgba(140,140,150,0)");
        break;
      case "cirrus":
        gradient.addColorStop(0, "rgba(255,255,255,0.3)");
        gradient.addColorStop(0.5, "rgba(255,255,255,0.15)");
        gradient.addColorStop(1, "rgba(255,255,255,0)");
        break;
      default:
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, color.replace(/[\d.]+\)$/, `${coverage * 0.5})`));
        gradient.addColorStop(1, "rgba(255,255,255,0)");
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    
    // Add cloud texture for cumulus/cumulonimbus
    if (cloudType === "cumulus" || cloudType === "cumulonimbus") {
      for (let i = 0; i < 5; i++) {
        const x = 30 + Math.random() * 68;
        const y = 30 + Math.random() * 68;
        const r = 15 + Math.random() * 20;
        
        const puff = ctx.createRadialGradient(x, y, 0, x, y, r);
        puff.addColorStop(0, "rgba(255,255,255,0.3)");
        puff.addColorStop(1, "rgba(255,255,255,0)");
        
        ctx.fillStyle = puff;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  
  return canvas;
}

export default WeatherVolumeLayer;
