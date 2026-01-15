"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero,
  Wifi,
  MapPin,
  Phone,
  MessageSquare,
  Globe,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"

interface CellularWidgetProps {
  deviceId?: string
  className?: string
}

interface CellularStatus {
  connected: boolean
  signalStrength: number // dBm
  signalBars: number // 0-5
  networkType: "4G" | "LTE" | "3G" | "2G" | "NB-IoT" | "Cat-M1" | "Unknown"
  operator: string
  dataConnected: boolean
  simStatus: "ready" | "not_inserted" | "pin_required" | "error"
  imei?: string
  iccid?: string
  gnss?: {
    latitude: number
    longitude: number
    altitude: number
    satellites: number
    fixType: string
  }
}

export function CellularWidget({ deviceId, className }: CellularWidgetProps) {
  const [status, setStatus] = useState<CellularStatus>({
    connected: true,
    signalStrength: -75,
    signalBars: 4,
    networkType: "4G",
    operator: "T-Mobile",
    dataConnected: true,
    simStatus: "ready",
    imei: "123456789012345",
    iccid: "89014103211118510720",
    gnss: {
      latitude: 47.6062,
      longitude: -122.3321,
      altitude: 150,
      satellites: 8,
      fixType: "3D"
    }
  })
  const [loading, setLoading] = useState(false)

  const getSignalIcon = (bars: number) => {
    if (bars >= 4) return SignalHigh
    if (bars >= 3) return SignalMedium
    if (bars >= 1) return SignalLow
    return SignalZero
  }

  const getSignalColor = (dbm: number) => {
    if (dbm > -70) return "text-green-400"
    if (dbm > -85) return "text-yellow-400"
    if (dbm > -100) return "text-orange-400"
    return "text-red-400"
  }

  const SignalIcon = getSignalIcon(status.signalBars)

  const handleRefresh = async () => {
    setLoading(true)
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLoading(false)
  }

  return (
    <div className={cn("p-3 rounded-lg bg-black/40 border border-blue-500/30", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Signal className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-blue-400">SIM7000G CELLULAR</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "text-[10px]",
            status.connected ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"
          )}
        >
          {status.connected ? status.networkType : "OFFLINE"}
        </Badge>
      </div>

      {/* Signal strength */}
      <div className="flex items-center gap-3 mb-3 p-2 bg-gray-900/50 rounded">
        <SignalIcon className={cn("w-8 h-8", getSignalColor(status.signalStrength))} />
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-white">{status.operator}</span>
            <span className={cn("text-xs font-mono", getSignalColor(status.signalStrength))}>
              {status.signalStrength} dBm
            </span>
          </div>
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-sm",
                  i < status.signalBars ? "bg-green-500" : "bg-gray-700"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Connection status */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-2 bg-gray-900/50 rounded text-center">
          <Globe className={cn(
            "w-4 h-4 mx-auto mb-1",
            status.dataConnected ? "text-green-400" : "text-gray-500"
          )} />
          <div className="text-[9px] text-gray-400">Data</div>
          <div className={cn(
            "text-[10px] font-bold",
            status.dataConnected ? "text-green-400" : "text-gray-500"
          )}>
            {status.dataConnected ? "ACTIVE" : "OFF"}
          </div>
        </div>

        <div className="p-2 bg-gray-900/50 rounded text-center">
          <Wifi className={cn(
            "w-4 h-4 mx-auto mb-1",
            status.simStatus === "ready" ? "text-green-400" : "text-red-400"
          )} />
          <div className="text-[9px] text-gray-400">SIM</div>
          <div className={cn(
            "text-[10px] font-bold",
            status.simStatus === "ready" ? "text-green-400" : "text-red-400"
          )}>
            {status.simStatus.toUpperCase().replace("_", " ")}
          </div>
        </div>

        <div className="p-2 bg-gray-900/50 rounded text-center">
          <MapPin className={cn(
            "w-4 h-4 mx-auto mb-1",
            status.gnss ? "text-green-400" : "text-gray-500"
          )} />
          <div className="text-[9px] text-gray-400">GNSS</div>
          <div className={cn(
            "text-[10px] font-bold",
            status.gnss ? "text-green-400" : "text-gray-500"
          )}>
            {status.gnss ? status.gnss.fixType : "NO FIX"}
          </div>
        </div>
      </div>

      {/* GNSS position if available */}
      {status.gnss && (
        <div className="p-2 bg-gray-900/50 rounded mb-3">
          <div className="text-[10px] text-gray-500 mb-1">GNSS POSITION</div>
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div>
              <span className="text-gray-500">Lat:</span>
              <span className="text-blue-400 font-mono ml-1">
                {status.gnss.latitude.toFixed(6)}°
              </span>
            </div>
            <div>
              <span className="text-gray-500">Lon:</span>
              <span className="text-blue-400 font-mono ml-1">
                {status.gnss.longitude.toFixed(6)}°
              </span>
            </div>
            <div>
              <span className="text-gray-500">Alt:</span>
              <span className="text-blue-400 font-mono ml-1">
                {status.gnss.altitude}m
              </span>
            </div>
            <div>
              <span className="text-gray-500">Sats:</span>
              <span className="text-blue-400 font-mono ml-1">
                {status.gnss.satellites}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 h-7 text-[10px]"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={cn("w-3 h-3 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 h-7 text-[10px]"
          disabled={!status.connected}
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          SMS
        </Button>
      </div>
    </div>
  )
}
