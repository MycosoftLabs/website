"use client";

/**
 * Intel World Map - Flat NSA/CIA/Palantir-style tactical map
 * 
 * Features:
 * - Flat Mercator projection world map
 * - Dark military/intel aesthetic
 * - Grid overlay with coordinates
 * - Real-time event markers with pulse animations
 * - Device location markers
 * - Threat level heat zones
 * - Data streaming indicators
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface GlobalEvent {
  id: string;
  type: string;
  title: string;
  severity: string;
  lat: number;
  lng: number;
  timestamp?: string;
}

interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "online" | "offline";
}

interface IntelWorldMapProps {
  events?: GlobalEvent[];
  devices?: Device[];
  className?: string;
  showGrid?: boolean;
  showCoordinates?: boolean;
  onEventClick?: (event: GlobalEvent) => void;
  onDeviceClick?: (device: Device) => void;
}

// Convert lat/lng to x/y percentage on the map
function latLngToXY(lat: number, lng: number): { x: number; y: number } {
  // Mercator projection approximation
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { x, y };
}

// Event type configurations
const eventConfig: Record<string, { color: string; pulseColor: string; icon: string }> = {
  earthquake: { color: "#ef4444", pulseColor: "rgba(239,68,68,0.4)", icon: "⚡" },
  volcano: { color: "#f97316", pulseColor: "rgba(249,115,22,0.4)", icon: "🌋" },
  wildfire: { color: "#dc2626", pulseColor: "rgba(220,38,38,0.4)", icon: "🔥" },
  storm: { color: "#6366f1", pulseColor: "rgba(99,102,241,0.4)", icon: "🌀" },
  lightning: { color: "#facc15", pulseColor: "rgba(250,204,21,0.4)", icon: "⚡" },
  tornado: { color: "#7c3aed", pulseColor: "rgba(124,58,237,0.4)", icon: "🌪️" },
  solar_flare: { color: "#fbbf24", pulseColor: "rgba(251,191,36,0.4)", icon: "☀️" },
  fungal_bloom: { color: "#22c55e", pulseColor: "rgba(34,197,94,0.4)", icon: "🍄" },
  migration: { color: "#06b6d4", pulseColor: "rgba(6,182,212,0.4)", icon: "🦅" },
  default: { color: "#3b82f6", pulseColor: "rgba(59,130,246,0.4)", icon: "📍" },
};

// Severity to size mapping
const severitySize: Record<string, number> = {
  info: 6,
  low: 8,
  medium: 10,
  high: 12,
  critical: 16,
  extreme: 20,
};

export function IntelWorldMap({
  events = [],
  devices = [],
  className,
  showGrid = true,
  showCoordinates = true,
  onEventClick,
  onDeviceClick,
}: IntelWorldMapProps) {
  const [selectedEvent, setSelectedEvent] = useState<GlobalEvent | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [hoveredItem, setHoveredItem] = useState<{ type: "event" | "device"; id: string } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Handle event click
  const handleEventClick = useCallback((event: GlobalEvent) => {
    setSelectedEvent(event);
    setSelectedDevice(null);
    onEventClick?.(event);
  }, [onEventClick]);

  // Handle device click
  const handleDeviceClick = useCallback((device: Device) => {
    setSelectedDevice(device);
    setSelectedEvent(null);
    onDeviceClick?.(device);
  }, [onDeviceClick]);

  return (
    <div className={cn("relative w-full h-full bg-[#0a1628] overflow-hidden", className)}>
      {/* Map Container */}
      <div 
        ref={mapRef}
        className="relative w-full h-full"
        style={{
          background: `
            linear-gradient(180deg, 
              rgba(10,22,40,0.95) 0%, 
              rgba(5,15,30,0.98) 50%,
              rgba(10,22,40,0.95) 100%
            )
          `,
        }}
      >
        {/* World Map SVG Background */}
        <svg
          viewBox="0 0 1000 500"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 w-full h-full opacity-60"
        >
          {/* Ocean */}
          <rect fill="#0a1628" width="1000" height="500" />
          
          {/* Simplified continent outlines */}
          {/* North America */}
          <path
            d="M50,50 L180,40 L220,80 L230,150 L200,180 L180,220 L120,250 L80,230 L60,180 L30,120 Z"
            fill="#1a3a5c"
            stroke="#2a5a8c"
            strokeWidth="0.5"
          />
          {/* South America */}
          <path
            d="M150,270 L180,250 L200,280 L220,350 L200,420 L160,450 L130,420 L120,350 L140,300 Z"
            fill="#1a3a5c"
            stroke="#2a5a8c"
            strokeWidth="0.5"
          />
          {/* Europe */}
          <path
            d="M450,50 L520,40 L540,80 L520,120 L480,140 L440,130 L430,100 L440,70 Z"
            fill="#1a3a5c"
            stroke="#2a5a8c"
            strokeWidth="0.5"
          />
          {/* Africa */}
          <path
            d="M450,170 L520,150 L560,200 L570,300 L540,380 L480,400 L440,360 L430,280 L440,220 Z"
            fill="#1a3a5c"
            stroke="#2a5a8c"
            strokeWidth="0.5"
          />
          {/* Asia */}
          <path
            d="M560,40 L750,30 L850,80 L900,150 L880,220 L800,250 L700,230 L620,180 L580,120 L560,80 Z"
            fill="#1a3a5c"
            stroke="#2a5a8c"
            strokeWidth="0.5"
          />
          {/* Australia */}
          <path
            d="M780,320 L860,300 L920,340 L930,400 L880,440 L800,430 L760,380 Z"
            fill="#1a3a5c"
            stroke="#2a5a8c"
            strokeWidth="0.5"
          />
          {/* Antarctica */}
          <path
            d="M100,480 L900,480 L920,500 L80,500 Z"
            fill="#0d2238"
            stroke="#1a3a5c"
            strokeWidth="0.5"
          />
        </svg>

        {/* Grid Overlay */}
        {showGrid && (
          <svg
            viewBox="0 0 1000 500"
            preserveAspectRatio="xMidYMid slice"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {/* Latitude lines */}
            {[0, 90, 180, 270, 360, 450].map((y, i) => (
              <line
                key={`lat-${i}`}
                x1="0"
                y1={y * 500 / 450}
                x2="1000"
                y2={y * 500 / 450}
                stroke="#1a3a5c"
                strokeWidth="0.5"
                strokeDasharray="4,4"
                opacity="0.4"
              />
            ))}
            {/* Longitude lines */}
            {[0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].map((x, i) => (
              <line
                key={`lng-${i}`}
                x1={x}
                y1="0"
                x2={x}
                y2="500"
                stroke="#1a3a5c"
                strokeWidth="0.5"
                strokeDasharray="4,4"
                opacity="0.4"
              />
            ))}
            {/* Equator */}
            <line
              x1="0"
              y1="250"
              x2="1000"
              y2="250"
              stroke="#2a5a8c"
              strokeWidth="1"
              opacity="0.6"
            />
            {/* Prime Meridian */}
            <line
              x1="500"
              y1="0"
              x2="500"
              y2="500"
              stroke="#2a5a8c"
              strokeWidth="1"
              opacity="0.6"
            />
          </svg>
        )}

        {/* Coordinate Labels */}
        {showCoordinates && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Latitude labels */}
            <span className="absolute left-1 top-[11%] text-[8px] text-cyan-500/50 font-mono">60°N</span>
            <span className="absolute left-1 top-[33%] text-[8px] text-cyan-500/50 font-mono">30°N</span>
            <span className="absolute left-1 top-[50%] text-[8px] text-cyan-500/50 font-mono">0°</span>
            <span className="absolute left-1 top-[67%] text-[8px] text-cyan-500/50 font-mono">30°S</span>
            <span className="absolute left-1 top-[89%] text-[8px] text-cyan-500/50 font-mono">60°S</span>
            {/* Longitude labels */}
            <span className="absolute bottom-1 left-[10%] text-[8px] text-cyan-500/50 font-mono">120°W</span>
            <span className="absolute bottom-1 left-[30%] text-[8px] text-cyan-500/50 font-mono">60°W</span>
            <span className="absolute bottom-1 left-[50%] text-[8px] text-cyan-500/50 font-mono">0°</span>
            <span className="absolute bottom-1 left-[70%] text-[8px] text-cyan-500/50 font-mono">60°E</span>
            <span className="absolute bottom-1 left-[90%] text-[8px] text-cyan-500/50 font-mono">120°E</span>
          </div>
        )}

        {/* Event Markers */}
        {events.map((event) => {
          const { x, y } = latLngToXY(event.lat, event.lng);
          const config = eventConfig[event.type] || eventConfig.default;
          const size = severitySize[event.severity] || 8;
          const isHovered = hoveredItem?.type === "event" && hoveredItem.id === event.id;
          const isSelected = selectedEvent?.id === event.id;
          const isCritical = event.severity === "critical" || event.severity === "extreme";

          return (
            <div
              key={event.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
              onClick={() => handleEventClick(event)}
              onMouseEnter={() => setHoveredItem({ type: "event", id: event.id })}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {/* Pulse ring for critical events */}
              {isCritical && (
                <div
                  className="absolute inset-0 rounded-full animate-ping"
                  style={{
                    width: size * 2,
                    height: size * 2,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    backgroundColor: config.pulseColor,
                  }}
                />
              )}
              {/* Outer glow */}
              <div
                className="absolute rounded-full"
                style={{
                  width: size * 1.5,
                  height: size * 1.5,
                  marginLeft: -size * 0.25,
                  marginTop: -size * 0.25,
                  backgroundColor: config.pulseColor,
                  filter: "blur(4px)",
                }}
              />
              {/* Main marker */}
              <div
                className={cn(
                  "relative rounded-full border-2 transition-transform",
                  isHovered || isSelected ? "scale-150" : "scale-100"
                )}
                style={{
                  width: size,
                  height: size,
                  backgroundColor: config.color,
                  borderColor: isSelected ? "#fff" : config.color,
                  boxShadow: `0 0 ${size}px ${config.color}`,
                }}
              />
              {/* Tooltip */}
              {(isHovered || isSelected) && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap">
                  <div className="bg-black/95 border border-cyan-500/30 rounded px-2 py-1 text-xs">
                    <div className="text-cyan-400 font-semibold">{event.title}</div>
                    <div className="text-gray-400 text-[10px]">
                      {event.lat.toFixed(2)}°, {event.lng.toFixed(2)}°
                    </div>
                    <div className="text-gray-500 text-[10px] uppercase">{event.type} • {event.severity}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Device Markers */}
        {devices.map((device) => {
          const { x, y } = latLngToXY(device.lat, device.lng);
          const isHovered = hoveredItem?.type === "device" && hoveredItem.id === device.id;
          const isSelected = selectedDevice?.id === device.id;
          const isOnline = device.status === "online";

          return (
            <div
              key={device.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20"
              style={{
                left: `${x}%`,
                top: `${y}%`,
              }}
              onClick={() => handleDeviceClick(device)}
              onMouseEnter={() => setHoveredItem({ type: "device", id: device.id })}
              onMouseLeave={() => setHoveredItem(null)}
            >
              {/* Online pulse */}
              {isOnline && (
                <div
                  className="absolute w-6 h-6 -ml-1.5 -mt-1.5 rounded-full animate-ping"
                  style={{ backgroundColor: "rgba(34,197,94,0.3)" }}
                />
              )}
              {/* Device icon */}
              <div
                className={cn(
                  "w-4 h-4 rounded-sm border-2 flex items-center justify-center text-[8px] font-bold transition-transform",
                  isOnline ? "bg-green-500/80 border-green-400" : "bg-red-500/80 border-red-400",
                  isHovered || isSelected ? "scale-150" : "scale-100"
                )}
                style={{
                  boxShadow: isOnline ? "0 0 10px #22c55e" : "0 0 10px #ef4444",
                }}
              >
                🍄
              </div>
              {/* Tooltip */}
              {(isHovered || isSelected) && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap">
                  <div className="bg-black/95 border border-green-500/30 rounded px-2 py-1 text-xs">
                    <div className="text-green-400 font-semibold">{device.name}</div>
                    <div className="text-gray-400 text-[10px]">
                      {device.lat.toFixed(2)}°, {device.lng.toFixed(2)}°
                    </div>
                    <div className={cn("text-[10px] uppercase", isOnline ? "text-green-500" : "text-red-500")}>
                      {device.status}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Scan line effect */}
        <div 
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(0,212,255,0.03) 50%, transparent 100%)",
            animation: "scanline 4s linear infinite",
          }}
        />

        {/* Corner decorations */}
        <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-cyan-500/40" />
        <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-cyan-500/40" />
        <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-cyan-500/40" />
        <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-cyan-500/40" />

        {/* Status indicators */}
        <div className="absolute top-3 right-12 flex items-center gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500">LIVE</span>
          </div>
          <span className="text-gray-500">|</span>
          <span className="text-cyan-500">{events.length} EVENTS</span>
          <span className="text-gray-500">|</span>
          <span className="text-green-500">{devices.filter(d => d.status === "online").length} DEVICES</span>
        </div>

        {/* Classification banner */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-amber-500/60 tracking-widest">
          UNCLASSIFIED // FOUO // OEI SYSTEM
        </div>
      </div>

      {/* Scanline animation keyframes */}
      <style jsx>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
}
