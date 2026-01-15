"use client";

/**
 * Aircraft Marker Component for CREP Dashboard
 * 
 * Displays aircraft on the MapLibre map with real-time position,
 * heading indicator, and popup with flight details.
 * Includes smooth movement animation based on velocity and heading.
 */

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { Plane, Clock, Navigation, Gauge, ExternalLink, Radio } from "lucide-react";
import type { AircraftEntity } from "@/types/oei";

interface AircraftMarkerProps {
  aircraft: AircraftEntity;
  isSelected?: boolean;
  onClick?: () => void;
}

// Constants for animation
const ANIMATION_INTERVAL_MS = 1000; // Update every second
const KNOTS_TO_DEG_PER_SECOND = 1 / 3600 / 60; // Approximate conversion for lat/lon movement

// Get color based on altitude
function getAltitudeColor(altitude: number | null): string {
  if (!altitude) return "#6b7280"; // gray for unknown
  if (altitude < 5000) return "#22c55e"; // green - low
  if (altitude < 15000) return "#3b82f6"; // blue - medium
  if (altitude < 30000) return "#a855f7"; // purple - high
  return "#ec4899"; // pink - very high
}

// Get aircraft icon rotation based on heading
function getRotation(heading: number | null): number {
  return heading || 0;
}

export function AircraftMarker({ aircraft, isSelected = false, onClick }: AircraftMarkerProps) {
  // Guard: Ensure we have valid location data (handle both GeoJSON and flat format)
  const baseLongitude = aircraft?.location?.longitude ?? 
    (aircraft?.location?.coordinates && aircraft.location.coordinates[0]);
  const baseLatitude = aircraft?.location?.latitude ?? 
    (aircraft?.location?.coordinates && aircraft.location.coordinates[1]);
  
  // Guard: Ensure coordinates are valid numbers
  if (typeof baseLongitude !== 'number' || typeof baseLatitude !== 'number' || isNaN(baseLongitude) || isNaN(baseLatitude)) {
    return null;
  }
  
  // State for animated position
  const [animatedPosition, setAnimatedPosition] = useState({
    longitude: baseLongitude,
    latitude: baseLatitude
  });
  
  // Keep track of base position updates
  const lastBasePosition = useRef({ longitude: baseLongitude, latitude: baseLatitude });
  const animationStartTime = useRef(Date.now());
  
  // Reset animation when base position changes (new data from API)
  useEffect(() => {
    if (lastBasePosition.current.longitude !== baseLongitude || 
        lastBasePosition.current.latitude !== baseLatitude) {
      lastBasePosition.current = { longitude: baseLongitude, latitude: baseLatitude };
      setAnimatedPosition({ longitude: baseLongitude, latitude: baseLatitude });
      animationStartTime.current = Date.now();
    }
  }, [baseLongitude, baseLatitude]);
  
  // Animate position based on velocity and heading
  useEffect(() => {
    if (!aircraft.velocity || !aircraft.heading || aircraft.onGround) {
      return; // Don't animate if no velocity/heading or on ground
    }
    
    const velocityKnots = aircraft.velocity;
    const headingDeg = aircraft.heading;
    
    // Convert heading to radians
    const headingRad = (headingDeg * Math.PI) / 180;
    
    // Calculate speed in degrees per second (approximate)
    // 1 knot = 1 nautical mile per hour = 1/60 degree per hour (at equator)
    const speedDegPerSecond = (velocityKnots / 3600) / 60;
    
    const animate = () => {
      const elapsed = (Date.now() - animationStartTime.current) / 1000; // seconds
      
      // Calculate displacement
      const dLon = Math.sin(headingRad) * speedDegPerSecond * elapsed;
      const dLat = Math.cos(headingRad) * speedDegPerSecond * elapsed;
      
      setAnimatedPosition({
        longitude: baseLongitude + dLon,
        latitude: baseLatitude + dLat
      });
    };
    
    const intervalId = setInterval(animate, ANIMATION_INTERVAL_MS);
    animate(); // Run immediately
    
    return () => clearInterval(intervalId);
  }, [baseLongitude, baseLatitude, aircraft.velocity, aircraft.heading, aircraft.onGround]);
  
  const altitudeColor = getAltitudeColor(aircraft.altitude);
  const rotation = getRotation(aircraft.heading);
  
  // Use animated position for rendering
  const longitude = animatedPosition.longitude;
  const latitude = animatedPosition.latitude;
  
  return (
    <MapMarker 
      longitude={longitude} 
      latitude={latitude}
      onClick={onClick}
    >
      <MarkerContent className="relative">
        <div className={cn(
          "relative flex items-center justify-center transition-transform cursor-pointer",
          isSelected ? "scale-150" : "scale-100 hover:scale-110"
        )}>
          {/* Glow effect */}
          <div 
            className="absolute w-5 h-5 rounded-full blur-sm opacity-50"
            style={{ backgroundColor: altitudeColor }}
          />
          
          {/* Aircraft icon with rotation */}
          <div 
            className={cn(
              "relative w-4 h-4 flex items-center justify-center",
              isSelected && "ring-2 ring-white rounded-full"
            )}
            style={{ 
              transform: `rotate(${rotation}deg)`,
              color: altitudeColor,
            }}
          >
            <Plane className="w-3.5 h-3.5 fill-current" />
          </div>
          
          {/* Transponder ping animation for ADS-B equipped */}
          {aircraft.transponder && (
            <div 
              className="absolute w-6 h-6 rounded-full animate-ping opacity-30"
              style={{ backgroundColor: altitudeColor }}
            />
          )}
        </div>
      </MarkerContent>
      
      <MarkerPopup className="min-w-[240px] bg-[#0a1628]/95 backdrop-blur border-sky-500/30" closeButton>
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: `${altitudeColor}30` }}
            >
              <Plane className="w-4 h-4" style={{ color: altitudeColor }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white font-mono">
                  {aircraft.callsign || aircraft.icao24 || 'UNKNOWN'}
                </span>
                {aircraft.transponder && (
                  <Badge variant="outline" className="text-[7px] px-1 border-sky-500/50 text-sky-400">
                    ADS-B
                  </Badge>
                )}
              </div>
              <div className="text-[10px] text-gray-400">
                {aircraft.airline || 'Private/Unknown'}
              </div>
            </div>
          </div>
          
          {/* Flight Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            {/* Altitude */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
              <Gauge className="w-3 h-3 text-sky-400" />
              <div>
                <div className="text-gray-500">ALTITUDE</div>
                <div className="text-white font-bold">
                  {aircraft.altitude ? `${Math.round(aircraft.altitude).toLocaleString()} ft` : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Speed */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
              <Gauge className="w-3 h-3 text-cyan-400" />
              <div>
                <div className="text-gray-500">SPEED</div>
                <div className="text-white font-bold">
                  {aircraft.velocity ? `${Math.round(aircraft.velocity)} kts` : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Heading */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
              <Navigation className="w-3 h-3 text-amber-400" />
              <div>
                <div className="text-gray-500">HEADING</div>
                <div className="text-white font-bold">
                  {aircraft.heading ? `${Math.round(aircraft.heading)}°` : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Vertical Rate */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
              <Gauge className="w-3 h-3 text-green-400" />
              <div>
                <div className="text-gray-500">V/S</div>
                <div className={cn(
                  "font-bold",
                  aircraft.verticalRate && aircraft.verticalRate > 0 ? "text-green-400" :
                  aircraft.verticalRate && aircraft.verticalRate < 0 ? "text-red-400" : "text-white"
                )}>
                  {aircraft.verticalRate ? `${aircraft.verticalRate > 0 ? '+' : ''}${Math.round(aircraft.verticalRate)} fpm` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Route Info */}
          {(aircraft.origin || aircraft.destination) && (
            <div className="flex items-center justify-between p-1.5 rounded bg-black/30 text-[9px]">
              <span className="text-gray-400">ROUTE</span>
              <span className="text-cyan-400 font-mono font-bold">
                {aircraft.origin || '???'} → {aircraft.destination || '???'}
              </span>
            </div>
          )}
          
          {/* Aircraft Type */}
          {aircraft.aircraftType && (
            <div className="flex items-center justify-between p-1.5 rounded bg-black/30 text-[9px]">
              <span className="text-gray-400">AIRCRAFT</span>
              <span className="text-white font-mono">{aircraft.aircraftType}</span>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-700/50 text-[8px]">
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              {new Date(aircraft.lastSeen).toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Radio className="w-3 h-3" />
              ICAO: {aircraft.icao24}
            </div>
          </div>
        </div>
      </MarkerPopup>
    </MapMarker>
  );
}
