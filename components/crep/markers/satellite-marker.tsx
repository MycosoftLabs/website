"use client";

/**
 * Satellite Marker Component for CREP Dashboard
 * 
 * Displays satellites on the MapLibre map with estimated position
 * and popup with orbital parameters.
 * Includes movement animation based on orbital velocity.
 */

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { Satellite, Clock, Globe, Radio, Gauge, Orbit } from "lucide-react";
import type { SatelliteEntity } from "@/lib/oei/connectors/satellite-tracking";

interface SatelliteMarkerProps {
  satellite: SatelliteEntity;
  isSelected?: boolean;
  onClick?: () => void;
}

// Constants for animation
const ANIMATION_INTERVAL_MS = 500; // Update every 500ms for smoother satellite motion

// Get color based on orbit type
function getOrbitColor(orbitType: string | undefined): string {
  switch (orbitType?.toUpperCase()) {
    case 'LEO': return "#22c55e"; // green - Low Earth Orbit
    case 'MEO': return "#3b82f6"; // blue - Medium Earth Orbit
    case 'GEO': return "#a855f7"; // purple - Geostationary
    case 'HEO': return "#ec4899"; // pink - Highly Elliptical
    case 'POLAR': return "#06b6d4"; // cyan - Polar
    case 'SSO': return "#eab308"; // yellow - Sun-Synchronous
    default: return "#6b7280"; // gray
  }
}

// Get object type label
function getObjectTypeLabel(objectType: string | undefined): string {
  switch (objectType?.toUpperCase()) {
    case 'PAYLOAD': return 'Satellite';
    case 'ROCKET BODY': return 'Rocket Body';
    case 'DEBRIS': return 'Space Debris';
    case 'TBA': return 'Unclassified';
    default: return objectType || 'Unknown';
  }
}

export function SatelliteMarker({ satellite, isSelected = false, onClick }: SatelliteMarkerProps) {
  // Guard: Ensure satellite data exists
  if (!satellite) return null;
  
  const orbitColor = getOrbitColor(satellite.orbitType);
  const objectTypeLabel = getObjectTypeLabel(satellite.objectType);
  
  // Get position from estimated position or defaults
  const baseLng = satellite.estimatedPosition?.longitude ?? 0;
  const baseLat = satellite.estimatedPosition?.latitude ?? 0;
  const alt = satellite.estimatedPosition?.altitude ?? satellite.orbitalParams?.apogee ?? 0;
  
  // Only render if we have valid coordinates (not both 0,0)
  if (baseLng === 0 && baseLat === 0) return null;
  
  // Guard: Ensure coordinates are valid numbers
  if (typeof baseLng !== 'number' || typeof baseLat !== 'number' || isNaN(baseLng) || isNaN(baseLat)) {
    return null;
  }
  
  // State for animated position
  const [animatedPosition, setAnimatedPosition] = useState({
    lng: baseLng,
    lat: baseLat
  });
  
  // Keep track of base position updates
  const lastBasePosition = useRef({ lng: baseLng, lat: baseLat });
  const animationStartTime = useRef(Date.now());
  
  // Reset animation when base position changes (new data from API)
  useEffect(() => {
    if (lastBasePosition.current.lng !== baseLng || 
        lastBasePosition.current.lat !== baseLat) {
      lastBasePosition.current = { lng: baseLng, lat: baseLat };
      setAnimatedPosition({ lng: baseLng, lat: baseLat });
      animationStartTime.current = Date.now();
    }
  }, [baseLng, baseLat]);
  
  // Animate satellite position based on orbital period
  useEffect(() => {
    // Calculate orbital velocity from period or use default for LEO
    // LEO satellites typically orbit at ~7.8 km/s, which translates to about 0.065 deg/s longitude at equator
    const periodMinutes = satellite.orbitalParams?.period || 90; // Default to 90 min for LEO
    
    // Angular velocity in degrees per second (360 degrees / period in seconds)
    const angularVelocityDegPerSec = 360 / (periodMinutes * 60);
    
    // For flat map, satellites primarily move east-west (longitude)
    // with slight latitude oscillation based on inclination
    const inclination = satellite.orbitalParams?.inclination || 45;
    
    const animate = () => {
      const elapsed = (Date.now() - animationStartTime.current) / 1000; // seconds
      
      // Calculate longitude displacement (primarily eastward for prograde orbits)
      // Satellites move faster than Earth rotation, so they appear to move eastward
      const dLon = angularVelocityDegPerSec * elapsed;
      
      // Calculate latitude oscillation (simplified)
      // Satellites oscillate between +/- inclination degrees
      const oscillationPeriod = periodMinutes * 60; // seconds
      const phase = (elapsed / oscillationPeriod) * 2 * Math.PI;
      const dLat = Math.sin(phase) * inclination * 0.1; // Small oscillation
      
      // Wrap longitude to stay in valid range
      let newLng = baseLng + dLon;
      while (newLng > 180) newLng -= 360;
      while (newLng < -180) newLng += 360;
      
      // Clamp latitude
      const newLat = Math.max(-85, Math.min(85, baseLat + dLat));
      
      setAnimatedPosition({
        lng: newLng,
        lat: newLat
      });
    };
    
    const intervalId = setInterval(animate, ANIMATION_INTERVAL_MS);
    animate(); // Run immediately
    
    return () => clearInterval(intervalId);
  }, [baseLng, baseLat, satellite.orbitalParams?.period, satellite.orbitalParams?.inclination]);
  
  // Use animated position for rendering
  const lng = animatedPosition.lng;
  const lat = animatedPosition.lat;
  
  return (
    <MapMarker 
      longitude={lng} 
      latitude={lat}
      onClick={onClick}
    >
      <MarkerContent className="relative">
        <div className={cn(
          "relative flex items-center justify-center transition-transform cursor-pointer",
          isSelected ? "scale-150" : "scale-100 hover:scale-110"
        )}>
          {/* Orbital ring effect */}
          <div 
            className="absolute w-6 h-6 rounded-full border border-dashed opacity-50 animate-spin"
            style={{ 
              borderColor: orbitColor,
              animationDuration: '10s'
            }}
          />
          
          {/* Glow effect */}
          <div 
            className="absolute w-4 h-4 rounded-full blur-sm opacity-60"
            style={{ backgroundColor: orbitColor }}
          />
          
          {/* Satellite icon */}
          <div 
            className={cn(
              "relative w-3 h-3 flex items-center justify-center",
              isSelected && "ring-2 ring-white rounded-full"
            )}
            style={{ color: orbitColor }}
          >
            <Satellite className="w-3 h-3" />
          </div>
          
          {/* Tracking ping animation */}
          <div 
            className="absolute w-5 h-5 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: orbitColor }}
          />
        </div>
      </MarkerContent>
      
      <MarkerPopup className="min-w-[260px] bg-[#0a1628]/95 backdrop-blur border-purple-500/30" closeButton>
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: `${orbitColor}30` }}
            >
              <Satellite className="w-4 h-4" style={{ color: orbitColor }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {satellite.name}
                </span>
                {satellite.orbitType && (
                  <Badge 
                    variant="outline" 
                    className="text-[7px] px-1"
                    style={{ borderColor: `${orbitColor}50`, color: orbitColor }}
                  >
                    {satellite.orbitType}
                  </Badge>
                )}
              </div>
              <div className="text-[10px] text-gray-400">
                {objectTypeLabel}
              </div>
            </div>
          </div>
          
          {/* NORAD ID & International Designator */}
          <div className="flex items-center justify-between p-1.5 rounded bg-black/30 text-[9px] font-mono">
            <div>
              <span className="text-gray-500">NORAD: </span>
              <span className="text-purple-400 font-bold">{satellite.noradId}</span>
            </div>
            {satellite.intlDesignator && (
              <div className="text-gray-400">{satellite.intlDesignator}</div>
            )}
          </div>
          
          {/* Current Position */}
          <div className="p-1.5 rounded bg-black/30 text-[9px]">
            <div className="text-gray-500 mb-1">ESTIMATED POSITION</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <div className="text-[8px] text-gray-600">LAT</div>
                <div className="text-white font-mono">{lat.toFixed(2)}°</div>
              </div>
              <div>
                <div className="text-[8px] text-gray-600">LNG</div>
                <div className="text-white font-mono">{lng.toFixed(2)}°</div>
              </div>
              <div>
                <div className="text-[8px] text-gray-600">ALT</div>
                <div className="text-white font-mono">{Math.round(alt)} km</div>
              </div>
            </div>
          </div>
          
          {/* Orbital Parameters */}
          {satellite.orbitalParams && (
            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
              {/* Period */}
              {satellite.orbitalParams.period && (
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <div>
                    <div className="text-gray-500">PERIOD</div>
                    <div className="text-white font-bold">
                      {satellite.orbitalParams.period.toFixed(1)} min
                    </div>
                  </div>
                </div>
              )}
              
              {/* Inclination */}
              {satellite.orbitalParams.inclination && (
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
                  <Orbit className="w-3 h-3 text-cyan-400" />
                  <div>
                    <div className="text-gray-500">INCL</div>
                    <div className="text-white font-bold">
                      {satellite.orbitalParams.inclination.toFixed(1)}°
                    </div>
                  </div>
                </div>
              )}
              
              {/* Apogee */}
              {satellite.orbitalParams.apogee && (
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
                  <Globe className="w-3 h-3 text-purple-400" />
                  <div>
                    <div className="text-gray-500">APOGEE</div>
                    <div className="text-white font-bold">
                      {Math.round(satellite.orbitalParams.apogee)} km
                    </div>
                  </div>
                </div>
              )}
              
              {/* Perigee */}
              {satellite.orbitalParams.perigee && (
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
                  <Globe className="w-3 h-3 text-green-400" />
                  <div>
                    <div className="text-gray-500">PERIGEE</div>
                    <div className="text-white font-bold">
                      {Math.round(satellite.orbitalParams.perigee)} km
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Launch Info */}
          {satellite.launchDate && (
            <div className="flex items-center justify-between p-1.5 rounded bg-black/30 text-[9px]">
              <span className="text-gray-400">LAUNCHED</span>
              <span className="text-white font-mono">
                {new Date(satellite.launchDate).toLocaleDateString()}
              </span>
            </div>
          )}
          
          {/* Country */}
          {satellite.country && (
            <div className="flex items-center justify-between p-1.5 rounded bg-black/30 text-[9px]">
              <span className="text-gray-400">COUNTRY</span>
              <span className="text-white">{satellite.country}</span>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-700/50 text-[8px]">
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              Updated: {new Date(satellite.lastSeen || satellite.lastSeenAt || Date.now()).toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <Radio className="w-3 h-3" />
              TLE
            </div>
          </div>
        </div>
      </MarkerPopup>
    </MapMarker>
  );
}
