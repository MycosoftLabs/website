"use client"

import { Camera, MapPin, Radio, AlertCircle } from "lucide-react"
import type { CameraResult } from "@/lib/search/unified-search-sdk"

interface CameraWidgetProps {
  data: CameraResult[]
}

export function CameraWidget({ data }: CameraWidgetProps) {
  if (!data || data.length === 0) return null

  // Ensure we just show the top one or two inside the Packery constraints
  const topCams = data.slice(0, 2)

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {topCams.map((cam, i) => (
        <div 
          key={cam.id || i}
          className="flex flex-col gap-2 p-3 rounded-lg bg-black/40 border border-white/10 flex-1 overflow-hidden"
        >
          <div className="flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold truncate pr-2 flex items-center gap-1.5">
              <Camera className="h-4 w-4 text-cyan-400" />
              {cam.title}
            </h3>
            {cam.status === "live" ? (
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Offline</span>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 mb-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{cam.location}</span>
          </div>

          <div className="relative flex-1 rounded-md overflow-hidden bg-black/80 flex items-center justify-center min-h-[140px] border border-white/5 shadow-inner">
            {cam.streamUrl ? (
              <iframe 
                src={cam.streamUrl} 
                className="w-full h-full absolute inset-0 pointer-events-auto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              />
            ) : cam.imageUrl ? (
              <img src={cam.imageUrl} className="w-full h-full object-cover" alt={cam.title} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground/50">
                <Radio className="h-8 w-8" />
                <span className="text-xs uppercase font-medium tracking-wide">No Signal</span>
              </div>
            )}
            
            {/* OSD (On-Screen Display) overlay for authenticity */}
            <div className="absolute top-2 left-2 pointer-events-none flex flex-col gap-0.5">
              <span className="text-[9px] font-mono text-white/70 drop-shadow-md">CAM {i+1}</span>
              {cam.lat && cam.lng && (
                <span className="text-[8px] font-mono text-white/50 drop-shadow-md">
                  {cam.lat.toFixed(4)} {cam.lng.toFixed(4)}
                </span>
              )}
            </div>
            <div className="absolute bottom-2 right-2 pointer-events-none">
              <span className="text-[9px] font-mono text-white/70 drop-shadow-md bg-black/20 px-1 rounded">
                [{cam.source.toUpperCase()}]
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
