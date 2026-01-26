"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { motion, AnimatePresence } from "framer-motion"
import { Activity, Cpu, Loader2, Radio, Shield, TriangleAlert, Wifi, WifiOff, Signal, Zap, Box, RefreshCw } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ApiResponse<T> {
  data: T
  meta?: { total?: number }
}

interface Device {
  id: string
  name: string
  type: string
  status: string
  lastSeen: string
  firmwareVersion?: string
  location?: { latitude: number; longitude: number; region?: string }
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

export function FCIDeviceMonitor({ className }: { className?: string }) {
  const devices = useSWR<ApiResponse<Device[]>>("/api/mindex/devices?page=1&pageSize=50", fetcher, { refreshInterval: 20_000 })
  const [viewMode, setViewMode] = useState<"blocks" | "list">("blocks")
  const [signalData, setSignalData] = useState<Record<string, number[]>>({})

  // Simulate signal data for each device
  useEffect(() => {
    const interval = setInterval(() => {
      setSignalData(prev => {
        const newData: Record<string, number[]> = {}
        ;(devices.data?.data ?? []).forEach(d => {
          const existing = prev[d.id] || Array(20).fill(0)
          const newVal = d.status === "online" 
            ? Math.random() * 100 + Math.sin(Date.now() / 1000) * 20 
            : Math.random() * 10
          newData[d.id] = [...existing.slice(1), newVal]
        })
        return newData
      })
    }, 200)
    return () => clearInterval(interval)
  }, [devices.data?.data])

  const deviceList = devices.data?.data ?? []
  const onlineCount = deviceList.filter(d => d.status === "online").length
  const offlineCount = deviceList.length - onlineCount

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-400" />
            Devices & FCI Monitoring
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("text-xs", viewMode === "blocks" && "bg-purple-500/20")}
              onClick={() => setViewMode("blocks")}
            >
              <Box className="h-3 w-3 mr-1" />
              Blocks
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className={cn("text-xs", viewMode === "list" && "bg-purple-500/20")}
              onClick={() => setViewMode("list")}
            >
              <Activity className="h-3 w-3 mr-1" />
              List
            </Button>
          </div>
        </div>
        <CardDescription>
          Device inventory + readiness for Fungal Computer Interface (FCI) streams.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {devices.isLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading devices…
          </div>
        ) : devices.error ? (
          <div className="text-xs text-yellow-200/80 border border-yellow-500/20 bg-yellow-500/10 rounded-md px-3 py-2 flex items-start gap-2">
            <TriangleAlert className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-medium">Devices unavailable</div>
              <div className="text-yellow-200/70">
                This panel requires a live MINDEX backend for <span className="font-mono">/api/mindex/devices</span>.
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="grid gap-3 md:grid-cols-4">
              <Stat label="Total Devices" value={String(deviceList.length)} icon={Radio} color="purple" />
              <Stat label="Online" value={String(onlineCount)} icon={Wifi} color="green" />
              <Stat label="Offline" value={String(offlineCount)} icon={WifiOff} color="red" />
              <Stat label="FCI Streams" value="SSE Active" icon={Zap} color="cyan" />
            </div>

            {viewMode === "blocks" ? (
              /* Blockchain-style Device Blocks */
              <div className="relative p-4 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: "linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)",
                    backgroundSize: "20px 20px"
                  }}
                />
                
                {/* Device Blocks */}
                <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {deviceList.map((d, i) => (
                    <DeviceBlock 
                      key={d.id} 
                      device={d} 
                      signalHistory={signalData[d.id] || []} 
                      index={i}
                    />
                  ))}
                  
                  {deviceList.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                      <Cpu className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No devices registered</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* List View */
              <ScrollArea className="h-[320px] rounded-2xl border border-white/10 bg-black/20">
                <div className="p-3 space-y-2">
                  {deviceList.map((d, i) => (
                    <motion.div 
                      key={d.id} 
                      className="rounded-xl border border-white/10 bg-black/20 p-3"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            d.status === "online" ? "bg-green-500 animate-pulse" : "bg-gray-500"
                          )} />
                          <div className="space-y-1">
                            <div className="text-sm font-medium flex items-center gap-2">
                              {d.name}
                              {d.status === "online" && signalData[d.id]?.length > 0 && (
                                <SignalStrength value={signalData[d.id][signalData[d.id].length - 1] || 50} />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {d.id} • {d.type}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              lastSeen {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "—"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={cn(
                            "text-xs border-none",
                            d.status === "online" ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"
                          )}>
                            {d.status}
                          </Badge>
                          {d.firmwareVersion && (
                            <div className="text-xs text-muted-foreground font-mono mt-1">
                              fw {d.firmwareVersion}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {deviceList.length === 0 && (
                    <div className="text-sm text-muted-foreground p-2">No devices.</div>
                  )}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Blockchain-style Device Block
function DeviceBlock({ 
  device, 
  signalHistory,
  index 
}: { 
  device: Device
  signalHistory: number[]
  index: number 
}) {
  const isOnline = device.status === "online"
  const avgSignal = signalHistory.length > 0 
    ? signalHistory.reduce((a, b) => a + b, 0) / signalHistory.length 
    : 0

  return (
    <motion.div
      className={cn(
        "relative p-4 rounded-lg border overflow-hidden",
        "bg-gradient-to-br",
        isOnline 
          ? "from-purple-500/10 to-cyan-500/10 border-purple-500/30" 
          : "from-gray-500/10 to-gray-600/10 border-gray-500/20"
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      style={{
        boxShadow: isOnline ? "0 0 20px rgba(139, 92, 246, 0.2)" : undefined
      }}
    >
      {/* Status Indicator */}
      <div className="absolute top-2 right-2">
        <motion.div
          className={cn(
            "w-2.5 h-2.5 rounded-full",
            isOnline ? "bg-green-500" : "bg-gray-500"
          )}
          animate={isOnline ? { scale: [1, 1.2, 1], opacity: [1, 0.7, 1] } : {}}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      {/* Device Info */}
      <div className="mb-3">
        <div className="text-sm font-medium text-white truncate">{device.name}</div>
        <div className="text-xs text-gray-500 font-mono truncate">{device.id.slice(0, 12)}...</div>
      </div>

      {/* Signal Visualization - Mini Chart */}
      {isOnline && (
        <div className="h-8 flex items-end gap-0.5 mb-2">
          {signalHistory.slice(-15).map((val, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-gradient-to-t from-purple-500 to-cyan-400 rounded-t-sm"
              style={{ height: `${Math.max(10, (val / 120) * 100)}%` }}
              initial={false}
              animate={{ height: `${Math.max(10, (val / 120) * 100)}%` }}
              transition={{ duration: 0.1 }}
            />
          ))}
        </div>
      )}

      {/* Type Badge */}
      <Badge className={cn(
        "text-xs border-none",
        isOnline ? "bg-purple-500/20 text-purple-300" : "bg-gray-500/20 text-gray-400"
      )}>
        {device.type}
      </Badge>

      {/* Signal Strength */}
      {isOnline && (
        <div className="absolute bottom-2 right-2">
          <SignalStrength value={avgSignal} />
        </div>
      )}
    </motion.div>
  )
}

// Signal Strength Indicator
function SignalStrength({ value }: { value: number }) {
  const bars = Math.ceil((value / 100) * 4)
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4].map(level => (
        <div
          key={level}
          className={cn(
            "w-1 rounded-sm transition-all",
            level <= bars ? "bg-cyan-400" : "bg-gray-600"
          )}
          style={{ height: `${level * 25}%` }}
        />
      ))}
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  color = "purple"
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color?: "purple" | "green" | "red" | "cyan" | "orange"
}) {
  const colorClass = {
    purple: "text-purple-300",
    green: "text-green-300",
    red: "text-red-300",
    cyan: "text-cyan-300",
    orange: "text-orange-300"
  }[color]

  const borderClass = {
    purple: "border-purple-500/20",
    green: "border-green-500/20",
    red: "border-red-500/20",
    cyan: "border-cyan-500/20",
    orange: "border-orange-500/20"
  }[color]

  return (
    <Card className={cn("bg-black/20", borderClass)}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
          <Icon className={cn("h-4 w-4", colorClass)} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <div className={cn("text-sm font-mono", colorClass)}>{value}</div>
      </CardContent>
    </Card>
  )
}

