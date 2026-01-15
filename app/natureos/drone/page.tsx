"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft,
  Plane,
  Settings,
  Map,
  Radio,
  Thermometer,
  Wind,
  Signal,
  BarChart3,
  Waypoints,
  Camera,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"

// Drone components
import {
  AttitudeIndicator,
  FlightControls,
  MotorStatus,
  BatteryStatus,
  GPSNavigation,
  FPVDisplay,
  type FlightCommand,
  type MotorData,
} from "@/components/mycobrain/drone"

// Environment widgets (reuse from mycobrain)
import { PeripheralWidget } from "@/components/mycobrain/widgets/peripheral-widget"
import { TelemetryChartWidget } from "@/components/mycobrain/widgets/telemetry-chart-widget"

export default function DroneControlPage() {
  // Connection state
  const [connected, setConnected] = useState(false)
  const [armed, setArmed] = useState(false)
  const [flightMode, setFlightMode] = useState("STABILIZE")

  // Telemetry state
  const [attitude, setAttitude] = useState({ pitch: 0, roll: 0, heading: 0 })
  const [gps, setGps] = useState({
    latitude: 47.6062,
    longitude: -122.3321,
    altitude: 0,
    groundSpeed: 0,
    heading: 0,
    hdop: 1.2,
    satellites: 12,
    fixType: "3d" as const,
    homeDistance: 0,
    homeBearing: 0,
    homeSet: false,
  })
  const [battery, setBattery] = useState({
    voltage: 16.8,
    current: -5.2,
    percentage: 95,
    temperature: 28,
    cellCount: 4,
    cellVoltages: [4.2, 4.2, 4.2, 4.2],
    capacity: 5000,
    consumed: 250,
    timeRemaining: 1200,
  })
  const [motors, setMotors] = useState<MotorData[]>([
    { id: 1, rpm: 0, current: 0, temperature: 25, status: "ok", throttle: 0 },
    { id: 2, rpm: 0, current: 0, temperature: 25, status: "ok", throttle: 0 },
    { id: 3, rpm: 0, current: 0, temperature: 25, status: "ok", throttle: 0 },
    { id: 4, rpm: 0, current: 0, temperature: 25, status: "ok", throttle: 0 },
  ])

  // Environment sensor data (from BME688 if connected)
  const [envData, setEnvData] = useState({
    temperature: 22.5,
    humidity: 45,
    pressure: 1013.25,
    altitude: 150,
  })

  // Simulate telemetry updates
  useEffect(() => {
    if (!connected) return

    const interval = setInterval(() => {
      // Simulate slight attitude changes when armed
      if (armed) {
        setAttitude(prev => ({
          pitch: prev.pitch + (Math.random() - 0.5) * 2,
          roll: prev.roll + (Math.random() - 0.5) * 2,
          heading: (prev.heading + 0.5) % 360,
        }))

        // Simulate motor activity
        setMotors(prev => prev.map(m => ({
          ...m,
          rpm: 5000 + Math.random() * 1000,
          current: 2 + Math.random() * 3,
          temperature: 35 + Math.random() * 10,
          throttle: 30 + Math.random() * 20,
        })))
      }
    }, 100)

    return () => clearInterval(interval)
  }, [connected, armed])

  // Handle flight commands
  const handleFlightCommand = useCallback((command: FlightCommand) => {
    console.log("[Drone] Command:", command)

    switch (command.type) {
      case "arm":
        setArmed(true)
        break
      case "disarm":
        setArmed(false)
        setMotors(prev => prev.map(m => ({ ...m, rpm: 0, throttle: 0 })))
        break
      case "takeoff":
        setFlightMode("LOITER")
        break
      case "land":
        setFlightMode("LAND")
        break
      case "rth":
        setFlightMode("RTL")
        break
    }
  }, [])

  // Connect to drone (simulated)
  const handleConnect = () => {
    setConnected(true)
    // In real implementation, would connect via MycoBrain WebSocket
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 h-12 px-4 bg-black/40 backdrop-blur-md border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/natureos/devices">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Plane className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-cyan-400">MYCODRONE CONTROL</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              connected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-xs text-gray-400">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {connected && (
            <>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  armed ? "border-red-500 text-red-400" : "border-gray-500 text-gray-400"
                )}
              >
                {armed ? "ARMED" : "DISARMED"}
              </Badge>
              <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">
                {flightMode}
              </Badge>
            </>
          )}

          {!connected && (
            <Button size="sm" onClick={handleConnect}>
              Connect
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex h-[calc(100vh-48px)]">
        {/* Left panel - FPV and controls */}
        <div className="w-[60%] p-4 space-y-4 overflow-auto">
          {/* FPV Display */}
          <FPVDisplay
            connected={connected}
            armed={armed}
            altitude={gps.altitude}
            speed={gps.groundSpeed}
            heading={attitude.heading}
            batteryPercent={battery.percentage}
            gpsStatus={gps.fixType.toUpperCase()}
            flightMode={flightMode}
            showCrosshair={true}
            showTelemetry={true}
          />

          {/* Control row */}
          <div className="grid grid-cols-2 gap-4">
            <FlightControls
              onCommand={handleFlightCommand}
              armed={armed}
              flightMode={flightMode}
            />
            <AttitudeIndicator
              pitch={attitude.pitch}
              roll={attitude.roll}
              heading={attitude.heading}
            />
          </div>
        </div>

        {/* Right panel - Telemetry */}
        <div className="flex-1 border-l border-cyan-500/20 bg-black/20">
          <Tabs defaultValue="status" className="h-full flex flex-col">
            <TabsList className="w-full grid grid-cols-5 rounded-none bg-black/40 border-b border-cyan-500/20 h-10">
              <TabsTrigger value="status" className="text-xs">
                <Signal className="w-3 h-3 mr-1" />
                Status
              </TabsTrigger>
              <TabsTrigger value="nav" className="text-xs">
                <Map className="w-3 h-3 mr-1" />
                Nav
              </TabsTrigger>
              <TabsTrigger value="sensors" className="text-xs">
                <Thermometer className="w-3 h-3 mr-1" />
                Sensors
              </TabsTrigger>
              <TabsTrigger value="mission" className="text-xs">
                <Waypoints className="w-3 h-3 mr-1" />
                Mission
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">
                <Settings className="w-3 h-3 mr-1" />
                Config
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="status" className="h-full m-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    <BatteryStatus
                      voltage={battery.voltage}
                      current={battery.current}
                      percentage={battery.percentage}
                      temperature={battery.temperature}
                      cellCount={battery.cellCount}
                      cellVoltages={battery.cellVoltages}
                      capacity={battery.capacity}
                      consumed={battery.consumed}
                      timeRemaining={battery.timeRemaining}
                    />
                    <MotorStatus motors={motors} armed={armed} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="nav" className="h-full m-0">
                <ScrollArea className="h-full p-4">
                  <GPSNavigation
                    latitude={gps.latitude}
                    longitude={gps.longitude}
                    altitude={gps.altitude}
                    groundSpeed={gps.groundSpeed}
                    heading={gps.heading}
                    hdop={gps.hdop}
                    satellites={gps.satellites}
                    fixType={gps.fixType}
                    homeDistance={gps.homeDistance}
                    homeBearing={gps.homeBearing}
                    homeSet={gps.homeSet}
                  />
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sensors" className="h-full m-0">
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/30">
                      <h3 className="text-xs font-bold text-cyan-400 mb-3">ENVIRONMENT</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-2 bg-gray-900/50 rounded">
                          <div className="flex items-center gap-1 text-gray-500 text-[10px]">
                            <Thermometer className="w-3 h-3" />
                            Temperature
                          </div>
                          <div className="text-lg font-mono text-cyan-400">
                            {envData.temperature.toFixed(1)}°C
                          </div>
                        </div>
                        <div className="p-2 bg-gray-900/50 rounded">
                          <div className="flex items-center gap-1 text-gray-500 text-[10px]">
                            <Wind className="w-3 h-3" />
                            Humidity
                          </div>
                          <div className="text-lg font-mono text-cyan-400">
                            {envData.humidity.toFixed(0)}%
                          </div>
                        </div>
                        <div className="p-2 bg-gray-900/50 rounded">
                          <div className="flex items-center gap-1 text-gray-500 text-[10px]">
                            <BarChart3 className="w-3 h-3" />
                            Pressure
                          </div>
                          <div className="text-lg font-mono text-cyan-400">
                            {envData.pressure.toFixed(1)} hPa
                          </div>
                        </div>
                        <div className="p-2 bg-gray-900/50 rounded">
                          <div className="flex items-center gap-1 text-gray-500 text-[10px]">
                            <Signal className="w-3 h-3" />
                            Baro Alt
                          </div>
                          <div className="text-lg font-mono text-cyan-400">
                            {envData.altitude.toFixed(0)}m
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/30">
                      <h3 className="text-xs font-bold text-cyan-400 mb-3">RADIO LINK</h3>
                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div>
                          <span className="text-gray-500">RSSI</span>
                          <div className="text-cyan-400 font-mono">-65 dBm</div>
                        </div>
                        <div>
                          <span className="text-gray-500">SNR</span>
                          <div className="text-cyan-400 font-mono">12 dB</div>
                        </div>
                        <div>
                          <span className="text-gray-500">TX Power</span>
                          <div className="text-cyan-400 font-mono">20 dBm</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Link Quality</span>
                          <div className="text-green-400 font-mono">98%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="mission" className="h-full m-0">
                <ScrollArea className="h-full p-4">
                  <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/30">
                    <h3 className="text-xs font-bold text-cyan-400 mb-3">MISSION PLANNER</h3>
                    <p className="text-gray-500 text-sm">
                      Mission planning with waypoints coming soon...
                    </p>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="settings" className="h-full m-0">
                <ScrollArea className="h-full p-4">
                  <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/30">
                    <h3 className="text-xs font-bold text-cyan-400 mb-3">CONFIGURATION</h3>
                    <p className="text-gray-500 text-sm">
                      Drone configuration and tuning coming soon...
                    </p>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Warning bar when armed */}
      {armed && (
        <div className="fixed bottom-0 left-0 right-0 p-2 bg-red-900/80 border-t border-red-500 flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-200 font-bold">
            MOTORS ARMED - PROPELLERS ARE SPINNING
          </span>
        </div>
      )}
    </div>
  )
}
