"use client";

/**
 * Vessel Marker Component for CREP Dashboard
 * 
 * Displays vessels on the MapLibre map with real-time AIS position,
 * heading indicator, and popup with vessel details.
 */

import { cn } from "@/lib/utils";
import { MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { Ship, Clock, Navigation, Gauge, Anchor, Container, Fish, Sailboat } from "lucide-react";
import type { VesselEntity } from "@/types/oei";

interface VesselMarkerProps {
  vessel: VesselEntity;
  isSelected?: boolean;
  onClick?: () => void;
}

// Get vessel type icon and color
function getVesselStyle(shipType: number | null): { icon: React.ReactNode; color: string; label: string } {
  // AIS ship type codes
  if (!shipType) return { icon: <Ship className="w-3.5 h-3.5" />, color: "#6b7280", label: "Unknown" };
  
  // Fishing vessels (30)
  if (shipType === 30) return { icon: <Fish className="w-3.5 h-3.5" />, color: "#22c55e", label: "Fishing" };
  
  // Cargo ships (70-79)
  if (shipType >= 70 && shipType <= 79) return { icon: <Container className="w-3.5 h-3.5" />, color: "#f59e0b", label: "Cargo" };
  
  // Tankers (80-89)
  if (shipType >= 80 && shipType <= 89) return { icon: <Ship className="w-3.5 h-3.5" />, color: "#ef4444", label: "Tanker" };
  
  // Passenger ships (60-69)
  if (shipType >= 60 && shipType <= 69) return { icon: <Ship className="w-3.5 h-3.5" />, color: "#3b82f6", label: "Passenger" };
  
  // Sailing vessels (36)
  if (shipType === 36) return { icon: <Sailboat className="w-3.5 h-3.5" />, color: "#06b6d4", label: "Sailing" };
  
  // Tugs (52)
  if (shipType === 52) return { icon: <Anchor className="w-3.5 h-3.5" />, color: "#a855f7", label: "Tug" };
  
  // Default
  return { icon: <Ship className="w-3.5 h-3.5" />, color: "#6366f1", label: "Vessel" };
}

// Get navigation status
function getNavStatus(status: number | null): { label: string; color: string } {
  switch (status) {
    case 0: return { label: "Underway (engine)", color: "text-green-400" };
    case 1: return { label: "At anchor", color: "text-amber-400" };
    case 2: return { label: "Not under command", color: "text-red-400" };
    case 3: return { label: "Restricted maneuverability", color: "text-orange-400" };
    case 4: return { label: "Constrained by draught", color: "text-yellow-400" };
    case 5: return { label: "Moored", color: "text-blue-400" };
    case 6: return { label: "Aground", color: "text-red-500" };
    case 7: return { label: "Fishing", color: "text-green-500" };
    case 8: return { label: "Underway (sailing)", color: "text-cyan-400" };
    default: return { label: "Unknown", color: "text-gray-400" };
  }
}

export function VesselMarker({ vessel, isSelected = false, onClick }: VesselMarkerProps) {
  // Guard: Ensure we have valid location data
  if (!vessel?.location?.coordinates || vessel.location.coordinates.length < 2) {
    return null;
  }
  
  const [longitude, latitude] = vessel.location.coordinates;
  
  // Guard: Ensure coordinates are valid numbers
  if (typeof longitude !== 'number' || typeof latitude !== 'number' || isNaN(longitude) || isNaN(latitude)) {
    return null;
  }
  
  const vesselStyle = getVesselStyle(vessel.shipType);
  const navStatus = getNavStatus(vessel.navStatus);
  const rotation = vessel.heading || vessel.cog || 0;
  
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
            style={{ backgroundColor: vesselStyle.color }}
          />
          
          {/* Vessel icon with rotation */}
          <div 
            className={cn(
              "relative w-4 h-4 flex items-center justify-center",
              isSelected && "ring-2 ring-white rounded-full"
            )}
            style={{ 
              transform: `rotate(${rotation}deg)`,
              color: vesselStyle.color,
            }}
          >
            {vesselStyle.icon}
          </div>
          
          {/* AIS ping animation */}
          <div 
            className="absolute w-6 h-6 rounded-full animate-ping opacity-20"
            style={{ backgroundColor: vesselStyle.color }}
          />
        </div>
      </MarkerContent>
      
      <MarkerPopup className="min-w-[260px] bg-[#0a1628]/95 backdrop-blur border-teal-500/30" closeButton>
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: `${vesselStyle.color}30` }}
            >
              <span style={{ color: vesselStyle.color }}>{vesselStyle.icon}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  {vessel.name || 'UNNAMED'}
                </span>
                <Badge 
                  variant="outline" 
                  className="text-[7px] px-1"
                  style={{ borderColor: `${vesselStyle.color}50`, color: vesselStyle.color }}
                >
                  {vesselStyle.label}
                </Badge>
              </div>
              <div className="text-[10px] text-gray-400 font-mono">
                MMSI: {vessel.mmsi}
              </div>
            </div>
          </div>
          
          {/* Navigation Status */}
          <div className={cn(
            "flex items-center gap-2 p-1.5 rounded bg-black/30 text-[9px]",
            navStatus.color
          )}>
            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{navStatus.label}</span>
          </div>
          
          {/* Vessel Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
            {/* Speed */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
              <Gauge className="w-3 h-3 text-teal-400" />
              <div>
                <div className="text-gray-500">SPEED</div>
                <div className="text-white font-bold">
                  {vessel.sog ? `${vessel.sog.toFixed(1)} kts` : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Course */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
              <Navigation className="w-3 h-3 text-amber-400" />
              <div>
                <div className="text-gray-500">COURSE</div>
                <div className="text-white font-bold">
                  {vessel.cog ? `${Math.round(vessel.cog)}°` : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Heading */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
              <Navigation className="w-3 h-3 text-cyan-400" />
              <div>
                <div className="text-gray-500">HEADING</div>
                <div className="text-white font-bold">
                  {vessel.heading ? `${Math.round(vessel.heading)}°` : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Draught */}
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-black/30">
              <Anchor className="w-3 h-3 text-blue-400" />
              <div>
                <div className="text-gray-500">DRAUGHT</div>
                <div className="text-white font-bold">
                  {vessel.draught ? `${vessel.draught.toFixed(1)} m` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Vessel Dimensions */}
          {(vessel.length || vessel.width) && (
            <div className="flex items-center justify-between p-1.5 rounded bg-black/30 text-[9px]">
              <span className="text-gray-400">DIMENSIONS</span>
              <span className="text-white font-mono">
                {vessel.length || '?'} × {vessel.width || '?'} m
              </span>
            </div>
          )}
          
          {/* Route Info */}
          {vessel.destination && (
            <div className="flex items-center justify-between p-1.5 rounded bg-black/30 text-[9px]">
              <span className="text-gray-400">DESTINATION</span>
              <span className="text-teal-400 font-mono font-bold">
                {vessel.destination}
              </span>
            </div>
          )}
          
          {/* ETA */}
          {vessel.eta && (
            <div className="flex items-center justify-between p-1.5 rounded bg-black/30 text-[9px]">
              <span className="text-gray-400">ETA</span>
              <span className="text-white font-mono">
                {new Date(vessel.eta).toLocaleString()}
              </span>
            </div>
          )}
          
          {/* Country Flag */}
          {vessel.flag && (
            <div className="flex items-center justify-between p-1.5 rounded bg-black/30 text-[9px]">
              <span className="text-gray-400">FLAG</span>
              <span className="text-white">{vessel.flag}</span>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-700/50 text-[8px]">
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="w-3 h-3" />
              {new Date(vessel.lastSeen).toLocaleTimeString()}
            </div>
            <div className="text-gray-600 font-mono">
              {vessel.imo ? `IMO: ${vessel.imo}` : ''}
            </div>
          </div>
        </div>
      </MarkerPopup>
    </MapMarker>
  );
}
