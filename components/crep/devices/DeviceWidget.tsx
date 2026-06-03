"use client"

/**
 * DeviceWidget — Apr 20, 2026
 *
 * Morgan: "the most beautiful highly detailed and profound widget with a
 * different and more visually modern floating high tech ui is needed for
 * all device widgets this mycobrain gateway is not over our home with no
 * gps on it at the moment but this widget is shit make it way better
 * mycobrain-sidea-10b41d".
 *
 * Replaces the cramped inline popup with a free-floating glass-morphism
 * panel for MycoBrain gateways and other Mycosoft devices. Visual goals:
 *   • High-tech, dark glass with subtle cyan/lime accents
 *   • Pulsing status orb that reflects connection + signal strength
 *   • GPS state explicitly surfaced (locked / drift / unavailable / manual)
 *   • Rich telemetry cards with inline sparklines from a short history
 *     ring buffer (kept in component state, populated by parent updates)
 *   • Quick-control row with confident buttons (rainbow / beep / LED off)
 *   • Footer with firmware, port, uptime, ID — all monospace, tasteful
 *
 * Render priority: this is a dialog-style overlay panel (centered, click
 * outside to close, Escape to dismiss). Parent passes the device + a
 * sensor history ring buffer + an onClose callback.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from "react"
import { createPortal } from "react-dom"
import { X, Activity, Thermometer, Droplets, Wind, Cloud, Gauge, Sparkles, Zap, MapPin, Wifi, Cpu, Clock, Radio, Satellite, AlertTriangle, CheckCircle2, ExternalLink, Waves, Volume2 } from "lucide-react"
import Link from "next/link"

export interface DeviceLike {
  id: string
  name?: string
  type?: string
  status?: "online" | "offline" | "unknown" | string
  port?: string | number
  registryId?: string
  managerHref?: string
  firmware?: string
  signalStrengthDbm?: number | null
  signalConnectionType?: "wifi" | "ethernet" | "lte" | "5g" | "lora" | "ble" | string | null
  // GPS state. If lat/lng are present + gpsLockState=='locked', show as live.
  // If gpsLockState=='unavailable' or 'manual', surface that the position
  // is stale / user-set so Morgan knows the dot isn't where the device is.
  lat?: number
  lng?: number
  gpsLockState?: "locked" | "drift" | "unavailable" | "manual" | string | null
  gpsAccuracyM?: number | null
  gpsLastFixAt?: string | null
  manualLocation?: string | null
  sensorData?: {
    temperature?: number
    humidity?: number
    iaq?: number
    co2Equivalent?: number
    pressure?: number
    vocEquivalent?: number
    uptime?: number
    raw?: string
    bmeChannels?: Array<{
      id: string
      label: string
      address?: string
      bus?: string
      present?: boolean
      beginOk?: boolean
      subscribed?: boolean
      temperature?: number | null
      humidity?: number | null
      iaq?: number | null
      co2Equivalent?: number | null
      pressure?: number | null
      vocEquivalent?: number | null
    }>
    marine?: {
      positionMode?: string
      waveHeightM?: number | null
      waterTemperatureC?: number | null
      wavePeriodS?: number | null
      hydrophoneLow?: string | number | null
      hydrophoneHigh?: string | number | null
      transducer?: string | null
    }
    [k: string]: unknown
  }
  pageHref?: string
}

export type SensorHistory = {
  temperature?: number[]
  humidity?: number[]
  iaq?: number[]
  co2Equivalent?: number[]
  pressure?: number[]
  vocEquivalent?: number[]
}

interface DeviceWidgetProps {
  device: DeviceLike
  history?: SensorHistory
  onClose: () => void
  onControl?: (peripheral: string, params?: Record<string, any>) => Promise<void>
}

// IAQ → label + color (Bosch BME680/BSEC convention)
function iaqQuality(iaq?: number): { label: string; color: string } {
  if (iaq == null) return { label: "—", color: "text-gray-400" }
  if (iaq <= 50) return { label: "Excellent", color: "text-emerald-400" }
  if (iaq <= 100) return { label: "Good", color: "text-green-400" }
  if (iaq <= 150) return { label: "Lightly polluted", color: "text-yellow-400" }
  if (iaq <= 200) return { label: "Moderately polluted", color: "text-orange-400" }
  if (iaq <= 250) return { label: "Heavily polluted", color: "text-rose-400" }
  return { label: "Severely polluted", color: "text-red-500" }
}

function gpsStateBadge(state: string | null | undefined): { label: string; color: string; icon: typeof CheckCircle2; pulse: boolean } {
  switch (state) {
    case "locked": return { label: "GPS lock", color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10", icon: CheckCircle2, pulse: true }
    case "drift":  return { label: "GPS drift", color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10", icon: AlertTriangle, pulse: false }
    case "manual": return { label: "Manual location", color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10", icon: MapPin, pulse: false }
    case "site": return { label: "Site position", color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10", icon: MapPin, pulse: false }
    case "unavailable":
    default:       return { label: "No GPS", color: "text-rose-400 border-rose-500/40 bg-rose-500/10", icon: AlertTriangle, pulse: false }
  }
}

function signalIcon(type: string | null | undefined) {
  switch (type) {
    case "wifi": return Wifi
    case "ethernet": return Cpu
    case "lte":
    case "5g": return Radio
    case "lora": return Satellite
    case "ble": return Radio
    default: return Wifi
  }
}

function Sparkline({ values, color, className = "" }: { values: number[]; color: string; className?: string }) {
  if (!values?.length) return null
  const w = 100
  const h = 22
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = w / Math.max(1, values.length - 1)
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ")
  return (
    <svg width={w} height={h} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#grad-${color.replace(/[^a-z0-9]/gi, "")})`} />
      <path d={d} stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
  history,
  badge,
}: {
  icon: typeof Thermometer
  label: string
  value: string | number | null | undefined
  unit?: string
  color: string
  history?: number[]
  badge?: { text: string; color: string }
}) {
  return (
    <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-lg p-2 relative overflow-hidden hover:border-slate-600 transition-colors group">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br pointer-events-none" style={{ background: `radial-gradient(circle at top right, ${color}15, transparent 60%)` }} />
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className="w-3 h-3 shrink-0" style={{ color }} />
          <span className="text-[9px] uppercase tracking-wider text-gray-400 truncate">{label}</span>
        </div>
        {badge ? (
          <span className={`text-[8px] font-mono px-1 py-0 rounded ${badge.color}`}>{badge.text}</span>
        ) : null}
      </div>
      <div className="relative mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-bold tabular-nums" style={{ color }}>
          {value ?? "—"}
        </span>
        {unit ? <span className="text-[9px] text-gray-500">{unit}</span> : null}
      </div>
      {history && history.length > 1 ? (
        <div className="relative mt-0.5 -mx-1 -mb-1">
          <Sparkline values={history} color={color} className="w-full block" />
        </div>
      ) : null}
    </div>
  )
}

function formatNullableNumber(value: unknown, digits = 1): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—"
}

function formatStandbyNumber(value: unknown, digits = 1): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "standby"
}

function bmeStatusFromRaw(raw?: string) {
  const slot = (label: string) => {
    const match = raw?.match(new RegExp(`${label}:\\s+present=(YES|NO)\\s+addr=([^\\s]+)\\s+begin=(OK|FAIL)\\s+sub=(OK|FAIL)`, "i"))
    if (!match) {
      return {
        present: undefined,
        address: "0x--",
        beginOk: undefined,
        subscribed: undefined,
      }
    }
    return {
      present: match?.[1]?.toUpperCase() === "YES",
      address: match?.[2] || "—",
      beginOk: match?.[3]?.toUpperCase() === "OK",
      subscribed: match?.[4]?.toUpperCase() === "OK",
    }
  }
  return { ambient: slot("AMB"), environment: slot("ENV") }
}

function PsathyrellaBuoyPanel({ device }: { device: DeviceLike }) {
  const raw = typeof device.sensorData?.raw === "string" ? device.sensorData.raw : undefined
  const rawStatus = bmeStatusFromRaw(raw)
  const channels = device.sensorData?.bmeChannels?.length
    ? device.sensorData.bmeChannels
    : [
        {
          id: "ambient",
          label: "BME688 A - I2C-1 AMB",
          address: rawStatus.ambient.address || "0x77",
          bus: "I2C-1",
          present: rawStatus.ambient.present,
          beginOk: rawStatus.ambient.beginOk,
          subscribed: rawStatus.ambient.subscribed,
          temperature: device.sensorData?.temperature ?? null,
          humidity: device.sensorData?.humidity ?? null,
          iaq: device.sensorData?.iaq ?? null,
          co2Equivalent: device.sensorData?.co2Equivalent ?? null,
          pressure: device.sensorData?.pressure ?? null,
          vocEquivalent: device.sensorData?.vocEquivalent ?? null,
        },
        {
          id: "environment",
          label: "BME688 B - I2C-2 ENV",
          address: rawStatus.environment.address || "0x76",
          bus: "I2C-2",
          present: rawStatus.environment.present,
          beginOk: rawStatus.environment.beginOk,
          subscribed: rawStatus.environment.subscribed,
          temperature: null,
          humidity: null,
          iaq: null,
          co2Equivalent: null,
          pressure: null,
          vocEquivalent: null,
        },
      ]
  const marine = device.sensorData?.marine || {}

  return (
    <div className="px-3 pt-3 space-y-3">
      <div>
        <div className="text-[9px] uppercase tracking-wider text-teal-200/90 flex items-center gap-1 mb-1.5">
          <Waves className="w-3 h-3" /> Psathyrella Buoy Stack
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <MetricCard icon={MapPin} label="Position" value={marine.positionMode || "Project Oyster position"} unit="Project Oyster" color="#2dd4bf" />
          <MetricCard icon={Waves} label="Wave Height" value={formatStandbyNumber(marine.waveHeightM)} unit="m" color="#38bdf8" />
          <MetricCard icon={Thermometer} label="Water Temp" value={formatStandbyNumber(marine.waterTemperatureC)} unit="°C" color="#60a5fa" />
          <MetricCard icon={Activity} label="Wave Period" value={formatStandbyNumber(marine.wavePeriodS)} unit="s" color="#a78bfa" />
          <MetricCard icon={Volume2} label="Hydrophone LF" value={marine.hydrophoneLow ?? "standby"} unit="low freq" color="#22d3ee" />
          <MetricCard icon={Volume2} label="Hydrophone HF" value={marine.hydrophoneHigh ?? "standby"} unit="high freq" color="#f472b6" />
        </div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-wider text-cyan-300/80 flex items-center gap-1 mb-1.5">
          <Activity className="w-3 h-3" /> Dual BME688 Gas Telemetry
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {channels.map((channel) => {
            const statusText = channel.present === false
              ? "not seen"
              : channel.beginOk === false
                ? "init fail"
                : channel.subscribed === false
                  ? "sub fail"
                  : channel.present
                    ? "online"
                    : "pending"
            const statusColor = channel.present && channel.beginOk && channel.subscribed
              ? "text-emerald-300 border-emerald-400/30 bg-emerald-500/10"
              : channel.present
                ? "text-amber-300 border-amber-400/30 bg-amber-500/10"
                : "text-rose-300 border-rose-400/30 bg-rose-500/10"
            return (
              <div key={channel.id} className="rounded-lg border border-slate-700/60 bg-slate-950/55 p-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-white/70 truncate">{channel.label}</span>
                  <span className={`shrink-0 rounded border px-1 py-0 text-[8px] font-mono ${statusColor}`}>{statusText}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[8px] font-mono text-cyan-200/65">
                  <span>{channel.bus || "I2C"}</span>
                  <span>{channel.address || "0x--"}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px]">
                  <span className="text-gray-500">Temp</span><span className="font-mono text-orange-200 text-right">{formatNullableNumber(channel.temperature)} °C</span>
                  <span className="text-gray-500">Humidity</span><span className="font-mono text-cyan-200 text-right">{formatNullableNumber(channel.humidity)} %</span>
                  <span className="text-gray-500">Pressure</span><span className="font-mono text-amber-200 text-right">{formatNullableNumber(channel.pressure, 0)} hPa</span>
                  <span className="text-gray-500">IAQ</span><span className="font-mono text-purple-200 text-right">{formatNullableNumber(channel.iaq, 0)}</span>
                  <span className="text-gray-500">eCO2</span><span className="font-mono text-blue-200 text-right">{formatNullableNumber(channel.co2Equivalent, 0)} ppm</span>
                  <span className="text-gray-500">BVOC</span><span className="font-mono text-pink-200 text-right">{formatNullableNumber(channel.vocEquivalent, 2)} ppm</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default function DeviceWidget({ device, history, onClose, onControl }: DeviceWidgetProps) {
  const [controlBusy, setControlBusy] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const stopWidgetEvent = useCallback((event: SyntheticEvent | Event) => {
    event.stopPropagation?.()
    ;(event as SyntheticEvent).nativeEvent?.stopImmediatePropagation?.()
    ;(event as Event).stopImmediatePropagation?.()
  }, [])

  const handleClose = useCallback((event?: SyntheticEvent | Event) => {
    if (event) {
      event.preventDefault?.()
      stopWidgetEvent(event)
    }
    onClose()
  }, [onClose, stopWidgetEvent])

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(e) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleClose])

  const isOnline = device.status === "online" || device.status === "connected"
  const isPsathyrella =
    device.type?.toLowerCase().includes("psathyrella") ||
    device.id?.toLowerCase().includes("psathyrella") ||
    device.registryId?.toLowerCase() === "mycobrain-com4"
  const iaq = iaqQuality(device.sensorData?.iaq)
  const gpsBadge = gpsStateBadge(device.gpsLockState)
  const SignalIcon = signalIcon(device.signalConnectionType)

  // Signal strength bars (-30 to -90 dBm typical for wifi)
  const signalBars = useMemo(() => {
    const dbm = device.signalStrengthDbm
    if (dbm == null) return null
    if (dbm > -50) return 4
    if (dbm > -60) return 3
    if (dbm > -70) return 2
    if (dbm > -80) return 1
    return 0
  }, [device.signalStrengthDbm])

  const sendControl = async (peripheral: string, params?: Record<string, any>) => {
    if (!onControl) return
    if (controlBusy) return
    setControlBusy(peripheral)
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        onControl(peripheral, params),
        new Promise<void>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Device control request timed out")), 8000)
        }),
      ])
    } catch (error) {
      console.warn("[CREP] Device widget control failed:", error)
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
      if (mountedRef.current) setControlBusy(null)
    }
  }

  const managerHref =
    device.managerHref ||
    device.pageHref ||
    (device.registryId ? `/natureos/devices/${encodeURIComponent(device.registryId)}` : null)

  const widget = (
    <div
      className="pointer-events-none fixed inset-0 z-[2000] flex items-center justify-center"
      role="dialog"
    >
      {/* Visual scrim only; never traps the map if a device request is slow. */}
      <div className="pointer-events-none absolute inset-0 bg-black/15 backdrop-blur-[2px]" />

      <div
        ref={dialogRef}
        className="pointer-events-auto relative w-[400px] max-h-[88vh] overflow-y-auto rounded-2xl shadow-[0_0_60px_rgba(34,211,238,0.15)] animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: "linear-gradient(155deg, rgba(8,16,32,0.92) 0%, rgba(10,22,40,0.94) 50%, rgba(7,14,28,0.96) 100%)",
          border: "1px solid rgba(34,211,238,0.25)",
          backdropFilter: "blur(18px) saturate(1.2)",
          WebkitBackdropFilter: "blur(18px) saturate(1.2)",
        }}
        onPointerDown={stopWidgetEvent}
        onPointerUp={stopWidgetEvent}
        onMouseDown={stopWidgetEvent}
        onMouseUp={stopWidgetEvent}
        onClick={stopWidgetEvent}
        onDoubleClick={stopWidgetEvent}
      >
        {/* Top accent bar — pulses when online */}
        <div
          className="h-[3px] w-full"
          style={{
            background: isOnline
              ? "linear-gradient(90deg, transparent 0%, #22d3ee 30%, #4ade80 50%, #22d3ee 70%, transparent 100%)"
              : "linear-gradient(90deg, transparent 0%, #f43f5e 50%, transparent 100%)",
            animation: isOnline ? "pulse 2.4s ease-in-out infinite" : undefined,
          }}
        />

        {/* Header */}
        <div className="flex items-start gap-3 p-3 border-b border-cyan-500/15">
          {/* Status orb */}
          <div className="relative">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isOnline ? "bg-gradient-to-br from-emerald-600/40 to-cyan-700/30" : "bg-gradient-to-br from-rose-600/40 to-rose-900/30"}`}
              style={{ boxShadow: isOnline ? "0 0 24px rgba(34,211,238,0.4)" : "0 0 20px rgba(244,63,94,0.4)" }}
            >
              {isPsathyrella ? "◈" : device.type?.toLowerCase().includes("brain") ? "🧠" : device.type?.toLowerCase().includes("sensor") ? "📡" : "🔋"}
            </div>
            {isOnline && (
              <div
                className="absolute -inset-1 rounded-xl pointer-events-none"
                style={{
                  border: "1px solid rgba(74,222,128,0.5)",
                  animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite",
                }}
              />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
              {device.name || "Unnamed device"}
              {device.firmware ? (
                <span className="text-[9px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded px-1 py-0">v{device.firmware}</span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
              <span className={`uppercase font-mono tracking-wider ${isOnline ? "text-emerald-400" : "text-rose-400"}`}>
                ● {device.status || "unknown"}
              </span>
              {device.port ? (
                <span className="text-cyan-400 font-mono">{String(device.port).split(/[/\\]/).pop()}</span>
              ) : null}
              {/* Signal */}
              {signalBars != null ? (
                <span className="flex items-center gap-0.5 text-cyan-300">
                  <SignalIcon className="w-2.5 h-2.5" />
                  <span className="flex items-end gap-px">
                    {[1, 2, 3, 4].map((b) => (
                      <span key={b} className={`w-[2px] rounded-sm ${b <= signalBars ? "bg-cyan-300" : "bg-cyan-300/20"}`} style={{ height: `${4 + b * 2}px` }} />
                    ))}
                  </span>
                  {device.signalStrengthDbm ? <span className="text-[8px] tabular-nums text-cyan-400/70">{device.signalStrengthDbm} dBm</span> : null}
                </span>
              ) : null}
            </div>
            <div className="text-[9px] font-mono text-gray-500 truncate mt-0.5">{device.id}</div>
          </div>

          <button
            type="button"
            onPointerDown={stopWidgetEvent}
            onClick={handleClose}
            className="relative z-10 p-1 rounded hover:bg-white/10 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* GPS state — surfaces when device location is questionable */}
        <div className="px-3 pt-3">
          <div className={`flex items-center justify-between gap-2 px-2 py-1.5 border rounded-lg ${gpsBadge.color}`}>
            <div className="flex items-center gap-1.5">
              <gpsBadge.icon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold tracking-wider uppercase">{gpsBadge.label}</span>
              {device.gpsLockState === "locked" && device.gpsAccuracyM != null ? (
                <span className="text-[9px] font-mono opacity-70">±{device.gpsAccuracyM.toFixed(0)}m</span>
              ) : null}
            </div>
            <div className="text-[9px] font-mono opacity-80">
              {Number.isFinite(device.lat) && Number.isFinite(device.lng)
                ? `${device.lat?.toFixed(4)}, ${device.lng?.toFixed(4)}`
                : "—"}
            </div>
          </div>
          {device.gpsLockState === "unavailable" && (device.lat || device.lng) ? (
            <div className="text-[9px] text-rose-400/80 italic mt-1">
              Position shown is the last known / configured location. Device is not reporting GPS — pin is approximate.
            </div>
          ) : null}
          {device.gpsLockState === "manual" && device.manualLocation ? (
            <div className="text-[9px] text-cyan-400/80 italic mt-1">
              Manual location: {device.manualLocation}
            </div>
          ) : null}
        </div>

        {/* Sensor metrics */}
        {isOnline && isPsathyrella ? (
          <PsathyrellaBuoyPanel device={device} />
        ) : isOnline && device.sensorData ? (
          <div className="px-3 pt-3">
            <div className="text-[9px] uppercase tracking-wider text-cyan-300/80 flex items-center gap-1 mb-1.5">
              <Activity className="w-3 h-3" /> Live Telemetry
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <MetricCard icon={Thermometer} label="Temperature" value={device.sensorData.temperature?.toFixed(1)} unit="°C" color="#fb923c" history={history?.temperature} />
              <MetricCard icon={Droplets} label="Humidity" value={device.sensorData.humidity?.toFixed(1)} unit="%" color="#22d3ee" history={history?.humidity} />
              <MetricCard icon={Wind} label="Air Quality" value={device.sensorData.iaq?.toFixed(0)} unit={iaq.label} color="#a855f7" history={history?.iaq} badge={{ text: iaq.label.split(" ")[0], color: `${iaq.color} border border-current/30` }} />
              <MetricCard icon={Cloud} label="eCO₂" value={device.sensorData.co2Equivalent?.toFixed(0)} unit="ppm" color="#60a5fa" history={history?.co2Equivalent} />
              <MetricCard icon={Gauge} label="Pressure" value={device.sensorData.pressure?.toFixed(0)} unit="hPa" color="#fbbf24" history={history?.pressure} />
              <MetricCard icon={Sparkles} label="bVOC" value={device.sensorData.vocEquivalent?.toFixed(2)} unit="ppm" color="#f472b6" history={history?.vocEquivalent} />
            </div>
          </div>
        ) : !isOnline ? (
          <div className="px-3 pt-3">
            <div className="bg-rose-900/20 border border-rose-500/30 rounded-lg p-3 text-center">
              <AlertTriangle className="w-5 h-5 text-rose-400 mx-auto mb-1" />
              <div className="text-xs text-rose-300 font-bold">Device offline</div>
              <div className="text-[10px] text-rose-400/80 mt-0.5">No telemetry received. Last seen unknown.</div>
            </div>
          </div>
        ) : null}

        {/* Psathyrella aquatic controls */}
        {isOnline && isPsathyrella && onControl ? (
          <div className="px-3 pt-3">
            <div className="text-[9px] uppercase tracking-wider text-teal-300/80 flex items-center gap-1 mb-1.5">
              <Waves className="w-3 h-3" /> Buoy Controls
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={!!controlBusy}
                onClick={() => sendControl("buzzer", { action: "beep", frequency: 1000, duration: 100, duration_ms: 100 })}
                className="text-[10px] py-1.5 rounded-lg border border-amber-500/30 text-amber-200 hover:bg-amber-500/10 hover:border-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {controlBusy === "buzzer" ? "..." : "Beep Test"}
              </button>
              <button
                type="button"
                disabled={!!controlBusy}
                onClick={() => sendControl("neopixel", { effect: "rainbow" })}
                className="text-[10px] py-1.5 rounded-lg border border-violet-500/30 text-violet-200 hover:bg-violet-500/10 hover:border-violet-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {controlBusy === "neopixel" ? "..." : "LED Rainbow"}
              </button>
              <button
                type="button"
                disabled={!!controlBusy}
                onClick={() => sendControl("neopixel", { effect: "off" })}
                className="text-[10px] py-1.5 rounded-lg border border-rose-500/30 text-rose-200 hover:bg-rose-500/10 hover:border-rose-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                LED Off
              </button>
              <button
                type="button"
                disabled={!!controlBusy}
                onClick={() => sendControl("hydrophone-lf", { cmd: "hydrophone record low", duration_s: 10 })}
                className="text-[10px] py-1.5 rounded-lg border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 hover:border-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {controlBusy === "hydrophone-lf" ? "..." : "Record LF"}
              </button>
              <button
                type="button"
                disabled={!!controlBusy}
                onClick={() => sendControl("hydrophone-hf", { cmd: "hydrophone record high", duration_s: 10 })}
                className="text-[10px] py-1.5 rounded-lg border border-pink-500/30 text-pink-200 hover:bg-pink-500/10 hover:border-pink-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {controlBusy === "hydrophone-hf" ? "..." : "Record HF"}
              </button>
              <button
                type="button"
                disabled={!!controlBusy}
                onClick={() => sendControl("transducer", { cmd: "transducer ping", pulse_ms: 100 })}
                className="text-[10px] py-1.5 rounded-lg border border-sky-500/30 text-sky-200 hover:bg-sky-500/10 hover:border-sky-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {controlBusy === "transducer" ? "..." : "Ping"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Quick controls */}
        {isOnline && (device.port || device.registryId) && onControl && !isPsathyrella ? (
          <div className="px-3 pt-3">
            <div className="text-[9px] uppercase tracking-wider text-cyan-300/80 flex items-center gap-1 mb-1.5">
              <Zap className="w-3 h-3" /> Quick Controls
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                disabled={!!controlBusy}
                onClick={() => sendControl("neopixel", { effect: "rainbow" })}
                className="text-[10px] py-1.5 rounded-lg border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {controlBusy === "neopixel" ? "…" : "🌈 Rainbow"}
              </button>
              <button
                type="button"
                disabled={!!controlBusy}
                onClick={() => sendControl("buzzer", { action: "beep", frequency: 1000, duration: 100 })}
                className="text-[10px] py-1.5 rounded-lg border border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {controlBusy === "buzzer" ? "…" : "🔔 Beep"}
              </button>
              <button
                type="button"
                disabled={!!controlBusy}
                onClick={() => sendControl("neopixel", { effect: "off" })}
                className="text-[10px] py-1.5 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:border-rose-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                LED Off
              </button>
            </div>
          </div>
        ) : null}

        {isOnline && managerHref ? (
          <div className="px-3 pt-3">
            <Link
              href={managerHref}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-500/20 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Device Manager
            </Link>
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-3 py-2.5 mt-3 border-t border-cyan-500/15 flex items-center justify-between text-[9px] text-gray-500 font-mono">
          {device.sensorData?.uptime != null ? (
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {Math.floor(device.sensorData.uptime / 3600)}h {Math.floor((device.sensorData.uptime % 3600) / 60)}m
            </span>
          ) : <span /> }
          <span className="text-cyan-300/40">Mycosoft · MYCA</span>
        </div>
      </div>
    </div>
  )

  return typeof document === "undefined" ? null : createPortal(widget, document.body)
}
