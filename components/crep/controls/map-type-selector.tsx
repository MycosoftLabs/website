"use client"

/**
 * Map Type Selector — Basemap style thumbnails
 *
 * Options: Carto Dark (default), Carto Light, NASA Black Marble, Satellite
 */

import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MapStyle {
  id: string
  label: string
  url: string
  thumbnail?: string // CSS gradient as placeholder
}

export const MAP_STYLES: MapStyle[] = [
  {
    id: "carto-dark",
    label: "Carto Dark",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
    thumbnail: "linear-gradient(135deg, #0a0f1e 0%, #1a2332 50%, #0d1117 100%)",
  },
  {
    id: "carto-light",
    label: "Carto Light",
    url: "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json",
    thumbnail: "linear-gradient(135deg, #f0f0f0 0%, #d4d4d4 50%, #e8e8e8 100%)",
  },
  {
    id: "carto-dark-labels",
    label: "Dark + Labels",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    thumbnail: "linear-gradient(135deg, #0a0f1e 0%, #1a2332 50%, #2a3342 100%)",
  },
  {
    id: "carto-voyager",
    label: "Voyager",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    thumbnail: "linear-gradient(135deg, #f2efe9 0%, #d5d0c8 50%, #e8e4dc 100%)",
  },
]

interface MapTypeSelectorProps {
  currentStyle: string
  onStyleChange: (style: MapStyle) => void
  onClose: () => void
  isOpen: boolean
}

export function MapTypeSelector({ currentStyle, onStyleChange, onClose, isOpen }: MapTypeSelectorProps) {
  if (!isOpen) return null

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 bg-[#0a1628]/95 backdrop-blur-md border border-gray-600/40 rounded-xl shadow-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Map Type</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-700/50 text-gray-500">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex gap-2">
        {MAP_STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => {
              onStyleChange(style)
              onClose()
            }}
            className={cn(
              "flex flex-col items-center gap-1.5 p-1.5 rounded-lg border transition-all",
              currentStyle === style.id
                ? "border-cyan-500/50 ring-1 ring-cyan-500/30"
                : "border-gray-700/40 hover:border-gray-600"
            )}
          >
            <div
              className="w-16 h-12 rounded-md border border-gray-700/30"
              style={{ background: style.thumbnail }}
            />
            <span className={cn(
              "text-[8px] font-medium",
              currentStyle === style.id ? "text-cyan-400" : "text-gray-500"
            )}>
              {style.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
