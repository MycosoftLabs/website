"use client";

/**
 * Spore Particle System Component
 * February 5, 2026
 * 
 * 3D spore dispersal particle animation on CesiumJS globe
 * Combines Earth-2 wind data with FUSARIUM spore concentration zones
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { getEarth2Client, type SporeZone, type GeoBounds } from "@/lib/earth2/client";

interface SporeParticleSystemProps {
  viewer: any; // Cesium.Viewer
  visible: boolean;
  forecastHours: number;
  opacity: number;
  speciesFilter?: string[];
  showConcentrationZones?: boolean;
  showParticleTrails?: boolean;
  particleCount?: number;
  onZoneClick?: (zone: SporeZone) => void;
  onDataLoaded?: (zones: SporeZone[]) => void;
}

// Risk level colors (FUSARIUM color scheme)
const RISK_COLORS = {
  low: [34, 197, 94],        // green-500
  moderate: [234, 179, 8],   // yellow-500
  high: [249, 115, 22],      // orange-500
  critical: [239, 68, 68],   // red-500
};

export function SporeParticleSystem({
  viewer,
  visible,
  forecastHours,
  opacity,
  speciesFilter,
  showConcentrationZones = true,
  showParticleTrails = true,
  particleCount = 500,
  onZoneClick,
  onDataLoaded,
}: SporeParticleSystemProps) {
  const entitiesRef = useRef<any[]>([]);
  const particlesRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);
  const [zones, setZones] = useState<SporeZone[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const clientRef = useRef(getEarth2Client());

  const createSporeSystem = useCallback(async () => {
    if (!viewer || !visible) return;

    const Cesium = (window as any).Cesium;
    if (!Cesium) return;

    // Clean up existing entities
    entitiesRef.current.forEach((entity) => {
      viewer.entities.remove(entity);
    });
    entitiesRef.current = [];
    
    particlesRef.current.forEach((p) => {
      viewer.entities.remove(p.entity);
    });
    particlesRef.current = [];

    // Stop animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsLoading(true);

    try {
      // Fetch spore zones from Earth-2 API
      const fetchedZones = await clientRef.current.getSporeZones(forecastHours);
      
      // Apply species filter
      let filteredZones = fetchedZones;
      if (speciesFilter && speciesFilter.length > 0) {
        filteredZones = fetchedZones.filter(z => 
          speciesFilter.some(s => z.species.toLowerCase().includes(s.toLowerCase()))
        );
      }

      setZones(filteredZones);
      onDataLoaded?.(filteredZones);

      // Also fetch wind data for particle movement
      const rectangle = viewer.camera.computeViewRectangle();
      const bounds: GeoBounds = rectangle ? {
        north: Math.min(85, Cesium.Math.toDegrees(rectangle.north)),
        south: Math.max(-85, Cesium.Math.toDegrees(rectangle.south)),
        east: Cesium.Math.toDegrees(rectangle.east),
        west: Cesium.Math.toDegrees(rectangle.west),
      } : { north: 85, south: -85, east: 180, west: -180 };

      const windData = await clientRef.current.getWindVectors({
        forecastHours,
        bounds,
      });

      // Create concentration zone visualizations
      if (showConcentrationZones) {
        filteredZones.forEach((zone) => {
          const [r, g, b] = RISK_COLORS[zone.riskLevel];
          const color = Cesium.Color.fromBytes(r, g, b, Math.round(opacity * 150));
          const outlineColor = Cesium.Color.fromBytes(r, g, b, Math.round(opacity * 255));

          // Zone cylinder (3D representation)
          const zoneHeight = 1000 + (zone.concentration / 1000) * 5000;
          const zoneEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(zone.lon, zone.lat, 0),
            cylinder: {
              length: zoneHeight,
              topRadius: zone.radius * 500,
              bottomRadius: zone.radius * 1000,
              material: color,
              outline: true,
              outlineColor: outlineColor,
              outlineWidth: 1,
            },
            properties: {
              type: "spore_zone",
              id: zone.id,
              species: zone.species,
              riskLevel: zone.riskLevel,
              concentration: zone.concentration,
            },
          });
          entitiesRef.current.push(zoneEntity);

          // Zone label
          const labelEntity = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(zone.lon, zone.lat, zoneHeight + 1000),
            billboard: {
              image: createZoneIcon(zone, Cesium),
              width: 40,
              height: 40,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            },
            label: {
              text: `${zone.species}\n${zone.concentration.toFixed(0)} spores/m³`,
              font: "bold 10px sans-serif",
              fillColor: Cesium.Color.WHITE,
              style: Cesium.LabelStyle.FILL_AND_OUTLINE,
              outlineWidth: 2,
              outlineColor: Cesium.Color.BLACK,
              pixelOffset: new Cesium.Cartesian2(0, -50),
              showBackground: true,
              backgroundColor: Cesium.Color.fromBytes(r, g, b, 200),
              backgroundPadding: new Cesium.Cartesian2(6, 4),
              distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2000000),
            },
          });
          entitiesRef.current.push(labelEntity);

          // Ground ellipse for zone extent
          const groundZone = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(zone.lon, zone.lat, 0),
            ellipse: {
              semiMajorAxis: zone.radius * 1500,
              semiMinorAxis: zone.radius * 1500,
              material: Cesium.Color.fromBytes(r, g, b, 50),
              outline: true,
              outlineColor: outlineColor,
              outlineWidth: 2,
            },
          });
          entitiesRef.current.push(groundZone);
        });
      }

      // Create spore particles
      const particlesPerZone = Math.floor(particleCount / Math.max(filteredZones.length, 1));
      
      filteredZones.forEach((zone) => {
        const [r, g, b] = RISK_COLORS[zone.riskLevel];
        
        for (let i = 0; i < particlesPerZone; i++) {
          // Random position within zone radius
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * zone.radius * 0.01; // Convert to degrees approx
          const lat = zone.lat + Math.sin(angle) * distance;
          const lon = zone.lon + Math.cos(angle) * distance / Math.cos(zone.lat * Math.PI / 180);
          const alt = 100 + Math.random() * 2000;

          const particle = viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
            point: {
              pixelSize: 3 + Math.random() * 3,
              color: Cesium.Color.fromBytes(r, g, b, Math.round(opacity * 200)),
            },
          });

          particlesRef.current.push({
            entity: particle,
            lat,
            lon,
            alt,
            originLat: zone.lat,
            originLon: zone.lon,
            originRadius: zone.radius * 0.02,
            age: Math.random() * 100,
            color: [r, g, b],
          });
        }
      });

      // Animate particles using wind data
      if (showParticleTrails && particlesRef.current.length > 0) {
        animateSporeParticles(
          viewer,
          particlesRef.current,
          windData,
          bounds,
          opacity,
          Cesium,
          animationRef
        );
      }

      // Add click handler for zones
      if (onZoneClick) {
        viewer.screenSpaceEventHandler.setInputAction((click: any) => {
          const pickedObject = viewer.scene.pick(click.position);
          if (pickedObject && pickedObject.id && pickedObject.id.properties) {
            const props = pickedObject.id.properties;
            if (props.type && props.type.getValue() === "spore_zone") {
              const zone = filteredZones.find(z => z.id === props.id.getValue());
              if (zone) onZoneClick(zone);
            }
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      }

      console.log(`[Earth-2] Spore particles: ${filteredZones.length} zones, ${particlesRef.current.length} particles`);
    } catch (error) {
      console.error("[Earth-2] Spore particle error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [viewer, visible, forecastHours, opacity, speciesFilter, showConcentrationZones, showParticleTrails, particleCount, onZoneClick, onDataLoaded]);

  useEffect(() => {
    createSporeSystem();

    return () => {
      entitiesRef.current.forEach((entity) => {
        if (viewer) viewer.entities.remove(entity);
      });
      particlesRef.current.forEach((p) => {
        if (viewer) viewer.entities.remove(p.entity);
      });
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [createSporeSystem, viewer]);

  return null;
}

// Create zone icon
function createZoneIcon(zone: SporeZone, Cesium: any): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const [r, g, b] = RISK_COLORS[zone.riskLevel];
    
    // Background circle
    ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.beginPath();
    ctx.arc(20, 20, 18, 0, Math.PI * 2);
    ctx.fill();
    
    // Border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Spore symbol (simplified fungal icon)
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(20, 15, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(15, 32);
    ctx.lineTo(20, 28);
    ctx.lineTo(25, 32);
    ctx.closePath();
    ctx.fill();
  }

  return canvas;
}

// Animate spore particles using wind data
function animateSporeParticles(
  viewer: any,
  particles: any[],
  windData: { u: number[][]; v: number[][] },
  bounds: GeoBounds,
  opacity: number,
  Cesium: any,
  animationRef: React.MutableRefObject<number | null>
) {
  const latSteps = windData.u.length;
  const lonSteps = windData.u[0]?.length || 1;
  const latStep = (bounds.north - bounds.south) / latSteps;
  const lonStep = (bounds.east - bounds.west) / lonSteps;

  const animate = () => {
    particles.forEach((p) => {
      // Get wind at particle position
      const i = Math.floor((p.lat - bounds.south) / latStep);
      const j = Math.floor((p.lon - bounds.west) / lonStep);
      
      if (i >= 0 && i < latSteps && j >= 0 && j < lonSteps) {
        const u = windData.u[i]?.[j] || 0;
        const v = windData.v[i]?.[j] || 0;
        
        // Move particle with wind + some random turbulence
        p.lon += u * 0.00003 + (Math.random() - 0.5) * 0.0001;
        p.lat += v * 0.00003 + (Math.random() - 0.5) * 0.0001;
        p.alt += (Math.random() - 0.5) * 50; // Vertical turbulence
        p.age++;
        
        // Keep altitude in range
        p.alt = Math.max(50, Math.min(5000, p.alt));
        
        // Reset if too far from origin or too old
        const distFromOrigin = Math.sqrt(
          Math.pow(p.lat - p.originLat, 2) + 
          Math.pow(p.lon - p.originLon, 2)
        );
        
        if (distFromOrigin > p.originRadius * 3 || p.age > 300) {
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * p.originRadius * 0.5;
          p.lat = p.originLat + Math.sin(angle) * distance;
          p.lon = p.originLon + Math.cos(angle) * distance / Math.cos(p.originLat * Math.PI / 180);
          p.alt = 100 + Math.random() * 1000;
          p.age = 0;
        }
        
        // Update position
        p.entity.position = Cesium.Cartesian3.fromDegrees(p.lon, p.lat, p.alt);
        
        // Fade based on age
        const ageFade = Math.max(0.3, 1 - (p.age / 300));
        p.entity.point.color = Cesium.Color.fromBytes(
          p.color[0], 
          p.color[1], 
          p.color[2], 
          Math.round(opacity * 200 * ageFade)
        );
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  animationRef.current = requestAnimationFrame(animate);
}

export default SporeParticleSystem;
