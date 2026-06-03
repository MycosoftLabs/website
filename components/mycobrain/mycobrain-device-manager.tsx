// @ts-nocheck
"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useMycoBrain, getIAQLabel, formatUptime, formatGasResistance } from "@/hooks/use-mycobrain"
import { FirmwareUpdater } from "./firmware-updater"
// New NDJSON protocol widgets
import {
  LedControlWidget,
  BuzzerControlWidget,
  PeripheralGrid,
  TelemetryChartWidget,
  CommunicationPanel,
} from "./widgets"
import { MINDEXIntegrationWidget } from "./mindex-integration-widget"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Cpu,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  Timer,
  MapPin,
  Lightbulb,
  LightbulbOff,
  Palette,
  Volume2,
  VolumeX,
  Settings,
  Terminal,
  Play,
  Square,
  CircleDot,
  BarChart3,
  Gauge,
  Usb,
  Power,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Plug,
  History,
  Trash2,
  XCircle,
  PlayCircle,
  StopCircle,
  Wrench,
  FileText,
  Lock,
  Unlock,
  Server,
  ArrowLeft,
  Network,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { FirmwareAuditBadge } from "./firmware-audit-badge"
import { DeviceAgentChat } from "./device-agent-chat"
import { isFieldRegistryId } from "@/lib/devices/firmware-compatibility"
import type { CompatibilityTier, FirmwareAuditDevice } from "@/lib/devices/firmware-compatibility"

/** Raw serial port info returned by the MycoBrain ports API */
interface SerialPortInfo {
  port?: string;
  path?: string;
  device?: string;
  id?: string;
  description?: string;
  is_mycobrain?: boolean;
  is_connected?: boolean;
}

/** Raw device info returned by the MycoBrain devices API */
interface RawMycoBrainDevice {
  port?: string;
  connected?: boolean;
}

/** Diagnostics result returned by the MycoBrain diagnostics API */
interface DiagnosticsResult {
  status: string;
  checks?: Array<{ name: string; status: string; message?: string }>;
  [key: string]: unknown;
}

/** Network device returned by the MAS Device Registry */
interface NetworkDevice {
  id?: string
  device_id?: string
  name?: string
  device_name?: string
  device_display_name?: string
  display_name?: string
  type?: string
  device_role?: string
  status?: string
  firmware_version?: string
  host?: string
  port?: number
  ip?: string
  extra?: Record<string, unknown>
  [key: string]: unknown
}

interface MycoBrainDeviceManagerProps {
  initialPort?: string
  initialDeviceId?: string
}

interface SensorHistoryPoint {
  timestamp: Date
  bme1_temp: number
  bme1_humidity: number
  bme1_iaq: number
  bme2_temp: number
  bme2_humidity: number
  bme2_iaq: number
}

function normalizeConsoleLocalPort(value?: string | null) {
  if (!value) return null
  const trimmed = String(value).trim()
  if (/^COM\d+$/i.test(trimmed) || trimmed.startsWith("/dev/")) return trimmed.toUpperCase()
  const mycoBrainSerial = trimmed.match(/^mycobrain-(COM\d+)$/i)
  return mycoBrainSerial?.[1]?.toUpperCase() || null
}

export function MycoBrainDeviceManager({
  initialPort,
  initialDeviceId,
}: MycoBrainDeviceManagerProps = {}) {
  const router = useRouter()
  const initialLocalPort = normalizeConsoleLocalPort(initialPort)
  const {
    devices,
    loading,
    error,
    isConnected,
    lastUpdate,
    refresh,
    fetchSensors,
    setNeoPixel,
    neoPixelRainbow,
    neoPixelOff,
    buzzerBeep,
    buzzerMelody,
    buzzerOff,
    sendControl,
  } = useMycoBrain(initialLocalPort ? 0 : 15000)

  const refreshRef = useRef(refresh)
  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  const [selectedPort, setSelectedPort] = useState<string | null>(initialPort || null)
  const [selectedRemoteId, setSelectedRemoteId] = useState<string | null>(
    initialDeviceId && isFieldRegistryId(initialDeviceId) ? initialDeviceId : null
  )
  const isRemoteMode = Boolean(selectedRemoteId && isFieldRegistryId(selectedRemoteId))
  const [neopixelColor, setNeopixelColor] = useState({ r: 0, g: 255, b: 0 })
  const [neopixelBrightness, setNeopixelBrightness] = useState(128)
  const [buzzerFrequency, setBuzzerFrequency] = useState(1000)
  const [commandLoading, setCommandLoading] = useState<string | null>(null)
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [sensorHistory, setSensorHistory] = useState<SensorHistoryPoint[]>([])
  const [localSerialSensorData, setLocalSerialSensorData] = useState<MycoBrainSensors>({})
  const [localSerialSensorIdentity, setLocalSerialSensorIdentity] = useState<Record<string, unknown>>({})
  const [activeTab, setActiveTab] = useState("sensors")
  
  // Cache sensor count to prevent blinking during refreshes
  const lastSensorCountRef = useRef<string | null>(null)

  const explicitLocalPort = !selectedRemoteId
    ? normalizeConsoleLocalPort(selectedPort || initialPort)
    : null
  const detectedDevice =
    devices.find((d) => d.port === selectedPort || d.device_id === `mycobrain-${selectedPort}`) ||
    devices.find((d) => explicitLocalPort && (d.port === explicitLocalPort || d.device_id === `mycobrain-${explicitLocalPort}`)) ||
    devices[0]
  const localSerialFallbackDevice: MycoBrainDevice | null = explicitLocalPort
    ? {
        port: explicitLocalPort,
        device_id: `mycobrain-${explicitLocalPort}`,
        connected: true,
        device_info: {
          side: "side_a",
          mdp_version: 2,
          status: "online",
          firmware_version: "side-a-mdp-2.1.1",
          board_type: "MycoBrain ESP32-S3",
        },
        board_id: localSerialSensorIdentity.board_id,
        sensor_instances: localSerialSensorIdentity.sensor_instances,
        sensor_data: localSerialSensorData,
        capabilities: {
          bme688_count: 2,
          has_lora: false,
          has_neopixel: true,
          has_buzzer: true,
          i2c_bus: true,
          analog_inputs: 4,
          digital_io: 3,
        },
        location: {
          lat: 32.56289,
          lng: -117.1357,
          source: "manual",
        },
      }
    : null

  const mergedLocalSerialDevice = explicitLocalPort && detectedDevice
    ? {
        ...detectedDevice,
        board_id: localSerialSensorIdentity.board_id || detectedDevice.board_id,
        sensor_instances: localSerialSensorIdentity.sensor_instances || detectedDevice.sensor_instances,
        sensor_data: {
          ...(detectedDevice.sensor_data || {}),
          ...localSerialSensorData,
        },
      }
    : null

  const device = mergedLocalSerialDevice || detectedDevice || localSerialFallbackDevice

  // Calculate and cache sensor count
  const sensorCount = (() => {
    let count: string | null = null
    
    // Check capabilities first
    if (device?.capabilities?.bme688_count) {
      count = `${device.capabilities.bme688_count}x BME688`
    }
    // Check sensor_data for legacy support
    else if (device?.sensor_data?.bme688_1) {
      count = device.sensor_data?.bme688_2 ? "2x BME688" : "1x BME688"
    }
    // Check I2C addresses for BME688 (0x76=118, 0x77=119)
    else if (device?.telemetry?.i2c_addresses || device?.i2c_addresses) {
      const i2cAddrs = device.telemetry?.i2c_addresses || device.i2c_addresses || []
      const bmeCount = i2cAddrs.filter((addr: number) => addr === 0x76 || addr === 0x77 || addr === 118 || addr === 119).length
      if (bmeCount > 0) count = `${bmeCount}x BME688`
    }
    
    // Update cache if we have a valid count
    if (count) {
      lastSensorCountRef.current = count
    }
    
    // Return cached value if current is null (prevents blinking)
    return count || lastSensorCountRef.current || "None"
  })()

  // Select device on load - prefer initialPort, then first available device
  useEffect(() => {
    if (devices.length > 0) {
      if (initialPort && devices.find((d) => d.port === initialPort)) {
        setSelectedPort(initialPort)
      } else if (!selectedPort) {
        setSelectedPort(devices[0].port)
      }
    }
  }, [devices, selectedPort, initialPort])

  // Track sensor history
  const bme1 = device?.sensor_data?.bme688_1
  const bme2 = device?.sensor_data?.bme688_2

  useEffect(() => {
    if (!bme1) return
    const newPoint: SensorHistoryPoint = {
      timestamp: new Date(),
      bme1_temp: bme1.temperature || 0,
      bme1_humidity: bme1.humidity || 0,
      bme1_iaq: bme1.iaq || 0,
      bme2_temp: bme2?.temperature || 0,
      bme2_humidity: bme2?.humidity || 0,
      bme2_iaq: bme2?.iaq || 0,
    }
    setSensorHistory((prev) => [...prev.slice(-59), newPoint])
  }, [bme1, bme2])

  const logToConsole = useCallback((message: string) => {
    setConsoleOutput((prev) => [
      ...prev.slice(-49),
      `[${new Date().toLocaleTimeString()}] ${message}`,
    ])
  }, [])

  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [serviceStatus, setServiceStatus] = useState<"checking" | "online" | "offline">("checking")
  const [availablePorts, setAvailablePorts] = useState<SerialPortInfo[]>([])
  const [portStatuses, setPortStatuses] = useState<Record<string, "available" | "locked" | "connected" | "unknown">>({})
  const [serialData, setSerialData] = useState<string[]>([])
  const [serialMonitoring, setSerialMonitoring] = useState(false)
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null)
  const [machineModeActive, setMachineModeActive] = useState(false)
  
  // Network devices state
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([])
  const [networkLoading, setNetworkLoading] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [firmwareAuditById, setFirmwareAuditById] = useState<
    Record<string, FirmwareAuditDevice>
  >({})
  const [remoteTelemetry, setRemoteTelemetry] = useState<Record<string, unknown> | null>(null)

  // Fetch network devices from MAS Device Registry
  const fetchNetworkDevices = useCallback(async () => {
    setNetworkLoading(true)
    setNetworkError(null)
    try {
      const res = await fetch("/api/devices/network?include_offline=true", {
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const data = await res.json()
        setNetworkDevices(data.devices || [])
      } else {
        const errData = await res.json().catch(() => ({}))
        setNetworkError(errData.error || `Error ${res.status}`)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      setNetworkError(`Failed to fetch network devices: ${msg}`)
    } finally {
      setNetworkLoading(false)
    }
  }, [])

  const loadFirmwareAudit = useCallback(async () => {
    try {
      const res = await fetch("/api/devices/firmware-audit", {
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) return
      const data = await res.json()
      const map: Record<string, FirmwareAuditDevice> = {}
      for (const row of data.devices || []) {
        map[row.device_id] = row
      }
      setFirmwareAuditById(map)
    } catch {
      /* non-fatal */
    }
  }, [])

  useEffect(() => {
    if (explicitLocalPort) return
    void fetchNetworkDevices()
    void loadFirmwareAudit()
  }, [explicitLocalPort, fetchNetworkDevices, loadFirmwareAudit])

  useEffect(() => {
    if (initialDeviceId && isFieldRegistryId(initialDeviceId)) {
      setSelectedRemoteId(initialDeviceId)
    }
  }, [initialDeviceId])

  const networkDeviceId = (d: NetworkDevice) =>
    String(d.device_id || d.id || "")

  const selectedNetworkDevice = networkDevices.find(
    (d) => networkDeviceId(d) === selectedRemoteId
  )

  const remoteSyntheticDevice = isRemoteMode
    ? {
        port: selectedRemoteId!,
        device_id: selectedRemoteId!,
        connected: selectedNetworkDevice?.status === "online",
        device_info: {
          mdp_version: (selectedNetworkDevice?.extra as { mdp_version?: number })?.mdp_version || 1,
          firmware_version: selectedNetworkDevice?.firmware_version,
          status: selectedNetworkDevice?.status || "unknown",
        },
        capabilities: {},
        sensor_data: remoteTelemetry || undefined,
      }
    : null

  const activeDevice = device || remoteSyntheticDevice

  const portForControl = isRemoteMode
    ? selectedRemoteId!
    : selectedPort ?? device?.port ?? ""
  const normalizedControlTarget = String(
    portForControl || selectedPort || device?.port || device?.device_id || ""
  ).toUpperCase()
  const isLocalCom4Bench =
    !isRemoteMode &&
    (normalizedControlTarget === "COM4" ||
      normalizedControlTarget === "MYCOBRAIN-COM4" ||
      normalizedControlTarget.endsWith("-COM4"))

  useEffect(() => {
    if (isRemoteMode || explicitLocalPort || !device?.port || !device?.connected) return
    const initialDelay = setTimeout(() => fetchSensors(portForControl), 500)
    const interval = setInterval(() => fetchSensors(portForControl), 15000)
    return () => {
      clearTimeout(initialDelay)
      clearInterval(interval)
    }
  }, [isRemoteMode, explicitLocalPort, device?.port, device?.connected, fetchSensors, portForControl])

  useEffect(() => {
    if (isRemoteMode || !explicitLocalPort) return
    let cancelled = false
    const loadLocalSerialSensors = async () => {
      try {
        const response = await fetch(`/api/mycobrain/${encodeURIComponent(explicitLocalPort)}/sensors`, {
          cache: "no-store",
          signal: AbortSignal.timeout(9000),
        })
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled && data?.sensors) {
          setLocalSerialSensorData(data.sensors)
          setLocalSerialSensorIdentity({
            board_id: data.board_id,
            sensor_instances: data.sensor_instances,
          })
        }
      } catch {
        // Keep the last known readings; serial reads can be briefly busy.
      }
    }

    const initialDelay = setTimeout(loadLocalSerialSensors, 250)
    const interval = setInterval(loadLocalSerialSensors, 5000)
    return () => {
      cancelled = true
      clearTimeout(initialDelay)
      clearInterval(interval)
    }
  }, [isRemoteMode, explicitLocalPort])

  useEffect(() => {
    if (!isRemoteMode || !selectedRemoteId) return
    void fetchNetworkDevices()
    const interval = setInterval(() => void fetchNetworkDevices(), 15000)
    return () => clearInterval(interval)
  }, [isRemoteMode, selectedRemoteId, fetchNetworkDevices])

  // Send command to network device
  const sendNetworkDeviceCommand = async (deviceId: string, command: string) => {
    logToConsole(`> Sending '${command}' to network device ${deviceId}...`)
    try {
      const res = await fetch(`/api/devices/network/${encodeURIComponent(deviceId)}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
        signal: AbortSignal.timeout(10000),
      })
      const text = await res.text()
      let data: Record<string, unknown> = {}
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : {}
      } catch {
        data = { raw: text || "(empty response)" }
      }
      if (res.ok) {
        logToConsole(`✓ Command response: ${JSON.stringify(data.response || data).slice(0, 100)}`)
        return data
      } else {
        logToConsole(`✗ Command failed: ${String(data.error || "Unknown error")}`)
        throw new Error(String(data.error || "Command failed"))
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error"
      logToConsole(`✗ Error: ${msg}`)
      throw error
    }
  }
  const machineModePendingRef = useRef(false)
  const lastServiceErrorRef = useRef<string | null>(null)
  const serviceErrorCountRef = useRef(0)

  useEffect(() => {
    if (isRemoteMode || isLocalCom4Bench) {
      setMachineModeActive(true)
    }
  }, [isRemoteMode, isLocalCom4Bench])

  // Auto-initialize machine mode when serial device connects
  useEffect(() => {
    if (isLocalCom4Bench) {
      setMachineModeActive(true)
      machineModePendingRef.current = false
      return
    }
    if (!device?.port || !device?.connected) {
      setMachineModeActive(false)
      return
    }
    
    // Prevent duplicate initialization
    if (machineModeActive || machineModePendingRef.current) return
    machineModePendingRef.current = true
    
    const initMachineMode = async () => {
      try {
        logToConsole("> Auto-initializing machine mode...")
        const res = await fetch(`/api/mycobrain/${encodeURIComponent(portForControl)}/machine-mode`, {
          method: "POST",
          signal: AbortSignal.timeout(10000),
        })
        const data = await res.json()
        if (data.success) {
          setMachineModeActive(true)
          logToConsole("✓ Machine mode auto-initialized")
        } else {
          logToConsole(`✗ Machine mode init failed: ${data.error || "Unknown"}`)
        }
      } catch (error) {
        logToConsole(`✗ Machine mode init error: ${error}`)
      } finally {
        machineModePendingRef.current = false
      }
    }
    
    // Small delay to let device settle after connection
    const timer = setTimeout(initMachineMode, 1000)
    return () => clearTimeout(timer)
  }, [device?.port, device?.connected, isLocalCom4Bench, logToConsole, machineModeActive, portForControl])

  const handleCommand = async (name: string, action: () => Promise<unknown>) => {
    setCommandLoading(name)
    logToConsole(`> Sending ${name}...`)
    try {
      await action()
      logToConsole(`✓ ${name} success`)
    } catch (error) {
      logToConsole(`✗ ${name} failed: ${error}`)
    } finally {
      setCommandLoading(null)
    }
  }

  const sendLegacyLed = async (action: string, payload: Record<string, unknown> = {}) => {
    const response = await fetch(`/api/mycobrain/${encodeURIComponent(portForControl)}/led`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
      signal: AbortSignal.timeout(8000),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result?.success === false) {
      throw new Error(result?.error || result?.message || `LED command failed (${response.status})`)
    }
    return result
  }

  const sendLegacyBuzzer = async (action: string, payload: Record<string, unknown> = {}) => {
    const response = await fetch(`/api/mycobrain/${encodeURIComponent(portForControl)}/buzzer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
      signal: AbortSignal.timeout(8000),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok || result?.success === false) {
      throw new Error(result?.error || result?.message || `Buzzer command failed (${response.status})`)
    }
    return result
  }

  // Track connected ports to avoid duplicate connections
  const connectedPortsRef = useRef<Set<string>>(new Set())
  // Mutex to prevent concurrent auto-scan runs
  const autoScanRunningRef = useRef(false)

  // Check service status and fetch available ports
  useEffect(() => {
    if (explicitLocalPort) {
      setServiceStatus("online")
      return
    }

    const checkService = async () => {
      try {
        // First check the service status API
        const statusRes = await fetch("/api/services/status", {
          signal: AbortSignal.timeout(6000),
        })
        
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          const mycobrainService = statusData.services?.find((s: { id: string; status?: string }) => s.id === "mycobrain")
          if (mycobrainService && mycobrainService.status === "online") {
            setServiceStatus("online")
          }
        }
        
        // Fallback: check mycobrain API directly
        const res = await fetch("/api/mycobrain", {
          signal: AbortSignal.timeout(8000),
        })
        const data = await res.json()
        // Service is healthy if we get a response without the specific error
        const isOnline = !data.error || data.error !== "MycoBrain service not running"
        setServiceStatus(isOnline ? "online" : "offline")
        
        // Fetch available ports if service is online
        if (isOnline) {
          try {
            const portsRes = await fetch("/api/mycobrain/ports", {
              signal: AbortSignal.timeout(8000),
            }).catch(() => null)
            
            if (portsRes?.ok) {
              const portsData = await portsRes.json()
              setAvailablePorts(portsData.ports || [])
              
              // Update port statuses
              const statusMap: Record<string, "available" | "locked" | "connected" | "unknown"> = {}
              portsData.ports?.forEach((p: SerialPortInfo) => {
                const key = p.path || p.port || p.id
                if (!key) return
                // Our service currently doesn't report locks; treat listed ports as available.
                statusMap[key] = "available"
              })
              setPortStatuses(statusMap)
            }
          } catch (error) {
            // Avoid console spam; this runs on an interval.
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)

        // Timeouts are common during container restarts / cold paths; don't flip UI offline.
        const isTimeout =
          (error instanceof Error && error.name === "TimeoutError") ||
          msg.toLowerCase().includes("timeout") ||
          msg.toLowerCase().includes("timed out")

        if (isTimeout) return

        serviceErrorCountRef.current += 1
        if (lastServiceErrorRef.current !== msg) {
          lastServiceErrorRef.current = msg
          console.error("Service check error:", error)
        }
        if (serviceErrorCountRef.current >= 2) setServiceStatus("offline")
      }
    }
    checkService()
    const interval = setInterval(checkService, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [explicitLocalPort])

  // Continuous auto-scanning for MycoBoard devices (every 5 seconds)
  useEffect(() => {
    if (serviceStatus !== "online") return // Only scan when service is online
    if (isRemoteMode || explicitLocalPort) return
    
    const autoScanAndConnect = async () => {
      // Prevent concurrent runs
      if (autoScanRunningRef.current) return
      autoScanRunningRef.current = true
      
      try {
        // Get currently connected devices
        const devicesRes = await fetch("/api/mycobrain/devices", {
          signal: AbortSignal.timeout(5000),
        }).catch(() => null)
        
        const connectedDevicePorts = new Set<string>()
        if (devicesRes?.ok) {
          const devicesData = await devicesRes.json()
          devicesData.devices?.forEach((d: RawMycoBrainDevice) => {
            if (d.port) connectedDevicePorts.add(d.port)
          })
        }
        
        // Update connected ports ref
        connectedPortsRef.current = connectedDevicePorts
        
        // Get available ports
        const portsRes = await fetch("/api/mycobrain/ports", {
          signal: AbortSignal.timeout(5000),
        }).catch(() => null)
        
        if (!portsRes?.ok) return
        
        const portsData = await portsRes.json()
        const ports = portsData.ports || []
        
        // Find MycoBoard devices that aren't connected yet
        // Be more permissive - try to connect to ANY serial port that's not already connected
        const mycoboardPorts = ports.filter((p: SerialPortInfo) => {
          const portKey = p.path || p.port || p.id
          if (!portKey) return false

          // Check if already connected
          if (connectedDevicePorts.has(portKey)) return false

          // Accept ANY serial port - be very permissive for auto-discovery
          // This will try to connect to any available port
          const isSerialPort =
            p.is_mycobrain ||
            portKey.startsWith("COM") ||
            portKey.startsWith("/dev/tty") ||
            portKey.startsWith("/dev/cu.") ||
            (p.description && (
              p.description.toLowerCase().includes("serial") ||
              p.description.toLowerCase().includes("usb") ||
              p.description.toLowerCase().includes("ch340") ||
              p.description.toLowerCase().includes("cp210") ||
              p.description.toLowerCase().includes("ftdi") ||
              p.description.toLowerCase().includes("esp32") ||
              p.description.toLowerCase().includes("mycoboard") ||
              p.description.toLowerCase().includes("uart")
            )) ||
            // If no description, still try it if it looks like a serial port
            (portKey.match(/^(COM\d+|tty[A-Z]+\d+|cu\.[a-z]+)/i))
          
          return isSerialPort
        })
        
        // Auto-connect to first unconnected MycoBoard device
        if (mycoboardPorts.length > 0 && !scanning) {
          const targetPort = mycoboardPorts[0]
          const portKey = targetPort.path || targetPort.port || targetPort.id
          
          if (portKey && !connectedPortsRef.current.has(portKey)) {
            // Silently attempt connection (don't show scanning state)
            try {
              // Try connecting via the API route
              const connectRes = await fetch("/api/mycobrain", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "connect", port: portKey }),
                signal: AbortSignal.timeout(15000),
              })
              
              if (!connectRes.ok) {
                // If connection failed, log for debugging but don't spam
                console.debug(`Auto-connect attempt failed for ${portKey}: ${connectRes.status}`)
                return
              }
              
              const result = await connectRes.json()
              
              if (result.success || result.status === "connected" || result.status === "already_connected") {
                // Successfully connected - refresh device list
                connectedPortsRef.current.add(portKey)
                await refreshRef.current()
                logToConsole(`✓ Auto-connected to MycoBoard on ${portKey}`)
                
                // Also trigger auto-registration
                try {
                  await fetch(`/api/mycobrain/${encodeURIComponent(portKey)}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      device_id: portKey,
                      port: portKey,
                      serial_number: `AUTO-${Date.now()}`,
                      firmware_version: "1.0.0"
                    }),
                    signal: AbortSignal.timeout(5000),
                  }).catch(() => {}) // Best effort
                } catch {}
              } else {
                console.debug(`Connection result for ${portKey}:`, result.status || result.error)
              }
            } catch (error) {
              // Silently fail - port might be locked or device not ready
              console.debug(`Auto-connect error for ${portKey}:`, error)
            }
          }
        }
      } catch (error) {
        // Silently fail - this runs continuously
      } finally {
        autoScanRunningRef.current = false
      }
    }
    
    // Initial scan immediately, then every 10 seconds (reduced frequency to prevent resource exhaustion)
    autoScanAndConnect() // Run immediately
    const interval = setInterval(autoScanAndConnect, 10000) // Every 10 seconds
    
    return () => {
      clearInterval(interval)
    }
  }, [logToConsole, serviceStatus, scanning, isRemoteMode, explicitLocalPort]) // Removed refresh from deps to prevent interval spam

  // Stream serial data when device is connected and monitoring is enabled
  useEffect(() => {
    if (!device || !serialMonitoring) return
    
    const fetchSerialData = async () => {
      try {
        const res = await fetch(`/api/mycobrain/${portForControl}/serial`, {
          signal: AbortSignal.timeout(5000),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.data) {
            setSerialData(prev => [...prev.slice(-99), ...data.data].slice(-100))
          }
        }
      } catch (error) {
        // Silently fail - serial endpoint might not exist yet
      }
    }
    
    const interval = setInterval(fetchSerialData, 1000)
    return () => clearInterval(interval)
  }, [device, portForControl, serialMonitoring])

  if (loading && devices.length === 0 && !explicitLocalPort && !isRemoteMode) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading devices...</p>
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}
      </div>
    )
  }

  const handleScanForDevices = async () => {
    setScanning(true)
    setScanResult(null)
    logToConsole("> Scanning for MycoBrain devices...")
    
    try {
      // First check if service is running
      const healthRes = await fetch("/api/mycobrain")
      const healthData = await healthRes.json()
      
      if (healthData.error) {
        setScanResult(`MycoBrain service not running: ${healthData.message}`)
        logToConsole(`✗ Service error: ${healthData.error}`)
        return
      }
      
      // Get available ports
      const portsRes = await fetch("/api/mycobrain/ports")
      if (!portsRes.ok) {
        const errorData = await portsRes.json().catch(() => ({}))
        setScanResult(`Failed to scan ports: ${errorData.message || "Service unavailable"}`)
        logToConsole("✗ Failed to get ports")
        return
      }
      
      const portsData = await portsRes.json()
      const ports = portsData.ports || []
      setAvailablePorts(ports)
      
      logToConsole(`> Found ${ports.length} serial port(s)`)
      
      // Prioritize COM7 (common MycoBrain port), then COM5, COM4, then other COM ports
      const com7Port = ports.find((p: SerialPortInfo) => (p.port || p.device) === "COM7")
      const com5Port = ports.find((p: SerialPortInfo) => (p.port || p.device) === "COM5")
      const com4Port = ports.find((p: SerialPortInfo) => (p.port || p.device) === "COM4")
      const mycobrainPorts = ports.filter((p: SerialPortInfo) => {
        const portName = p.port || p.device
        return p.is_mycobrain ||
          (portName?.startsWith("COM") && !["COM4", "COM5", "COM7"].includes(portName)) ||
          portName?.startsWith("/dev/tty")
      })
      
      const targetPorts = [com7Port, com5Port, com4Port, ...mycobrainPorts].filter(Boolean)
      
      if (targetPorts.length === 0) {
        setScanResult("No MycoBrain devices found. Make sure device is connected via USB.")
        logToConsole("✗ No MycoBrain devices found")
        return
      }
      
      // Try to connect to each port (prioritize COM5)
      for (const portInfo of targetPorts) {
        const port = portInfo.port
        logToConsole(`> Attempting to connect to ${port}...`)
        
        try {
          const connectRes = await fetch("/api/mycobrain", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "connect", port }),
            signal: AbortSignal.timeout(15000),
          })
          
          const result = await connectRes.json()
          
          if (result.success || result.status === "connected") {
            setScanResult(`Successfully connected to ${port}!`)
            logToConsole(`✓ Connected to ${port}`)
            // Wait a moment then refresh
            await new Promise(resolve => setTimeout(resolve, 500))
            await refresh()
            return
          } else {
            logToConsole(`✗ Connection failed: ${result.message || result.error || result.detail}`)
            if (result.error?.includes("locked") || result.detail?.includes("locked")) {
              setPortStatuses(prev => ({ ...prev, [port]: "locked" }))
            }
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            logToConsole(`✗ Connection to ${port} timed out (port may be locked)`)
            setPortStatuses(prev => ({ ...prev, [port]: "locked" }))
          } else {
            logToConsole(`✗ Failed to connect to ${port}: ${error}`)
          }
        }
      }

      setScanResult("Found ports but could not connect. Check device is powered on and not in use by another application.")
      logToConsole("✗ Could not connect to any device")
    } catch (error) {
      setScanResult(`Scan failed: ${error}`)
      logToConsole(`✗ Scan error: ${error}`)
    } finally {
      setScanning(false)
    }
  }

  const handleServiceAction = async (action: "start" | "stop" | "kill" | "restart") => {
    logToConsole(`> ${action.charAt(0).toUpperCase() + action.slice(1)}ing MycoBrain service...`)
    try {
      const res = await fetch("/api/services/mycobrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        signal: AbortSignal.timeout(10000),
      })
      const result = await res.json()
      if (res.ok) {
        logToConsole(`✓ Service ${action}ed successfully`)
        setServiceStatus(action === "start" || action === "restart" ? "online" : "offline")
        await new Promise(resolve => setTimeout(resolve, 2000))
        await refresh()
      } else {
        logToConsole(`✗ Failed to ${action} service: ${result.error || result.message}`)
      }
    } catch (error) {
      logToConsole(`✗ Service ${action} error: ${error}`)
    }
  }

  const handleClearPortLocks = async () => {
    logToConsole("> Clearing port locks...")
    try {
      const res = await fetch("/api/mycobrain/ports/clear-locks", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
      })
      const result = await res.json()
      if (res.ok) {
        logToConsole("✓ Port locks cleared")
        setPortStatuses({})
        await handleScanForDevices()
      } else {
        logToConsole(`✗ Failed to clear locks: ${result.error || result.message}`)
      }
    } catch (error) {
      logToConsole(`✗ Clear locks error: ${error}`)
    }
  }

  const handleRunDiagnostics = async () => {
    logToConsole("> Running diagnostics...")
    try {
      const deviceId = device?.device_id || selectedPort || device?.port || "all"
      const res = await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/diagnostics`, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) {
        const data = await res.json()
        setDiagnostics(data)
        logToConsole("✓ Diagnostics complete")
      } else {
        // If diagnostics endpoint doesn't exist, create basic diagnostics
        const portStatusSummary = Object.entries(portStatuses).map(([p, s]) => `${p}: ${s}`).join(", ") || "None"
        const basicDiagnostics = {
          service_status: serviceStatus,
          port_status: portStatusSummary,
          available_ports: availablePorts.length,
          connected_devices: devices.length,
          selected_port: deviceId,
          timestamp: new Date().toISOString(),
        }
        setDiagnostics(basicDiagnostics)
        logToConsole("✓ Basic diagnostics complete")
      }
    } catch (error: unknown) {
      // Create basic diagnostics on error
      const portStatusSummary = Object.entries(portStatuses).map(([p, s]) => `${p}: ${s}`).join(", ") || "None"
      const errorMsg = error instanceof Error ? error.message : String(error)
      const fallbackDeviceId = device?.device_id || selectedPort || device?.port || "unknown"
      const basicDiagnostics = {
        service_status: serviceStatus,
        port_status: portStatusSummary,
        available_ports: availablePorts.length,
        connected_devices: devices.length,
        selected_port: fallbackDeviceId,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      }
      setDiagnostics(basicDiagnostics)
      logToConsole(`⚠ Diagnostics completed with errors: ${errorMsg}`)
    }
  }

  if (!activeDevice) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Cpu className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No MycoBrain Connected</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Connect a MycoBrain via USB, or select a field device from the MAS registry (Mushroom 1, Hyphae 1, …).
          </p>

          {networkDevices.length > 0 ? (
            <Card className="mb-6 w-full max-w-xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  Network Devices (MAS Registry)
                </CardTitle>
                <CardDescription>
                  Open the full console for MQTT field agents — no USB required on this machine.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {networkDevices.map((nd) => {
                  const id = networkDeviceId(nd)
                  const audit = firmwareAuditById[id]
                  return (
                    <Button
                      key={id}
                      variant="outline"
                      className="w-full min-h-[44px] justify-between"
                      onClick={() => setSelectedRemoteId(id)}
                    >
                      <span>
                        {nd.device_display_name || nd.display_name || nd.device_name || nd.name || id}
                      </span>
                      <FirmwareAuditBadge
                        tier={audit?.compatibility_tier as CompatibilityTier}
                        firmwareVersion={audit?.firmware_version || nd.firmware_version}
                      />
                    </Button>
                  )
                })}
              </CardContent>
            </Card>
          ) : networkLoading ? (
            <p className="text-sm text-muted-foreground mb-4">Loading network registry…</p>
          ) : networkError ? (
            <p className="text-sm text-red-500 mb-4">{networkError}</p>
          ) : null}
          
          {/* Service Status */}
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
            serviceStatus === "online" 
              ? "bg-green-500/20 text-green-500 border border-green-500/50" 
              : serviceStatus === "offline"
              ? "bg-red-500/20 text-red-500 border border-red-500/50"
              : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50"
          }`}>
            {serviceStatus === "online" ? (
              <>
                <CheckCircle className="h-4 w-4" />
                MycoBrain service is running
              </>
            ) : serviceStatus === "offline" ? (
              <>
                <AlertCircle className="h-4 w-4" />
                MycoBrain service not running - Start: python services/mycobrain/mycobrain_service.py
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Checking service status...
              </>
            )}
          </div>
          
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-500/20 text-red-500 border border-red-500/50">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              {error}
            </div>
          )}
          
          {scanResult && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              scanResult.includes("Successfully") 
                ? "bg-green-500/20 text-green-500 border border-green-500/50" 
                : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50"
            }`}>
              {scanResult}
            </div>
          )}
          
          <div className="flex gap-3">
            <Button onClick={handleScanForDevices} disabled={scanning || serviceStatus === "offline"}>
              <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning..." : "Scan for Devices"}
            </Button>
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          {/* Service Management */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                Service Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction("start")}
                  disabled={serviceStatus === "online"}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Service
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction("stop")}
                  disabled={serviceStatus === "offline"}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Service
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction("kill")}
                  disabled={serviceStatus === "offline"}
                  className="text-red-500 hover:text-red-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Kill Service
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction("restart")}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart Service
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Port Selection */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Usb className="h-4 w-4" />
                Port Selection
              </CardTitle>
              <CardDescription>Select a COM port to connect to</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {(availablePorts.length > 0 ? availablePorts.map((p) => p.port).filter((p): p is string => !!p) : ["COM3", "COM4", "COM5", "COM6"]).map((port: string) => {
                  const portInfo = availablePorts.find((p) => p.port === port)
                  const status = portStatuses[port] || (portInfo?.is_connected ? "connected" : portInfo ? "available" : "unknown")
                  const isLocked = status === "locked"
                  
                  return (
                    <Button
                      key={port}
                      variant={status === "connected" ? "default" : isLocked ? "destructive" : "outline"}
                      size="sm"
                      className="relative"
                      onClick={async () => {
                        if (isLocked) {
                          logToConsole(`⚠ Port ${port} is locked. Attempting to clear...`)
                          await handleClearPortLocks()
                          return
                        }
                        setScanning(true)
                        setScanResult(null)
                        logToConsole(`> Connecting to ${port}...`)
                        try {
                          const res = await fetch("/api/mycobrain", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "connect", port }),
                            signal: AbortSignal.timeout(15000),
                          })
                          const result = await res.json()
                          if (result.success || result.status === "connected" || result.status === "already_connected") {
                            setScanResult(`Successfully connected to ${port}!`)
                            logToConsole(`✓ Connected to ${port}`)
                            setSelectedPort(port)
                            
                            // Auto-register device with MINDEX, NatureOS, and MAS
                            const deviceId = result.device_id || port
                            try {
                              const registerRes = await fetch(`/api/mycobrain/${encodeURIComponent(deviceId)}/register`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  device_id: deviceId,
                                  port,
                                  serial_number: deviceId,
                                  firmware_version: "unknown",
                                }),
                                signal: AbortSignal.timeout(5000),
                              })
                              if (registerRes.ok) {
                                const regResult = await registerRes.json()
                                logToConsole(`✓ Device registered: MINDEX=${regResult.registrations?.mindex?.status || 'N/A'}, NatureOS=${regResult.registrations?.natureos?.status || 'N/A'}`)
                              }
                            } catch (regError) {
                              logToConsole(`⚠ Registration failed (non-critical): ${regError}`)
                            }
                            
                            await new Promise(resolve => setTimeout(resolve, 500))
                            await refresh()
                          } else {
                            const errorMsg = result.message || result.error || result.detail || "Unknown error"
                            setScanResult(`Failed to connect to ${port}: ${errorMsg}`)
                            logToConsole(`✗ Connection failed: ${errorMsg}`)
                            if (errorMsg.includes("locked") || errorMsg.includes("in use")) {
                              setPortStatuses(prev => ({ ...prev, [port]: "locked" }))
                            }
                          }
                        } catch (error) {
                          if (error instanceof Error && error.name === "AbortError") {
                            setScanResult(`Connection to ${port} timed out (port may be locked)`)
                            logToConsole(`✗ Connection timeout - port may be locked`)
                            setPortStatuses(prev => ({ ...prev, [port]: "locked" }))
                          } else {
                            setScanResult(`Error connecting to ${port}: ${error}`)
                            logToConsole(`✗ Error: ${error}`)
                          }
                        } finally {
                          setScanning(false)
                        }
                      }}
                      disabled={scanning || serviceStatus === "offline"}
                    >
                      <div className="flex items-center gap-2">
                        {status === "connected" && <CheckCircle className="h-3 w-3" />}
                        {isLocked && <Lock className="h-3 w-3" />}
                        {status === "available" && <CircleDot className="h-3 w-3" />}
                        {port}
                      </div>
                      {isLocked && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </Button>
                  )
                })}
              </div>
              
              {Object.values(portStatuses).some(s => s === "locked") && (
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearPortLocks}
                    className="text-orange-500"
                  >
                    <Unlock className="h-4 w-4 mr-2" />
                    Clear Port Locks
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnostics */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Diagnostics & Debugging
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunDiagnostics}
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Run Diagnostics
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearPortLocks}
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Clear All Locks
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    logToConsole("> Fetching available ports...")
                    try {
                      const res = await fetch("/api/mycobrain/ports", { signal: AbortSignal.timeout(5000) })
                      if (res.ok) {
                        const data = await res.json()
                        setAvailablePorts(data.ports || [])
                        logToConsole(`✓ Found ${data.ports?.length || 0} port(s)`)
                        data.ports?.forEach((p: SerialPortInfo) => {
                          logToConsole(`  - ${p.port}: ${p.description || "Unknown"} (Connected: ${p.is_connected})`)
                        })
                      }
                    } catch (error) {
                      logToConsole(`✗ Failed to fetch ports: ${error}`)
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Ports
                </Button>
              </div>
              
              {diagnostics && (
                <div className="mt-4 p-3 rounded-lg bg-muted text-xs font-mono">
                  <pre>{JSON.stringify(diagnostics, null, 2)}</pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Console Output */}
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Console Output
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setConsoleOutput([])}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48 rounded-lg bg-black p-4 font-mono text-sm text-green-400">
                {consoleOutput.length === 0 ? (
                  <div className="text-muted-foreground">
                    <p>MycoBrain Device Manager Console</p>
                    <p>---</p>
                    <p>Ready for commands...</p>
                  </div>
                ) : (
                  consoleOutput.map((line, i) => <div key={i}>{line}</div>)
                )}
                <div className="animate-pulse">_</div>
              </ScrollArea>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    )
  }


  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/natureos/devices/network")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Device Network
        </Button>
        {devices.length > 1 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Network className="h-4 w-4" />
            <span>{devices.length} devices connected</span>
          </div>
        )}
      </div>

      {/* Device Header */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Cpu className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {isRemoteMode
                    ? selectedNetworkDevice?.device_display_name ||
                      selectedNetworkDevice?.display_name ||
                      selectedNetworkDevice?.device_name ||
                      "Field MycoBrain"
                    : "MycoBrain Gateway"}
                </h2>
                <p className="text-green-100 flex items-center gap-2">
                  {isRemoteMode ? (
                    <>
                      <Network className="h-4 w-4" />
                      {selectedRemoteId}
                    </>
                  ) : (
                    <>
                      <Usb className="h-4 w-4" />
                      {activeDevice.port}
                    </>
                  )}
                  <span className="mx-1">•</span>
                  <span>MDP v{activeDevice.device_info?.mdp_version || 1}</span>
                </p>
                {isRemoteMode && selectedRemoteId ? (
                  <div className="mt-2">
                    <FirmwareAuditBadge
                      tier={
                        firmwareAuditById[selectedRemoteId]?.compatibility_tier as CompatibilityTier
                      }
                      firmwareVersion={
                        firmwareAuditById[selectedRemoteId]?.firmware_version ||
                        selectedNetworkDevice?.firmware_version
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={activeDevice?.connected ? "bg-green-500" : "bg-red-500"}>
                {activeDevice?.connected ? (
                  <>
                    <Wifi className="h-3 w-3 mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 mr-1" />
                    Disconnected
                  </>
                )}
              </Badge>
              <span className="text-xs text-green-100">
                Last update: {lastUpdate?.toLocaleTimeString() || "—"}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-100 mb-1">
                <Timer className="h-4 w-4" />
                <span className="text-xs">Uptime</span>
              </div>
              <p className="text-lg font-bold">{formatUptime(device.device_info?.uptime)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-100 mb-1">
                <Radio className="h-4 w-4" />
                <span className="text-xs">LoRa</span>
              </div>
              <p className="text-lg font-bold">
                {device.device_info?.lora_status === "ok" ? "Active" : "Init"}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-100 mb-1">
                <CircleDot className="h-4 w-4" />
                <span className="text-xs">Sensors</span>
              </div>
              <p className="text-lg font-bold">
                {sensorCount}
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-100 mb-1">
                <Zap className="h-4 w-4" />
                <span className="text-xs">Status</span>
              </div>
              <p className="text-lg font-bold capitalize">{device.device_info?.status || "ready"}</p>
            </div>
          </div>
        </div>
      </Card>

      {isRemoteMode && selectedRemoteId ? (
        <DeviceAgentChat
          deviceId={selectedRemoteId}
          deviceName={
            selectedNetworkDevice?.device_display_name ||
            selectedNetworkDevice?.display_name ||
            selectedNetworkDevice?.device_name
          }
        />
      ) : null}

      {/* Main console tabs use plain buttons so live polling/control panels are not
          remounted by a presence layer while COM4 commands are running. */}
      <div className="space-y-6">
        <div role="tablist" aria-label="MycoBrain console sections" className="grid w-full grid-cols-8 rounded-lg bg-muted p-[3px] text-muted-foreground">
          <button type="button" role="tab" aria-selected={activeTab === "sensors"} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "sensors" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`} onClick={() => setActiveTab("sensors")}>
            <Thermometer className="h-4 w-4" />
            <span className="hidden sm:inline">Sensors</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "controls"} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "controls" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`} onClick={() => setActiveTab("controls")}>
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">Controls</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "communication"} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "communication" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`} onClick={() => setActiveTab("communication")}>
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Comms</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "network"} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "network" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`} onClick={() => setActiveTab("network")}>
            <Network className="h-4 w-4" />
            <span className="hidden sm:inline">Network</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "analytics"} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "analytics" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`} onClick={() => setActiveTab("analytics")}>
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "console"} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "console" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`} onClick={() => setActiveTab("console")}>
            <Terminal className="h-4 w-4" />
            <span className="hidden sm:inline">Console</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "config"} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "config" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`} onClick={() => setActiveTab("config")}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "diagnostics"} className={`inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === "diagnostics" ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"}`} onClick={() => setActiveTab("diagnostics")}>
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Diagnostics</span>
          </button>
        </div>

        {/* Sensors Tab */}
        {activeTab === "sensors" && (
        <section role="tabpanel" className="space-y-6">
          {/* Auto-Discovered Peripherals (Dynamic) */}
          {device && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  Discovered Peripherals
                </CardTitle>
                <CardDescription>
                  Auto-detected I2C devices and peripherals via machine mode protocol
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PeripheralGrid 
                  deviceId={portForControl}
                  sensorData={device.sensor_data}
                />
              </CardContent>
            </Card>
          )}
        </section>
        )}

        {/* Controls Tab */}
        {activeTab === "controls" && (
        <section role="tabpanel" className="space-y-6">
          <>
          {/* Machine Mode Status */}
          {device && (
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    NDJSON Machine Mode Protocol
                  </CardTitle>
                  <Badge variant={machineModeActive ? "default" : "secondary"}>
                    {machineModeActive ? "Active" : "Not Initialized"}
                  </Badge>
                </div>
                <CardDescription>
                  {machineModeActive 
                    ? "Machine mode is active. Use the widgets below for optical/acoustic modem and advanced controls."
                    : "Click 'Initialize Machine Mode' below to enable NDJSON protocol features."}
                </CardDescription>
              </CardHeader>
              {!machineModeActive && (
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      logToConsole("> Initializing machine mode...")
                      try {
                        const res = await fetch(`/api/mycobrain/${encodeURIComponent(portForControl)}/machine-mode`, {
                          method: "POST",
                          signal: AbortSignal.timeout(10000),
                        })
                        const data = await res.json()
                        if (data.success) {
                          setMachineModeActive(true)
                          logToConsole("✓ Machine mode initialized")
                          // Trigger peripheral scan
                          await fetch(`/api/mycobrain/${encodeURIComponent(portForControl)}/peripherals`, {
                            method: "POST",
                          })
                          logToConsole("✓ Peripheral scan triggered")
                        } else {
                          setMachineModeActive(false)
                          logToConsole(`✗ Machine mode failed: ${data.error || "Unknown error"}`)
                        }
                      } catch (error) {
                        setMachineModeActive(false)
                        logToConsole(`✗ Machine mode error: ${error}`)
                      }
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Initialize Machine Mode
                  </Button>
                </CardContent>
              )}
            </Card>
          )}
          
          {/* New NDJSON Protocol Widgets */}
          {device && machineModeActive && (
            <div className="grid gap-6 lg:grid-cols-2">
              <LedControlWidget 
                deviceId={portForControl}
                onCommand={logToConsole}
              />
              <BuzzerControlWidget 
                deviceId={portForControl}
                onCommand={logToConsole}
              />
            </div>
          )}
          
          {device && !machineModeActive && (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-5 w-5" />
                  <p className="font-medium">Machine Mode Not Active</p>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Initialize machine mode in the Diagnostics tab to unlock advanced features:
                  optical modem TX, acoustic modem TX, and automatic peripheral discovery.
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Legacy Controls (kept for backward compatibility) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* NeoPixel Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  NeoPixel LED Control (Legacy)
                </CardTitle>
                <CardDescription>Legacy MDP protocol controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleCommand("neopixel-color", () =>
                      sendLegacyLed("rgb", { r: neopixelColor.r, g: neopixelColor.g, b: neopixelColor.b })
                    )}
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Set Color
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCommand("neopixel-rainbow", () => sendLegacyLed("pattern", { pattern: "rainbow" }))}
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Rainbow
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCommand("neopixel-off", () => sendLegacyLed("off"))}
                  >
                    <LightbulbOff className="h-4 w-4" />
                  </Button>
                </div>

                {/* Color Sliders */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-red-500">Red: {neopixelColor.r}</Label>
                    <Slider
                      value={[neopixelColor.r]}
                      onValueChange={([v]) => setNeopixelColor((c) => ({ ...c, r: v }))}
                      max={255}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-green-500">Green: {neopixelColor.g}</Label>
                    <Slider
                      value={[neopixelColor.g]}
                      onValueChange={([v]) => setNeopixelColor((c) => ({ ...c, g: v }))}
                      max={255}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-blue-500">Blue: {neopixelColor.b}</Label>
                    <Slider
                      value={[neopixelColor.b]}
                      onValueChange={([v]) => setNeopixelColor((c) => ({ ...c, b: v }))}
                      max={255}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Brightness: {Math.round((neopixelBrightness / 255) * 100)}%</Label>
                      <Badge variant="outline" className="text-muted-foreground">Firmware pending</Badge>
                    </div>
                    <Slider
                      value={[neopixelBrightness]}
                      onValueChange={([v]) => setNeopixelBrightness(v)}
                      max={255}
                      className="mt-2"
                      disabled
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Current COM4 firmware supports RGB, off, and rainbow. Brightness is held until the firmware command is implemented.
                    </p>
                  </div>
                </div>

                {/* Color Preview */}
                <div
                  className="h-12 rounded-lg border-2"
                  style={{
                    backgroundColor: `rgb(${neopixelColor.r}, ${neopixelColor.g}, ${neopixelColor.b})`,
                    opacity: neopixelBrightness / 255,
                  }}
                />

                {/* Preset Colors */}
                <div>
                  <Label className="mb-2 block">Presets</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { name: "Red", r: 255, g: 0, b: 0 },
                      { name: "Green", r: 0, g: 255, b: 0 },
                      { name: "Blue", r: 0, g: 0, b: 255 },
                      { name: "Yellow", r: 255, g: 255, b: 0 },
                      { name: "Cyan", r: 0, g: 255, b: 255 },
                      { name: "Magenta", r: 255, g: 0, b: 255 },
                      { name: "White", r: 255, g: 255, b: 255 },
                      { name: "Warm", r: 255, g: 180, b: 100 },
                    ].map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        style={{ backgroundColor: `rgb(${preset.r}, ${preset.g}, ${preset.b})` }}
                        onClick={() => {
                          setNeopixelColor({ r: preset.r, g: preset.g, b: preset.b })
                          handleCommand(`neopixel-preset-${preset.name}`, () =>
                            sendLegacyLed("rgb", { r: preset.r, g: preset.g, b: preset.b })
                          )
                        }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Buzzer Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-blue-500" />
                  Buzzer Control
                </CardTitle>
                <CardDescription>Audio feedback and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Actions */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleCommand("buzzer-beep", () =>
                      sendLegacyBuzzer("tone", { hz: buzzerFrequency, ms: 200 })
                    )}
                  >
                    <Volume2 className="h-4 w-4 mr-2" />
                    Beep
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleCommand("buzzer-melody", () => sendLegacyBuzzer("melody"))}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Melody
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCommand("buzzer-off", () => sendLegacyBuzzer("off"))}
                  >
                    <VolumeX className="h-4 w-4" />
                  </Button>
                </div>

                {/* Frequency Slider */}
                <div>
                  <Label>Frequency: {buzzerFrequency} Hz</Label>
                  <Slider
                    value={[buzzerFrequency]}
                    onValueChange={([v]) => setBuzzerFrequency(v)}
                    min={200}
                    max={5000}
                    step={100}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>200 Hz (Low)</span>
                    <span>2000 Hz</span>
                    <span>5000 Hz (High)</span>
                  </div>
                </div>

                {/* Preset Tones */}
                <div>
                  <Label className="mb-2 block">Preset Tones</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { name: "C4", freq: 262 },
                      { name: "E4", freq: 330 },
                      { name: "G4", freq: 392 },
                      { name: "C5", freq: 523 },
                      { name: "Alert", freq: 880 },
                      { name: "Warning", freq: 1000 },
                      { name: "Success", freq: 1500 },
                      { name: "Error", freq: 200 },
                    ].map((tone) => (
                      <Button
                        key={tone.name}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBuzzerFrequency(tone.freq)
                          handleCommand(`tone-${tone.name}`, () => sendLegacyBuzzer("tone", { hz: tone.freq, ms: 100 }))
                        }}
                      >
                        {tone.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Raw Command Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Raw Command Interface
              </CardTitle>
              <CardDescription>Send custom MDP commands to the device</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => handleCommand("ping", () => sendControl(portForControl, "command", "ping", { cmd: "ping" }))}
                  disabled={commandLoading === "ping"}
                >
                  {commandLoading === "ping" ? "..." : "Ping"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCommand("sensors", () => sendControl(portForControl, "command", "sensors", { cmd: "sensors" }))}
                  disabled={commandLoading === "sensors"}
                >
                  {commandLoading === "sensors" ? "..." : "Get Sensors"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCommand("status", () => sendControl(portForControl, "command", "status", { cmd: "status" }))}
                  disabled={commandLoading === "status"}
                >
                  {commandLoading === "status" ? "..." : "Status"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCommand("scan", () => sendControl(portForControl, "command", "scan", { cmd: "scan" }))}
                  disabled={commandLoading === "scan"}
                >
                  {commandLoading === "scan" ? "..." : "I2C Scan"}
                </Button>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Raw MDP commands sent directly to device. Check console for responses.
              </div>
            </CardContent>
          </Card>
          </>
        </section>
        )}

        {/* Communication Tab */}
        {activeTab === "communication" && (
        <section role="tabpanel" className="space-y-6">
          {/* New NDJSON Protocol Communication Panel */}
          {activeDevice && (
            <CommunicationPanel 
              deviceId={portForControl} 
              onCommand={logToConsole}
            />
          )}
          
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LoRa Communication */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-green-500/20">
                      <Radio className="h-5 w-5 text-green-500" />
                    </div>
                    LoRa Radio
                  </CardTitle>
                  <Badge variant="outline" className="text-yellow-500">
                    <Activity className="h-3 w-3 mr-1" />
                    Initializing
                  </Badge>
                </div>
                <CardDescription>Long-range mesh communication for Side-A ↔ Side-B</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Frequency</p>
                    <p className="text-lg font-mono font-bold">915 MHz</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Spreading Factor</p>
                    <p className="text-lg font-mono font-bold">SF7</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">TX Power</p>
                    <p className="text-lg font-mono font-bold">20 dBm</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Bandwidth</p>
                    <p className="text-lg font-mono font-bold">125 kHz</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>LoRa Commands</Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCommand("lora-ping", () => 
                        sendControl(portForControl, "command", "lora_ping", { cmd: "lora ping" })
                      )}
                      disabled={commandLoading === "lora-ping"}
                    >
                      <Radio className="h-4 w-4 mr-2" />
                      Ping Side-B
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCommand("lora-status", () => 
                        sendControl(portForControl, "command", "lora_status", { cmd: "lora status" })
                      )}
                      disabled={commandLoading === "lora-status"}
                    >
                      Status
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCommand("lora-send", () => 
                        sendControl(portForControl, "command", "lora_send", { cmd: "lora send hello" })
                      )}
                      disabled={commandLoading === "lora-send"}
                    >
                      Send Test
                    </Button>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
                  <p className="font-medium text-yellow-600 dark:text-yellow-400">LoRa Module Status</p>
                  <p className="text-muted-foreground mt-1">
                    LoRa radio module detected. Configure Side-A and Side-B for mesh communication.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* WiFi Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <Wifi className="h-5 w-5 text-blue-500" />
                    </div>
                    WiFi
                  </CardTitle>
                  <Badge variant="outline" className="text-muted-foreground">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                </div>
                <CardDescription>ESP32-S3 built-in WiFi for cloud connectivity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">SSID</p>
                    <p className="text-lg font-mono">—</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Signal</p>
                    <p className="text-lg font-mono">—</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">IP Address</p>
                    <p className="text-lg font-mono">—</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">MAC</p>
                    <p className="text-sm font-mono">—</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm">
                  <p className="font-medium text-blue-600 dark:text-blue-400">WiFi Ready</p>
                  <p className="text-muted-foreground mt-1">
                    ESP32-S3 WiFi available. Configure credentials to enable cloud sync.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Bluetooth */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-indigo-500/20">
                      <Radio className="h-5 w-5 text-indigo-500" />
                    </div>
                    Bluetooth LE
                  </CardTitle>
                  <Badge variant="outline" className="text-muted-foreground">
                    <Activity className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                </div>
                <CardDescription>Low-energy Bluetooth for mobile app connectivity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Device Name</p>
                    <p className="text-lg font-mono">MycoBrain-01</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Paired Devices</p>
                    <p className="text-lg font-mono">0</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-sm">
                  <p className="font-medium text-indigo-600 dark:text-indigo-400">BLE Ready</p>
                  <p className="text-muted-foreground mt-1">
                    Enable BLE advertising to connect via mobile app.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mesh Network */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Activity className="h-5 w-5 text-purple-500" />
                    </div>
                    Mesh Network
                  </CardTitle>
                  <Badge variant="outline" className="text-muted-foreground">
                    1 Node
                  </Badge>
                </div>
                <CardDescription>ESP-NOW mesh for local device coordination</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Network ID</p>
                    <p className="text-lg font-mono">MYCO-001</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Nodes Online</p>
                    <p className="text-lg font-mono">1</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mesh Nodes</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="font-mono text-sm">Side-A (This Device)</span>
                      </div>
                      <Badge variant="outline" className="text-green-500">Online</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded bg-muted border">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="font-mono text-sm">Side-B</span>
                      </div>
                      <Badge variant="outline" className="text-muted-foreground">Searching...</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Communication Log */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Communication Log
              </CardTitle>
              <CardDescription>Recent LoRa and mesh network messages</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] rounded-md border p-4 bg-black/50">
                <div className="font-mono text-xs text-green-400 space-y-1">
                  <p>[{new Date().toLocaleTimeString()}] LORA: Module initialized @ 915MHz</p>
                  <p>[{new Date().toLocaleTimeString()}] MESH: ESP-NOW started, MAC: {device.device_info?.mac_address || "10:B4:1D:E3:3B:88"}</p>
                  <p>[{new Date().toLocaleTimeString()}] MESH: Listening for peers...</p>
                  <p className="text-yellow-400">[{new Date().toLocaleTimeString()}] LORA: Waiting for Side-B connection</p>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>
        )}

        {/* Network Devices Tab */}
        {activeTab === "network" && (
        <section role="tabpanel" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Network-Registered Devices
                  </CardTitle>
                  <CardDescription>
                    MycoBrain devices registered via Tailscale or Cloudflare Tunnel
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchNetworkDevices}
                  disabled={networkLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${networkLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {networkError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  {networkError}
                </div>
              )}
              
              {networkLoading && networkDevices.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : networkDevices.length === 0 ? (
                <div className="text-center py-12">
                  <Network className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No network devices registered</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Remote MycoBrain devices can register via heartbeat when running the MycoBrain service 
                    with heartbeat enabled. See the Tailscale setup guide for instructions.
                  </p>
                  <Button className="mt-4" onClick={fetchNetworkDevices}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Check for Devices
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {networkDevices.map((netDevice) => (
                    <Card key={netDevice.device_id} className={`border ${
                      netDevice.status === "online" 
                        ? "border-green-500/50" 
                        : netDevice.status === "stale"
                        ? "border-yellow-500/50"
                        : "border-red-500/50"
                    }`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              netDevice.status === "online" 
                                ? "bg-green-500/20" 
                                : netDevice.status === "stale"
                                ? "bg-yellow-500/20"
                                : "bg-red-500/20"
                            }`}>
                              <Cpu className={`h-5 w-5 ${
                                netDevice.status === "online" 
                                  ? "text-green-500" 
                                  : netDevice.status === "stale"
                                  ? "text-yellow-500"
                                  : "text-red-500"
                              }`} />
                            </div>
                            <div>
                              <CardTitle className="text-base">{netDevice.device_name || netDevice.name}</CardTitle>
                              <CardDescription className="font-mono text-xs">
                                {netDevice.host}:{netDevice.port}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              netDevice.connection_type === "tailscale" ? "default" :
                              netDevice.connection_type === "cloudflare" ? "secondary" : "outline"
                            }>
                              {netDevice.connection_type}
                            </Badge>
                            <Badge className={
                              netDevice.status === "online" 
                                ? "bg-green-500" 
                                : netDevice.status === "stale"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }>
                              {netDevice.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium">{netDevice.location || "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Board</p>
                            <p className="font-medium">{netDevice.board_type || "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Firmware</p>
                            <p className="font-mono text-xs">{netDevice.firmware_version || "Unknown"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Last Seen</p>
                            <p className="text-xs">{netDevice.last_seen ? new Date(netDevice.last_seen).toLocaleString() : "Never"}</p>
                          </div>
                        </div>
                        
                        {netDevice.sensors && netDevice.sensors.length > 0 && (
                          <div className="mt-3 flex gap-2 flex-wrap">
                            {netDevice.sensors.map((sensor: string) => (
                              <Badge key={sensor} variant="outline" className="text-xs">
                                {sensor}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {netDevice.status === "online" && (
                          <div className="mt-4 flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => sendNetworkDeviceCommand(netDevice.device_id, "status")}
                            >
                              <Activity className="h-4 w-4 mr-1" />
                              Status
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => sendNetworkDeviceCommand(netDevice.device_id, "led rgb 0 255 0")}
                            >
                              <Lightbulb className="h-4 w-4 mr-1" />
                              LED Test
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => sendNetworkDeviceCommand(netDevice.device_id, "coin")}
                            >
                              <Volume2 className="h-4 w-4 mr-1" />
                              Beep
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Network Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Remote Device Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p>To register remote MycoBrain devices:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Install Tailscale on the remote machine and join the Mycosoft Tailnet</li>
                <li>Set environment variables:
                  <code className="block mt-1 p-2 rounded bg-muted font-mono text-xs">
                    MYCOBRAIN_HEARTBEAT_ENABLED=true<br/>
                    MYCOBRAIN_DEVICE_NAME="Beto&apos;s Lab"<br/>
                    MAS_REGISTRY_URL=http://localhost:8001
                  </code>
                </li>
                <li>Start the MycoBrain service: <code className="bg-muted px-1 rounded">python mycobrain_service_standalone.py</code></li>
                <li>Device will appear here within 30 seconds</li>
              </ol>
            </CardContent>
          </Card>
        </section>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
        <section role="tabpanel" className="space-y-6">
          {/* MINDEX Integration */}
          {device && (
            <MINDEXIntegrationWidget 
              deviceId={portForControl}
            />
          )}
          
          {/* New NDJSON Protocol Telemetry Charts */}
          {device && (
            <div className="grid gap-6 lg:grid-cols-2">
              <TelemetryChartWidget 
                deviceId={portForControl}
                pollInterval={10000}
                maxPoints={50}
              />
              
              {/* Existing Sensor History */}
              <Card>
                <CardHeader>
                  <CardTitle>Sensor History (Last {sensorHistory.length} readings)</CardTitle>
                  <CardDescription>Real-time sensor data trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {sensorHistory.length > 0 ? (
                    <div className="h-64 flex items-end gap-1">
                      {sensorHistory.map((point, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                          style={{ height: `${(point.bme1_temp / 50) * 100}%` }}
                          title={`${point.bme1_temp.toFixed(1)}°C at ${point.timestamp.toLocaleTimeString()}`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Collecting data...
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </section>
        )}

        {/* Console Tab */}
        {activeTab === "console" && (
        <section role="tabpanel">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Device Console
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setConsoleOutput([])}>
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 rounded-lg bg-black p-4 font-mono text-sm text-green-400">
                {consoleOutput.length === 0 ? (
                  <div className="text-muted-foreground">
                    <p>MycoBrain Console - {device.port}</p>
                    <p>---</p>
                    <p>Ready for commands...</p>
                  </div>
                ) : (
                  consoleOutput.map((line, i) => <div key={i}>{line}</div>)
                )}
                <div className="animate-pulse">_</div>
              </ScrollArea>
            </CardContent>
          </Card>
        </section>
        )}

        {/* Config Tab */}
        {activeTab === "config" && (
        <section role="tabpanel" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Port</p>
                  <p className="font-mono">{device.port}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">MDP Version</p>
                  <p className="font-mono">v{device.device_info?.mdp_version || 1}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Firmware</p>
                  <p className="font-mono">{device.device_info?.firmware_version || "1.0.0"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Board Type</p>
                  <p className="font-mono">{device.device_info?.board_type || "ESP32-S3"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">MAC Address</p>
                  <p className="font-mono">{device.device_info?.mac_address || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-mono capitalize">{device.device_info?.status || "ready"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {device.capabilities?.bme688_count && (
                  <Badge>BME688 x{device.capabilities.bme688_count}</Badge>
                )}
                {device.capabilities?.has_lora && <Badge>LoRa SX1262</Badge>}
                {device.capabilities?.has_neopixel && <Badge>NeoPixel RGB</Badge>}
                {device.capabilities?.has_buzzer && <Badge>Buzzer</Badge>}
                {device.capabilities?.i2c_bus && <Badge>I2C Bus</Badge>}
                {device.capabilities?.analog_inputs && (
                  <Badge variant="outline">Analog x{device.capabilities.analog_inputs}</Badge>
                )}
                {device.capabilities?.digital_io && (
                  <Badge variant="outline">Digital IO x{device.capabilities.digital_io}</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location (GPS)</CardTitle>
              <CardDescription>
                {device.location?.source === "gps" 
                  ? "Location from onboard GPS" 
                  : "Manual location (GPS not connected)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Latitude</p>
                  <p className="font-mono">{device.location?.lat?.toFixed(6) || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Longitude</p>
                  <p className="font-mono">{device.location?.lng?.toFixed(6) || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Source</p>
                  <p className="font-mono capitalize">{device.location?.source || "unknown"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Accuracy</p>
                  <p className="font-mono">{device.location?.accuracy ? `${device.location.accuracy}m` : "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        )}

        {/* Diagnostics Tab */}
        {activeTab === "diagnostics" && (
        <section role="tabpanel" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  System Diagnostics
                </CardTitle>
                <Button variant="outline" size="sm" onClick={handleRunDiagnostics}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Diagnostics
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {diagnostics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Service Status</Label>
                      <p className="font-mono">{diagnostics.service_status || "Unknown"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Port Status</Label>
                      <p className="font-mono">{typeof diagnostics.port_status === "string" ? diagnostics.port_status : JSON.stringify(diagnostics.port_status) || "Unknown"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Connection Status</Label>
                      <p className="font-mono">{device.connected ? "Connected" : "Disconnected"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Last Message</Label>
                      <p className="font-mono text-xs">{device.last_message_time || "Never"}</p>
                    </div>
                  </div>
                  {diagnostics.errors && diagnostics.errors.length > 0 && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50">
                      <Label className="text-red-500">Errors</Label>
                      <ul className="list-disc list-inside text-sm text-red-400 mt-2">
                        {diagnostics.errors.map((err: string, i: number) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-muted">
                    <Label className="text-muted-foreground">Full Diagnostics</Label>
                    <pre className="text-xs font-mono mt-2 overflow-auto">
                      {JSON.stringify(diagnostics, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Run Diagnostics" to check system status</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Port Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Usb className="h-4 w-4" />
                Port Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {availablePorts.length > 0 ? (
                  availablePorts.map((portInfo: { path?: string; port?: string; id?: string; description?: string; is_connected?: boolean }) => {
                    const portKey = portInfo.path || portInfo.port || portInfo.id || "unknown"
                    const portStatus = portStatuses[portKey]
                    return (
                      <div key={portKey} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center gap-2">
                          {portInfo.is_connected ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : portStatus === "locked" ? (
                            <Lock className="h-4 w-4 text-red-500" />
                          ) : (
                            <CircleDot className="h-4 w-4 text-gray-500" />
                          )}
                          <div>
                            <p className="font-mono font-medium">{portKey}</p>
                            <p className="text-xs text-muted-foreground">{portInfo.description || "Unknown device"}</p>
                          </div>
                        </div>
                        <Badge variant={portInfo.is_connected ? "default" : portStatus === "locked" ? "destructive" : "secondary"}>
                          {portInfo.is_connected ? "Connected" : portStatus === "locked" ? "Locked" : "Available"}
                        </Badge>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No ports detected. Click "Refresh Ports" to scan.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                Service Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction("start")}
                  disabled={serviceStatus === "online"}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Service
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction("stop")}
                  disabled={serviceStatus === "offline"}
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Service
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction("kill")}
                  disabled={serviceStatus === "offline"}
                  className="text-red-500 hover:text-red-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Kill Service
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleServiceAction("restart")}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart Service
                </Button>
              </div>
              <div className="mt-4">
                <Label className="text-muted-foreground">Service Status</Label>
                <div className={`mt-2 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  serviceStatus === "online" 
                    ? "bg-green-500/20 text-green-500 border border-green-500/50" 
                    : serviceStatus === "offline"
                    ? "bg-red-500/20 text-red-500 border border-red-500/50"
                    : "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50"
                }`}>
                  {serviceStatus === "online" ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      MycoBrain service is running on port 8003
                    </>
                  ) : serviceStatus === "offline" ? (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      MycoBrain service is not running
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Checking service status...
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        )}

        {/* Firmware Tab */}
        {activeTab === "firmware" && (
        <section role="tabpanel" className="space-y-4">
          <FirmwareUpdater />
        </section>
        )}
      </div>
    </div>
  )
}
