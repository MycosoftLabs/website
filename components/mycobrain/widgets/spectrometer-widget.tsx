"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, Zap, Eye } from "lucide-react"

interface SpectrometerWidgetProps {
  channels?: {
    f1_415nm?: number
    f2_445nm?: number
    f3_480nm?: number
    f4_515nm?: number
    f5_555nm?: number
    f6_590nm?: number
    f7_630nm?: number
    f8_680nm?: number
    clear?: number
    nir?: number
  }
  className?: string
}

const CHANNEL_CONFIG = [
  { key: "f1_415nm", label: "415nm", color: "#8B00FF", name: "Violet" },
  { key: "f2_445nm", label: "445nm", color: "#0000FF", name: "Blue" },
  { key: "f3_480nm", label: "480nm", color: "#00BFFF", name: "Cyan" },
  { key: "f4_515nm", label: "515nm", color: "#00FF00", name: "Green" },
  { key: "f5_555nm", label: "555nm", color: "#ADFF2F", name: "Yellow-Green" },
  { key: "f6_590nm", label: "590nm", color: "#FFFF00", name: "Yellow" },
  { key: "f7_630nm", label: "630nm", color: "#FF4500", name: "Orange" },
  { key: "f8_680nm", label: "680nm", color: "#FF0000", name: "Red" },
  { key: "clear", label: "Clear", color: "#FFFFFF", name: "Clear" },
  { key: "nir", label: "NIR", color: "#800000", name: "Near-IR" },
]

export function SpectrometerWidget({ 
  channels = {
    f1_415nm: 1200,
    f2_445nm: 2500,
    f3_480nm: 3800,
    f4_515nm: 5200,
    f5_555nm: 4800,
    f6_590nm: 3500,
    f7_630nm: 2800,
    f8_680nm: 2100,
    clear: 15000,
    nir: 1800,
  },
  className 
}: SpectrometerWidgetProps) {

  // Find max for normalization
  const values = CHANNEL_CONFIG.slice(0, 8).map(c => channels[c.key as keyof typeof channels] || 0)
  const maxValue = Math.max(...values, 1)

  // Calculate dominant wavelength
  const dominantChannel = CHANNEL_CONFIG.slice(0, 8).reduce((max, channel) => {
    const value = channels[channel.key as keyof typeof channels] || 0
    const maxValue = channels[max.key as keyof typeof channels] || 0
    return value > maxValue ? channel : max
  }, CHANNEL_CONFIG[0])

  // Simple color temperature estimation based on blue/red ratio
  const blueValue = (channels.f1_415nm || 0) + (channels.f2_445nm || 0) + (channels.f3_480nm || 0)
  const redValue = (channels.f6_590nm || 0) + (channels.f7_630nm || 0) + (channels.f8_680nm || 0)
  const colorTemp = Math.round(5500 * (blueValue / (redValue || 1)))
  const clampedTemp = Math.max(1000, Math.min(10000, colorTemp))

  return (
    <div className={cn("p-3 rounded-lg bg-black/40 border border-amber-500/30", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">AS7341 SPECTROMETER</span>
        </div>
        <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-400">
          11-CH
        </Badge>
      </div>

      {/* Spectrum visualization */}
      <div className="mb-3 p-2 bg-gray-900/50 rounded">
        <div className="flex items-end gap-0.5 h-20">
          {CHANNEL_CONFIG.slice(0, 8).map((channel) => {
            const value = channels[channel.key as keyof typeof channels] || 0
            const height = (value / maxValue) * 100
            
            return (
              <div 
                key={channel.key}
                className="flex-1 flex flex-col items-center"
              >
                <div 
                  className="w-full rounded-t transition-all duration-300"
                  style={{ 
                    backgroundColor: channel.color,
                    height: `${height}%`,
                    minHeight: "4px",
                    opacity: 0.8,
                  }}
                />
                <div className="text-[7px] text-gray-500 mt-1 transform rotate-45 origin-top-left">
                  {channel.label.replace("nm", "")}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Raw values */}
      <div className="grid grid-cols-5 gap-1 mb-3 text-[8px]">
        {CHANNEL_CONFIG.slice(0, 10).map((channel) => {
          const value = channels[channel.key as keyof typeof channels] || 0
          return (
            <div 
              key={channel.key}
              className="p-1 bg-gray-900/50 rounded text-center"
            >
              <div 
                className="w-2 h-2 rounded-full mx-auto mb-0.5"
                style={{ backgroundColor: channel.color }}
              />
              <div className="text-gray-500">{channel.label.split("_")[0]}</div>
              <div className="text-white font-mono">{value.toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      {/* Analysis */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-gray-900/50 rounded">
          <div className="flex items-center gap-1 text-gray-500 text-[9px] mb-1">
            <Eye className="w-3 h-3" />
            Dominant
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: dominantChannel.color }}
            />
            <span className="text-white text-[10px]">{dominantChannel.name}</span>
          </div>
          <div className="text-[9px] text-gray-500">{dominantChannel.label}</div>
        </div>

        <div className="p-2 bg-gray-900/50 rounded">
          <div className="flex items-center gap-1 text-gray-500 text-[9px] mb-1">
            <Zap className="w-3 h-3" />
            Color Temp
          </div>
          <div className="text-white text-[10px] font-mono">{clampedTemp}K</div>
          <div className="text-[9px] text-gray-500">
            {clampedTemp < 3500 ? "Warm" : clampedTemp < 5500 ? "Neutral" : "Cool"}
          </div>
        </div>
      </div>

      {/* Applications hint */}
      <div className="mt-2 p-2 bg-amber-900/20 border border-amber-500/20 rounded text-[9px] text-amber-400/80">
        💡 Use for: Chlorophyll detection, mycelium color analysis, fruiting body monitoring
      </div>
    </div>
  )
}
