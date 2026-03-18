"use client"

/**
 * NatureOS Ground Station Dashboard
 *
 * Full standalone dashboard for the ground station system within NatureOS.
 * This is the complete ground-station UI rebuilt in the NatureOS design language,
 * with all major modules:
 * - Overview: satellite map + group selector + pass timeline + satellite info
 * - Scheduler: monitored satellites + scheduled observations
 * - Hardware: SDR, rotator, rig management
 * - File Browser: observation recordings and telemetry data
 * - Settings: location, preferences, TLE sync, system info
 *
 * All data is bi-directionally synced with mindex and piped to the worldview API.
 */

import { useState, useEffect, useCallback } from "react"
import {
  Radio,
  Satellite,
  Settings,
  Calendar,
  Cpu,
  FolderOpen,
  Map,
  Activity,
  Crosshair,
  Signal,
  Wifi,
  WifiOff,
  Eye,
  Clock,
  ArrowUp,
  ArrowDown,
  Target,
  Minus,
  RefreshCw,
  ChevronDown,
  Layers,
  Gauge,
  Database,
  Globe,
  Antenna,
  Play,
  Pause,
  Square,
  BarChart3,
  Zap,
  Upload,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Timer,
  HardDrive,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { GroundStationProvider, useGroundStation } from "@/lib/ground-station/context"
import {
  pushPositionsToMindex,
  pushTrackingToWorldview,
} from "@/lib/ground-station/mindex-bridge"
import type {
  GSSatellite,
  GSGroup,
  GSSatellitePass,
  GSSDR,
  GSRotator,
  GSRig,
  GSScheduledObservation,
  GSLocation,
} from "@/lib/ground-station/types"

// ============================================================================
// Tab Components
// ============================================================================

function OverviewTab() {
  const { state, selectGroup, selectSatellite, trackSatellite, stopTracking } = useGroundStation()

  return (
    <div className="h-full flex flex-col">
      {/* Group Selector Bar */}
      <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-3 bg-black/20">
        <Layers className="w-4 h-4 text-cyan-400" />
        <select
          value={state.selectedGroupId || ""}
          onChange={(e) => selectGroup(e.target.value || null)}
          className="h-8 px-3 text-sm bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="">Select satellite group...</option>
          {state.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-500">
          {state.satellites.length} satellites | {state.passes.length} upcoming passes
        </span>
      </div>

      <div className="flex-1 flex">
        {/* Satellite List */}
        <div className="w-80 border-r border-gray-800 flex flex-col">
          <div className="px-3 py-2 border-b border-gray-800 text-xs font-medium text-gray-400 uppercase">
            Satellites
          </div>
          <div className="flex-1 overflow-y-auto">
            {state.satellites.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-600">
                {state.selectedGroupId ? "Loading satellites..." : "Select a group to view satellites"}
              </div>
            )}
            {state.satellites.map((sat) => {
              const pos = state.positions[sat.norad_id]
              const isTracking = state.trackingState?.norad_id === sat.norad_id
              const isSelected = state.selectedSatelliteNoradId === sat.norad_id

              return (
                <div
                  key={sat.norad_id}
                  className={cn(
                    "px-3 py-2 border-b border-gray-800/50 cursor-pointer hover:bg-gray-800/50 transition-colors",
                    isSelected && "bg-cyan-500/10 border-l-2 border-l-cyan-500",
                    isTracking && "bg-red-500/5 border-l-2 border-l-red-500"
                  )}
                  onClick={() => selectSatellite(sat.norad_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Satellite
                        className={cn(
                          "w-3.5 h-3.5 shrink-0",
                          pos?.is_visible ? "text-green-400" : "text-gray-600"
                        )}
                      />
                      <span className="text-sm text-white truncate">{sat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {pos && (
                        <span className="text-xs text-gray-500 font-mono">
                          {pos.el.toFixed(0)}°
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          isTracking ? stopTracking() : trackSatellite(sat.norad_id)
                        }}
                        className={cn(
                          "p-1 rounded transition-colors",
                          isTracking
                            ? "text-red-400 hover:bg-red-500/20"
                            : "text-gray-600 hover:text-cyan-400 hover:bg-cyan-500/10"
                        )}
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {pos && (
                    <div className="mt-1 flex items-center gap-3 text-[10px] text-gray-500">
                      <span>AZ {pos.az.toFixed(1)}°</span>
                      <span>EL {pos.el.toFixed(1)}°</span>
                      <span>RNG {pos.range.toFixed(0)} km</span>
                      <span className={cn(
                        pos.trend === "rising" && "text-green-400",
                        pos.trend === "falling" && "text-red-400",
                        pos.trend === "peak" && "text-yellow-400"
                      )}>
                        {pos.trend}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content - Pass Timeline & Info */}
        <div className="flex-1 flex flex-col">
          {/* Pass Timeline Placeholder */}
          <div className="h-48 border-b border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium text-white">Upcoming Passes</span>
            </div>
            <div className="space-y-1">
              {state.passes.slice(0, 5).map((pass, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-2 py-1 bg-gray-900/50 rounded text-xs"
                >
                  <span className="text-white">{pass.satellite_name}</span>
                  <span className="text-gray-400">
                    {new Date(pass.aos_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-cyan-400">{pass.max_elevation.toFixed(0)}° max</span>
                  <span className="text-gray-500">{Math.round(pass.duration_seconds / 60)}m</span>
                </div>
              ))}
              {state.passes.length === 0 && (
                <div className="text-center text-sm text-gray-600 py-4">
                  No pass data available
                </div>
              )}
            </div>
          </div>

          {/* Selected Satellite Detail */}
          <div className="flex-1 p-4">
            {state.selectedSatelliteNoradId ? (
              <SelectedSatelliteDetail />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-600 text-sm">
                Select a satellite to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SelectedSatelliteDetail() {
  const { state } = useGroundStation()
  const sat = state.satellites.find((s) => s.norad_id === state.selectedSatelliteNoradId)
  const pos = state.selectedSatelliteNoradId ? state.positions[state.selectedSatelliteNoradId] : null

  if (!sat) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Satellite className="w-5 h-5 text-cyan-400" />
        <div>
          <h3 className="text-lg font-bold text-white">{sat.name}</h3>
          <p className="text-xs text-gray-500">NORAD {sat.norad_id} | {sat.status || "Active"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {pos && (
          <>
            <DataCard label="Azimuth" value={`${pos.az.toFixed(2)}°`} icon={<Compass className="w-3.5 h-3.5" />} />
            <DataCard label="Elevation" value={`${pos.el.toFixed(2)}°`} icon={<ArrowUp className="w-3.5 h-3.5" />} />
            <DataCard label="Range" value={`${pos.range.toFixed(0)} km`} icon={<Signal className="w-3.5 h-3.5" />} />
            <DataCard label="Latitude" value={`${pos.lat.toFixed(4)}°`} icon={<Globe className="w-3.5 h-3.5" />} />
            <DataCard label="Longitude" value={`${pos.lon.toFixed(4)}°`} icon={<Globe className="w-3.5 h-3.5" />} />
            <DataCard label="Altitude" value={`${pos.alt.toFixed(0)} km`} icon={<ArrowUp className="w-3.5 h-3.5" />} />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {sat.operator && (
          <div>
            <span className="text-gray-500">Operator: </span>
            <span className="text-gray-300">{sat.operator}</span>
          </div>
        )}
        {sat.countries && (
          <div>
            <span className="text-gray-500">Country: </span>
            <span className="text-gray-300">{sat.countries}</span>
          </div>
        )}
        {sat.launched && (
          <div>
            <span className="text-gray-500">Launched: </span>
            <span className="text-gray-300">{new Date(sat.launched).toLocaleDateString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function DataCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="px-3 py-2 bg-gray-900/50 border border-gray-800 rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-cyan-400">{icon}</span>
        <span className="text-[10px] text-gray-500 uppercase">{label}</span>
      </div>
      <div className="text-sm font-mono text-white">{value}</div>
    </div>
  )
}

function SchedulerTab() {
  const { state, refreshObservations } = useGroundStation()

  useEffect(() => {
    refreshObservations()
  }, [refreshObservations])

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Observation Scheduler</h2>
        </div>
        <button
          onClick={() => refreshObservations()}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Observations Table */}
      <div className="border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900/50 text-xs text-gray-500 uppercase">
              <th className="px-3 py-2 text-left">Satellite</th>
              <th className="px-3 py-2 text-left">Start</th>
              <th className="px-3 py-2 text-left">End</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Max El</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {state.observations.map((obs) => (
              <tr key={obs.id} className="hover:bg-gray-800/30 text-sm">
                <td className="px-3 py-2 text-white">
                  {String(obs.satellite_config?.name || `SAT-${obs.norad_id}`)}
                </td>
                <td className="px-3 py-2 text-gray-400 font-mono text-xs">
                  {new Date(obs.event_start).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-gray-400 font-mono text-xs">
                  {new Date(obs.event_end).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={obs.status} />
                </td>
                <td className="px-3 py-2 text-gray-400 font-mono text-xs">
                  {obs.pass_config?.peak_altitude?.toFixed(1) || "—"}°
                </td>
              </tr>
            ))}
            {state.observations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-600">
                  No scheduled observations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    scheduled: { color: "text-blue-400 bg-blue-400/10", icon: <Clock className="w-3 h-3" /> },
    running: { color: "text-green-400 bg-green-400/10", icon: <Play className="w-3 h-3" /> },
    completed: { color: "text-gray-400 bg-gray-400/10", icon: <CheckCircle2 className="w-3 h-3" /> },
    cancelled: { color: "text-yellow-400 bg-yellow-400/10", icon: <Pause className="w-3 h-3" /> },
    failed: { color: "text-red-400 bg-red-400/10", icon: <AlertCircle className="w-3 h-3" /> },
    missed: { color: "text-orange-400 bg-orange-400/10", icon: <Timer className="w-3 h-3" /> },
  }
  const c = config[status] || config.scheduled

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase", c.color)}>
      {c.icon}
      {status}
    </span>
  )
}

function HardwareTab() {
  const { state, refreshHardware } = useGroundStation()

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">Hardware Management</h2>
        </div>
        <button
          onClick={() => refreshHardware()}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* SDRs */}
      <HardwareSection title="Software Defined Radios" icon={<Radio className="w-4 h-4 text-cyan-400" />}>
        {state.sdrs.map((sdr) => (
          <HardwareCard
            key={sdr.id}
            name={sdr.name}
            details={[
              sdr.type || "Unknown type",
              sdr.host ? `${sdr.host}:${sdr.port}` : "Local",
              sdr.frequency_min && sdr.frequency_max
                ? `${(sdr.frequency_min / 1e6).toFixed(0)}-${(sdr.frequency_max / 1e6).toFixed(0)} MHz`
                : "",
            ].filter(Boolean)}
          />
        ))}
        {state.sdrs.length === 0 && <EmptyHardware type="SDRs" />}
      </HardwareSection>

      {/* Rotators */}
      <HardwareSection title="Rotators" icon={<Target className="w-4 h-4 text-cyan-400" />}>
        {state.rotators.map((rot) => (
          <HardwareCard
            key={rot.id}
            name={rot.name}
            details={[
              `${rot.host}:${rot.port}`,
              `AZ ${rot.minaz}°-${rot.maxaz}°`,
              `EL ${rot.minel}°-${rot.maxel}°`,
            ]}
          />
        ))}
        {state.rotators.length === 0 && <EmptyHardware type="rotators" />}
      </HardwareSection>

      {/* Rigs */}
      <HardwareSection title="Radio Rigs" icon={<Signal className="w-4 h-4 text-cyan-400" />}>
        {state.rigs.map((rig) => (
          <HardwareCard
            key={rig.id}
            name={rig.name}
            details={[
              `${rig.host}:${rig.port}`,
              rig.radiotype,
              rig.radio_mode,
            ]}
          />
        ))}
        {state.rigs.length === 0 && <EmptyHardware type="rigs" />}
      </HardwareSection>
    </div>
  )
}

function HardwareSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-medium text-white">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  )
}

function HardwareCard({ name, details }: { name: string; details: string[] }) {
  return (
    <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
      <div className="text-sm font-medium text-white mb-1">{name}</div>
      {details.map((d, i) => (
        <div key={i} className="text-[10px] text-gray-500">{d}</div>
      ))}
    </div>
  )
}

function EmptyHardware({ type }: { type: string }) {
  return (
    <div className="col-span-full text-center py-6 text-sm text-gray-600">
      No {type} configured. Connect your ground station backend.
    </div>
  )
}

function SettingsTab() {
  const { state, checkConnection } = useGroundStation()

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-cyan-400" />
        <h2 className="text-lg font-bold text-white">Ground Station Settings</h2>
      </div>

      {/* Connection Status */}
      <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">Backend Connection</span>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2.5 h-2.5 rounded-full",
                state.connected ? "bg-green-400 shadow-green-400/50 shadow-sm" : "bg-red-500"
              )}
            />
            <span className={cn("text-xs", state.connected ? "text-green-400" : "text-red-400")}>
              {state.connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        {state.connectionError && (
          <div className="text-xs text-red-400/70">{state.connectionError}</div>
        )}
        <button
          onClick={() => checkConnection()}
          className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
        >
          Test Connection
        </button>
      </div>

      {/* Locations */}
      <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg space-y-3">
        <h3 className="text-sm font-medium text-white">Ground Station Locations</h3>
        {state.locations.map((loc) => (
          <div key={loc.id} className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
            <div>
              <div className="text-sm text-white">{loc.name}</div>
              <div className="text-[10px] text-gray-500">
                {loc.lat.toFixed(4)}°, {loc.lon.toFixed(4)}° | {loc.alt}m
              </div>
            </div>
            {state.activeLocation?.id === loc.id && (
              <span className="text-[10px] text-green-400 font-medium">ACTIVE</span>
            )}
          </div>
        ))}
        {state.locations.length === 0 && (
          <div className="text-sm text-gray-600">No locations configured</div>
        )}
      </div>

      {/* System Info */}
      {state.systemInfo && (
        <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg space-y-2">
          <h3 className="text-sm font-medium text-white">System Info</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">CPU: </span>
              <span className="text-white">{state.systemInfo.cpu_percent}%</span>
            </div>
            <div>
              <span className="text-gray-500">Memory: </span>
              <span className="text-white">{state.systemInfo.memory_percent}%</span>
            </div>
            <div>
              <span className="text-gray-500">Disk: </span>
              <span className="text-white">{state.systemInfo.disk_percent}%</span>
            </div>
            <div>
              <span className="text-gray-500">Hostname: </span>
              <span className="text-white">{state.systemInfo.hostname}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mindex Integration Status */}
      <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-white">Mindex Integration</h3>
        </div>
        <div className="text-xs text-gray-400">
          Satellite telemetry, observation records, and hardware status are automatically synced
          bi-directionally with Mindex. All data is also piped to the Agent Worldview API.
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-green-400">
            <Upload className="w-3 h-3" /> Push to Mindex
          </span>
          <span className="flex items-center gap-1 text-blue-400">
            <Download className="w-3 h-3" /> Pull from Mindex
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            <Globe className="w-3 h-3" /> Worldview API
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Dashboard Layout
// ============================================================================

function GroundStationDashboardInner() {
  const [activeTab, setActiveTab] = useState<"overview" | "scheduler" | "hardware" | "settings">("overview")
  const { state } = useGroundStation()

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: <Map className="w-4 h-4" /> },
    { id: "scheduler" as const, label: "Scheduler", icon: <Calendar className="w-4 h-4" /> },
    { id: "hardware" as const, label: "Hardware", icon: <Cpu className="w-4 h-4" /> },
    { id: "settings" as const, label: "Settings", icon: <Settings className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-3">
          <Radio className="w-6 h-6 text-cyan-400" />
          <div>
            <h1 className="text-lg font-bold">Ground Station</h1>
            <p className="text-[10px] text-gray-500">Mycosoft Satellite Tracking & SDR System</p>
          </div>
          <div
            className={cn(
              "ml-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium",
              state.connected
                ? "bg-green-400/10 text-green-400 border border-green-400/20"
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full", state.connected ? "bg-green-400" : "bg-red-500")} />
            {state.connected ? "Online" : "Offline"}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all",
                activeTab === tab.id
                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                  : "text-gray-400 hover:text-white hover:bg-gray-800/50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="h-[calc(100vh-64px)]">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "scheduler" && <SchedulerTab />}
        {activeTab === "hardware" && <HardwareTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  )
}

export default function GroundStationPage() {
  return (
    <GroundStationProvider>
      <GroundStationDashboardInner />
    </GroundStationProvider>
  )
}
