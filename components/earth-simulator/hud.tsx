"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Eye, Clock } from "lucide-react";
import { useState, useEffect } from "react";

interface HUDProps {
  viewport: { north: number; south: number; east: number; west: number } | null;
}

export function HUD({ viewport }: HUDProps) {
  const [time, setTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate viewport area (approximate)
  const getViewportArea = () => {
    if (!viewport) return null;
    const latDiff = Math.abs(viewport.north - viewport.south);
    const lonDiff = Math.abs(viewport.east - viewport.west);
    // Approximate area in km² (very rough)
    const kmPerDegLat = 111;
    const avgLat = (viewport.north + viewport.south) / 2;
    const kmPerDegLon = 111 * Math.cos(avgLat * Math.PI / 180);
    const areaKm2 = latDiff * kmPerDegLat * lonDiff * kmPerDegLon;
    
    if (areaKm2 > 1000000) return `${(areaKm2 / 1000000).toFixed(1)}M km²`;
    if (areaKm2 > 1000) return `${(areaKm2 / 1000).toFixed(1)}K km²`;
    return `${areaKm2.toFixed(0)} km²`;
  };

  const getZoomLevel = () => {
    if (!viewport) return "Global";
    const latDiff = Math.abs(viewport.north - viewport.south);
    if (latDiff > 90) return "Global";
    if (latDiff > 45) return "Continental";
    if (latDiff > 20) return "Regional";
    if (latDiff > 5) return "Country";
    if (latDiff > 1) return "State/Province";
    if (latDiff > 0.1) return "Local";
    return "Street";
  };

  return (
    <Card className="w-56 bg-black/80 backdrop-blur-sm border-white/10 text-white">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" />
            Viewport
          </span>
          <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-400">
            {getZoomLevel()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {/* Time Display */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3 w-3" />
          <span className="font-mono">
            {mounted && time ? time.toLocaleTimeString() : "--:--:--"}
          </span>
          <span className="text-gray-500">UTC{time ? (time.getTimezoneOffset() / -60 >= 0 ? "+" : "") + (time.getTimezoneOffset() / -60) : ""}</span>
        </div>

        {viewport ? (
          <>
            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-1 text-xs font-mono">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">N:</span>
                <span className="text-green-400">{viewport.north.toFixed(2)}°</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">S:</span>
                <span className="text-green-400">{viewport.south.toFixed(2)}°</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">E:</span>
                <span className="text-blue-400">{viewport.east.toFixed(2)}°</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-gray-500">W:</span>
                <span className="text-blue-400">{viewport.west.toFixed(2)}°</span>
              </div>
            </div>

            {/* Area */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
              <span className="text-gray-400 flex items-center gap-1">
                <Eye className="h-3 w-3" />
                View Area
              </span>
              <span className="font-mono text-white">{getViewportArea()}</span>
            </div>

            {/* Center Point */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Center
              </span>
              <span className="font-mono text-white">
                {((viewport.north + viewport.south) / 2).toFixed(2)}°, {((viewport.east + viewport.west) / 2).toFixed(2)}°
              </span>
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-500 text-center py-2">
            Move the globe to see viewport info
          </div>
        )}
      </CardContent>
    </Card>
  );
}
