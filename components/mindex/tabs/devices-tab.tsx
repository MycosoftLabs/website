"use client"

import useSWR from "swr"
import { Activity, Cpu, RefreshCw, Server, Wifi, WifiOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GlassCard } from "@/components/ui/glowing-border"
import { DEVICE_PRODUCTS } from "@/lib/device-products"

type FieldDevice = {
  id: string
  registry_id?: string | null
  name: string
  type?: string | null
  role?: string | null
  status?: string | null
  host?: string | null
  port?: string | number | null
  location_label?: string | null
  lastSeen?: string | null
  telemetry?: Record<string, unknown> | null
  source?: string | null
}

type FieldDevicesPayload = {
  success?: boolean
  devices?: FieldDevice[]
  count?: number
  sources?: {
    mas?: number
    operator?: number
    field_deployments?: number
  }
  timestamp?: string
}

type NetworkDevice = {
  id?: string
  device_id?: string
  registry_id?: string | null
  device_name?: string
  name?: string
  device_role?: string
  status?: string
  host?: string
  port?: number
  last_seen?: string
  source?: string
  telemetry?: Record<string, unknown> | null
}

type NetworkDevicesPayload = {
  devices?: NetworkDevice[]
}

type MindexRegistryPayload = {
  devices?: FieldDevice[]
  total?: number
  warning?: string
  error?: string
}

type InventoryProbe = {
  ok: boolean
  status: number
  body: unknown
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url, { cache: "no-store" })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body })
  }
  return body as T
}

const inventoryFetcher = async (url: string): Promise<InventoryProbe> => {
  const res = await fetch(url, { cache: "no-store" })
  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { ok: res.ok, status: res.status, body }
}

function isLive(status: unknown) {
  const s = String(status || "").toLowerCase()
  return s === "connected" || s === "online"
}

function formatTimestamp(value?: string | null) {
  if (!value) return "not seen"
  const t = new Date(value)
  return Number.isNaN(t.getTime()) ? value : t.toLocaleString()
}

function telemetryPreview(telemetry?: Record<string, unknown> | null) {
  if (!telemetry) return []
  const keys = [
    "temperature_c",
    "humidity_pct",
    "pressure_hpa",
    "iaq",
    "eco2_ppm",
    "gas_resistance_ohm",
    "captured_at",
  ]
  return keys
    .map((key) => [key, telemetry[key]] as const)
    .filter(([, value]) => value != null)
    .slice(0, 5)
}

function StatusBadge({ status }: { status?: string | null }) {
  const live = isLive(status)
  return (
    <Badge
      variant="outline"
      className={live ? "border-green-500/40 text-green-200" : "border-amber-500/40 text-amber-200"}
    >
      {live ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
      {live ? "live" : status || "unknown"}
    </Badge>
  )
}

function FieldDeviceCard({ device }: { device: FieldDevice }) {
  const telemetry = telemetryPreview(device.telemetry)
  return (
    <GlassCard color={isLive(device.status) ? "green" : "orange"} padding="p-0">
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="truncate text-base font-semibold text-white">{device.name || device.id}</h4>
            <p className="truncate text-xs text-gray-500">{device.registry_id || device.id}</p>
          </div>
          <StatusBadge status={device.status} />
        </div>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-white/5 px-3 py-2">
            <dt className="text-gray-500">Type</dt>
            <dd className="font-mono text-cyan-200">{device.type || device.role || "--"}</dd>
          </div>
          <div className="rounded-md bg-white/5 px-3 py-2">
            <dt className="text-gray-500">Source</dt>
            <dd className="font-mono text-cyan-200">{device.source || "--"}</dd>
          </div>
          <div className="rounded-md bg-white/5 px-3 py-2">
            <dt className="text-gray-500">Host</dt>
            <dd className="font-mono text-cyan-200">{device.host || "--"}</dd>
          </div>
          <div className="rounded-md bg-white/5 px-3 py-2">
            <dt className="text-gray-500">Last seen</dt>
            <dd className="truncate text-gray-300">{formatTimestamp(device.lastSeen)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-gray-400">{device.location_label || "No location label"}</p>
        {telemetry.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {telemetry.map(([key, value]) => (
              <Badge key={key} variant="outline" className="border-white/15 text-gray-300">
                <span className="mr-1 text-gray-500">{key.replace(/_/g, " ")}</span>
                <span className="font-mono">{String(value).slice(0, 24)}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-gray-500">No telemetry sample attached to this snapshot.</p>
        )}
      </div>
    </GlassCard>
  )
}

export function DevicesSection() {
  const field = useSWR<FieldDevicesPayload>("/api/earth-simulator/devices", fetcher, { refreshInterval: 20_000 })
  const network = useSWR<NetworkDevicesPayload>("/api/devices/network", fetcher, { refreshInterval: 20_000 })
  const mindexRegistry = useSWR<MindexRegistryPayload>("/api/mindex/registry/devices?limit=50", fetcher, {
    refreshInterval: 60_000,
  })
  const inventory = useSWR<InventoryProbe>("/api/mindex/devices-inventory/inventory?limit=80", inventoryFetcher, {
    refreshInterval: 120_000,
  })
  const deployed = useSWR<InventoryProbe>("/api/mindex/devices-inventory/inventory/deployed?limit=80", inventoryFetcher, {
    refreshInterval: 120_000,
  })

  const fieldDevices = field.data?.devices ?? []
  const networkDevices = network.data?.devices ?? []
  const liveFieldByRegistry = new Map<string, FieldDevice>()
  const liveFieldByHost = new Map<string, FieldDevice>()
  for (const device of fieldDevices) {
    if (!isLive(device.status)) continue
    if (device.registry_id) liveFieldByRegistry.set(device.registry_id, device)
    if (device.host) liveFieldByHost.set(device.host, device)
  }
  const networkDevicesWithLiveOverride = networkDevices.map((device) => {
    const fieldMatch =
      liveFieldByRegistry.get(device.device_id || "") ||
      liveFieldByRegistry.get(device.registry_id || "") ||
      liveFieldByHost.get(device.host || "")
    if (!fieldMatch) return device
    return {
      ...device,
      status: fieldMatch.status || "connected",
      last_seen: fieldMatch.lastSeen || device.last_seen,
      telemetry: fieldMatch.telemetry || device.telemetry,
      source: `${device.source || "MAS-Registry"} + Earth Simulator live`,
    }
  })
  const liveFieldCount = fieldDevices.filter((device) => isLive(device.status)).length
  const liveNetworkCount = networkDevicesWithLiveOverride.filter((device) => isLive(device.status)).length
  const mindexTotal = mindexRegistry.data?.total ?? mindexRegistry.data?.devices?.length ?? 0

  const refreshAll = () => {
    void field.mutate()
    void network.mutate()
    void mindexRegistry.mutate()
    void inventory.mutate()
    void deployed.mutate()
  }

  return (
    <div className="space-y-6">
      <GlassCard color="cyan">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Cpu className="h-5 w-5 text-cyan-300" />
              Mycosoft device fleet
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Field devices from Earth Simulator, MAS registry, and operator probes. Earth Simulator liveness wins when
              MAS registry rows lag behind Mushroom 1 or Hyphae 1.
            </p>
          </div>
          <Button type="button" variant="outline" className="min-h-[44px] border-cyan-500/40 text-cyan-200" onClick={refreshAll}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-white/5 px-3 py-2">
            <p className="text-xs text-gray-500">Registered field devices</p>
            <p className="font-mono text-2xl text-white">{field.data?.count ?? fieldDevices.length}</p>
          </div>
          <div className="rounded-md bg-white/5 px-3 py-2">
            <p className="text-xs text-gray-500">Live field devices</p>
            <p className="font-mono text-2xl text-green-200">{liveFieldCount}</p>
          </div>
          <div className="rounded-md bg-white/5 px-3 py-2">
            <p className="text-xs text-gray-500">Network registry rows</p>
            <p className="font-mono text-2xl text-cyan-200">{networkDevices.length}</p>
          </div>
          <div className="rounded-md bg-white/5 px-3 py-2">
            <p className="text-xs text-gray-500">MINDEX registry rows</p>
            <p className="font-mono text-2xl text-amber-200">{mindexTotal}</p>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        <div>
          {field.error ? <p className="text-sm text-amber-300">Could not load Earth Simulator device fleet.</p> : null}
          {field.isLoading ? <p className="text-sm text-gray-500">Loading devices...</p> : null}
          <div className="grid gap-4 xl:grid-cols-3">
            {fieldDevices.map((device) => (
              <FieldDeviceCard key={device.id} device={device} />
            ))}
          </div>
        </div>

        <div>
          <GlassCard color="green">
            <div className="mb-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-white/5 px-3 py-2">
                <p className="text-xs text-gray-500">Rows</p>
                <p className="font-mono text-xl text-white">{networkDevices.length}</p>
              </div>
              <div className="rounded-md bg-white/5 px-3 py-2">
                <p className="text-xs text-gray-500">Online</p>
                <p className="font-mono text-xl text-green-200">{liveNetworkCount}</p>
              </div>
              <div className="rounded-md bg-white/5 px-3 py-2">
                <p className="text-xs text-gray-500">Field deployments</p>
                <p className="font-mono text-xl text-cyan-200">{field.data?.sources?.field_deployments ?? "--"}</p>
              </div>
            </div>
            <div className="h-[min(55vh,520px)] overflow-auto rounded-md border border-white/10">
              <table className="min-w-[760px] w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-500">
                    <th className="p-2">Device</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Host</th>
                    <th className="p-2">Source</th>
                    <th className="p-2">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {networkDevicesWithLiveOverride.map((device) => (
                    <tr key={device.device_id || device.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-2 text-white">{device.device_name || device.name || device.device_id || device.id}</td>
                      <td className="p-2 font-mono text-cyan-200">{device.device_role || "--"}</td>
                      <td className="p-2">
                        <StatusBadge status={device.status} />
                      </td>
                      <td className="p-2 font-mono text-gray-300">
                        {device.host ? `${device.host}${device.port ? `:${device.port}` : ""}` : "--"}
                      </td>
                      <td className="p-2 text-gray-300">{device.source || "--"}</td>
                      <td className="p-2 text-gray-400">{formatTimestamp(device.last_seen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        <div>
          <GlassCard color="orange">
            <div className="mb-3 flex items-center gap-2">
              <Server className="h-5 w-5 text-amber-300" />
              <h3 className="text-lg font-semibold text-white">MINDEX device persistence</h3>
            </div>
            <p className="text-sm text-gray-400">
              The site can see the field fleet through Earth Simulator/MAS, but MINDEX device persistence is currently empty or failing.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-white/5 px-3 py-2">
                <p className="text-xs text-gray-500">Registry rows</p>
                <p className="font-mono text-xl text-amber-200">{mindexTotal}</p>
              </div>
              <div className="rounded-md bg-white/5 px-3 py-2">
                <p className="text-xs text-gray-500">Inventory status</p>
                <p className="font-mono text-xl text-amber-200">{inventory.data?.status ?? "--"}</p>
              </div>
              <div className="rounded-md bg-white/5 px-3 py-2">
                <p className="text-xs text-gray-500">Deployed status</p>
                <p className="font-mono text-xl text-amber-200">{deployed.data?.status ?? "--"}</p>
              </div>
            </div>
            {mindexRegistry.data?.warning || mindexRegistry.data?.error ? (
              <p className="mt-3 text-sm text-amber-300">{mindexRegistry.data.warning || mindexRegistry.data.error}</p>
            ) : null}
          </GlassCard>
        </div>

        <div>
          <div className="space-y-4">
            <GlassCard color="cyan">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">MycoForge inventory connector</h3>
                  <p className="text-sm text-gray-400">
                    Website has the canonical product and variant registry. Parts, BOMs, and completed-device stock will
                    appear when the MycoForge Supabase inventory feed is connected.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-cyan-500/30 text-cyan-200">
                  {DEVICE_PRODUCTS.reduce((sum, product) => sum + product.variants.length, 0)} variants
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {DEVICE_PRODUCTS.map((product) => (
                  <div key={product.deviceId} className="rounded-md border border-white/10 bg-black/30 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{product.name}</p>
                        <p className="truncate text-xs text-gray-500">{product.href}</p>
                      </div>
                      <Badge variant="outline" className="border-white/15 text-gray-300">
                        {product.variants.length}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {product.variants.map((variant) => (
                        <Badge key={variant.id} variant="outline" className="border-cyan-500/20 text-cyan-200">
                          {variant.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-amber-200">
                Inventory will list components, BOM links, and completed devices from MycoForge when live stock data is ready.
              </p>
            </GlassCard>

            <div className="grid gap-4 lg:grid-cols-2">
            <InventoryStatus title="Inventory" probe={inventory.data} loading={inventory.isLoading} />
            <InventoryStatus title="Deployed inventory" probe={deployed.data} loading={deployed.isLoading} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InventoryStatus({ title, probe, loading }: { title: string; probe?: InventoryProbe; loading: boolean }) {
  return (
    <GlassCard color={probe?.ok ? "green" : "orange"}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {loading ? <Activity className="h-4 w-4 animate-pulse text-cyan-300" /> : null}
      </div>
      <p className="text-sm text-gray-400">
        {probe?.ok ? "Inventory feed responded." : "Inventory feed is waiting for live records."}
      </p>
      <div className="mt-3 rounded-md bg-white/5 px-3 py-2">
        <p className="text-xs text-gray-500">Service status</p>
        <p className="font-mono text-xl text-amber-200">{probe?.ok ? "ready" : loading ? "checking" : "pending"}</p>
      </div>
      {probe?.ok ? (
        <div className="mt-3 h-44 overflow-auto rounded-md border border-white/10">
          <pre className="whitespace-pre-wrap break-all p-3 text-xs font-mono text-gray-300">
            {JSON.stringify(probe.body, null, 2).slice(0, 6000)}
          </pre>
        </div>
      ) : null}
    </GlassCard>
  )
}
