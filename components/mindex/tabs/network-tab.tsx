"use client"

import useSWR from "swr"
import { Cpu, Database, Network, Radio, Server, Wifi } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glowing-border"

type DeviceRow = {
  id?: string
  device_id?: string
  registry_id?: string
  name?: string
  display_name?: string
  device_name?: string
  device_role?: string
  role?: string
  status?: string
  source?: string
  host?: string
  port?: number | string
  agent_url?: string
  location_label?: string
  lastSeen?: string | null
  last_seen?: string | null
  capabilities?: string[]
  telemetry?: Record<string, unknown> | null
  extra?: Record<string, unknown>
}

type DevicePayload = {
  devices?: DeviceRow[]
  count?: number
  source?: string
  sources?: Record<string, number>
  note?: string
  error?: string
}

type StoragePayload = {
  error?: string
  message?: string
  nodes?: Array<Record<string, unknown>>
  count?: number
}

type ConsolePayload = {
  storage?: {
    nas?: {
      mounted?: boolean
      available?: boolean
      total_gb?: number
      used_gb?: number
      free_gb?: number
    }
    nas_mount_path?: string
    nas_writable?: boolean
  }
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `HTTP ${response.status}`)
  }
  return body
}

function isLive(status?: string) {
  const normalized = String(status || "").toLowerCase()
  return normalized === "connected" || normalized === "online"
}

function displayName(device: DeviceRow) {
  return device.name || device.display_name || device.device_name || device.device_id || device.id || "Unnamed device"
}

function deviceId(device: DeviceRow) {
  return device.registry_id || device.device_id || device.id || displayName(device)
}

function deviceLastSeen(device: DeviceRow) {
  const raw = device.lastSeen || device.last_seen
  if (!raw) return "not reported"
  return new Date(raw).toLocaleString()
}

export function NetworkSection() {
  const { data: fieldPayload, error: fieldError, isLoading: fieldLoading } = useSWR<DevicePayload>(
    "/api/earth-simulator/devices",
    fetcher,
    { refreshInterval: 15_000 },
  )
  const { data: networkPayload, error: networkError } = useSWR<DevicePayload>(
    "/api/devices/network",
    fetcher,
    { refreshInterval: 30_000 },
  )
  const { data: storagePayload, error: storageError } = useSWR<StoragePayload>(
    "/api/mindex/network/nodes",
    fetcher,
    { refreshInterval: 60_000 },
  )
  const { data: consolePayload } = useSWR<ConsolePayload>(
    "/api/natureos/mindex/console",
    fetcher,
    { refreshInterval: 120_000 },
  )

  const fieldDevices = fieldPayload?.devices ?? []
  const registryDevices = networkPayload?.devices ?? []
  const liveFieldDevices = fieldDevices.filter((device) => isLive(device.status))
  const mdpRows = fieldDevices.length ? fieldDevices : registryDevices
  const gateways = registryDevices.filter((device) => String(device.device_role || device.role || "").toLowerCase() === "gateway")
  const edgeStorageCandidates = fieldDevices.filter((device) => {
    const name = displayName(device).toLowerCase()
    return name.includes("mushroom") || name.includes("hypha") || name.includes("hive")
  })
  const nas = consolePayload?.storage?.nas
  const nasOnline = Boolean(nas?.mounted ?? nas?.available)
  const storageRegistryReady = Boolean(storagePayload && !storageError)
  const storageNodeCount = storagePayload?.count ?? storagePayload?.nodes?.length ?? 0

  const modules = [
    { label: "Discovery", value: "MAS registry + field deployments", state: registryDevices.length > 0 ? "online" : "blocked" },
    { label: "Liveness", value: "Earth Simulator operator probes", state: liveFieldDevices.length > 0 ? "online" : "blocked" },
    { label: "Command", value: "MDP command endpoints", state: "registered" },
    { label: "Telemetry", value: "MQTT / operator streams", state: liveFieldDevices.length > 0 ? "online" : "blocked" },
    { label: "Storage nodes", value: "Edge SSD buffers + HQ NAS sync", state: storageError ? "blocked" : "registered" },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <GlassCard color="cyan">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-400">MDP field devices</p>
              <p className="mt-1 text-3xl font-bold text-white">{fieldDevices.length}</p>
            </div>
            <Cpu className="h-6 w-6 text-cyan-300" />
          </div>
        </GlassCard>
        <GlassCard color="green">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-400">Live devices</p>
              <p className="mt-1 text-3xl font-bold text-white">{liveFieldDevices.length}</p>
            </div>
            <Wifi className="h-6 w-6 text-green-300" />
          </div>
        </GlassCard>
        <GlassCard color="purple">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-400">MAS registry rows</p>
              <p className="mt-1 text-3xl font-bold text-white">{registryDevices.length}</p>
            </div>
            <Server className="h-6 w-6 text-purple-300" />
          </div>
        </GlassCard>
        <GlassCard color="orange">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-400">Gateways</p>
              <p className="mt-1 text-3xl font-bold text-white">{gateways.length}</p>
            </div>
            <Radio className="h-6 w-6 text-orange-300" />
          </div>
        </GlassCard>
      </div>

      <GlassCard color="green">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Network className="h-5 w-5 text-green-300" />
              Mycosoft Device Protocol
            </h3>
            <p className="text-sm text-gray-400">
              Primary network view for MycoBrain devices. Liveness comes from the same Earth Simulator fleet that sees
              Mushroom 1 and Hyphae 1 on the network.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-green-500/30 text-green-200">
            {fieldLoading ? "loading" : `${liveFieldDevices.length}/${fieldDevices.length} live`}
          </Badge>
        </div>

        {fieldError ? (
          <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Field device route unavailable: {fieldError.message}
          </p>
        ) : null}

        <div className="h-[360px] overflow-auto rounded-md border border-white/10">
          <div className="divide-y divide-white/10">
            {mdpRows.map((device) => {
              const live = isLive(device.status)
              const capabilities = device.capabilities ?? []
              return (
                <div key={deviceId(device)} className="grid gap-3 p-3 text-sm lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{displayName(device)}</p>
                    <p className="truncate text-xs text-gray-500">{deviceId(device)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-gray-300">{device.location_label || device.host || "location unavailable"}</p>
                    <p className="text-xs text-gray-500">{deviceLastSeen(device)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-gray-400">{device.agent_url || `${device.host || ""}${device.port ? `:${device.port}` : ""}`}</p>
                    <p className="truncate text-xs text-gray-500">{capabilities.length ? capabilities.join(", ") : device.source || "registered"}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={live ? "w-fit border-green-500/40 text-green-200" : "w-fit border-amber-500/40 text-amber-200"}
                  >
                    {live ? "live" : device.status || "unknown"}
                  </Badge>
                </div>
              )
            })}
            {mdpRows.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No MDP devices are visible in this snapshot.</p>
            ) : null}
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <GlassCard color="cyan">
          <h3 className="mb-3 text-lg font-semibold text-white">Protocol modules</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {modules.map((module) => (
              <div key={module.label} className="rounded-md bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{module.label}</p>
                  <Badge
                    variant="outline"
                    className={
                      module.state === "online"
                        ? "border-green-500/40 text-green-200"
                        : module.state === "registered"
                          ? "border-cyan-500/40 text-cyan-200"
                          : "border-amber-500/40 text-amber-200"
                    }
                  >
                    {module.state}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-gray-500">{module.value}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard color="orange">
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold text-white">
            <Database className="h-5 w-5 text-orange-300" />
            MINDEX storage nodes
          </h3>
          <p className="text-sm text-gray-400">
            Device SSDs keep local inference data at the edge, then sync back to central MINDEX storage when the device
            returns to a trusted network.
          </p>
          <div className="mt-3 grid gap-2">
            <div className="rounded-md border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Edge SSD buffers</p>
                <Badge variant="outline" className="border-cyan-500/40 text-cyan-200">
                  {edgeStorageCandidates.length || "pending"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Mushroom 1 and Hyphae 1 class devices should advertise local cache capacity, sync backlog, and inference-ready datasets.
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Central MINDEX NAS</p>
                <Badge
                  variant="outline"
                  className={nasOnline ? "border-green-500/40 text-green-200" : "border-amber-500/40 text-amber-200"}
                >
                  {nasOnline ? "mounted" : "pending"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {nasOnline
                  ? `${nas?.free_gb?.toLocaleString() ?? "unknown"} GB free for backups and cold storage.`
                  : "Central backup target is not reporting mounted status in this snapshot."}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Sync registry</p>
                <Badge
                  variant="outline"
                  className={storageRegistryReady ? "border-green-500/40 text-green-200" : "border-amber-500/40 text-amber-200"}
                >
                  {storageRegistryReady ? `${storageNodeCount} nodes` : storageError ? "pending" : "checking"}
                </Badge>
              </div>
              <p className="mt-1 break-words text-xs text-gray-500">
                {storageError
                  ? "Backend storage registry needs device-local cache state, reconnect queue state, and NAS replication state."
                  : storagePayload?.message || storagePayload?.error || "Waiting for storage registry response."}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {networkError ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          MAS network registry unavailable: {networkError.message}
        </p>
      ) : null}
    </div>
  )
}
