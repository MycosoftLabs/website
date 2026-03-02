"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"

import { DeviceBulkActions } from "@/components/iot/device-bulk-actions"
import { DeviceStatusBadge } from "@/components/iot/device-status-badge"
import { DeviceTypeFilter } from "@/components/iot/device-type-filter"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface DeviceRecord {
  device_id: string
  device_name?: string
  device_role?: string
  device_display_name?: string
  host?: string
  port?: number
  firmware_version?: string
  board_type?: string
  sensors?: string[]
  capabilities?: string[]
  location?: string
  connection_type?: string
  ingestion_source?: string
  status?: string
  last_seen?: string
  registered_at?: string
}

interface DeviceRegistryResponse {
  devices: DeviceRecord[]
  count: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Failed to load device registry")
  return response.json()
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase()
}

export function DeviceRegistryTable() {
  const { data, error, isLoading, mutate } = useSWR<DeviceRegistryResponse>(
    "/api/devices?include_offline=true",
    fetcher
  )

  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBusy, setIsBusy] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const devices = useMemo(() => data?.devices ?? [], [data?.devices])
  const deviceTypes = useMemo(() => {
    const types = new Set<string>()
    devices.forEach((device) => {
      if (device.device_role) types.add(device.device_role)
    })
    return Array.from(types).sort()
  }, [devices])

  const filteredDevices = useMemo(() => {
    const needle = normalizeSearch(query)
    return devices.filter((device) => {
      const matchesQuery =
        !needle ||
        device.device_id?.toLowerCase().includes(needle) ||
        device.device_name?.toLowerCase().includes(needle) ||
        device.device_display_name?.toLowerCase().includes(needle) ||
        device.location?.toLowerCase().includes(needle)
      const matchesStatus =
        statusFilter === "all" || device.status === statusFilter
      const matchesType =
        typeFilter === "all" || device.device_role === typeFilter
      return matchesQuery && matchesStatus && matchesType
    })
  }, [devices, query, statusFilter, typeFilter])

  const selectedCount = selectedIds.size
  const allSelected =
    filteredDevices.length > 0 &&
    filteredDevices.every((device) => selectedIds.has(device.device_id))

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    const next = new Set<string>()
    filteredDevices.forEach((device) => next.add(device.device_id))
    setSelectedIds(next)
  }

  const toggleSelection = (deviceId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(deviceId)
      else next.delete(deviceId)
      return next
    })
  }

  const handleSendCommand = async () => {
    const command = window.prompt("Command to send to selected devices:")
    if (!command) return
    setIsBusy(true)
    setActionMessage(null)
    try {
      await Promise.all(
        Array.from(selectedIds).map((deviceId) =>
          fetch(`/api/devices/${deviceId}/command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command }),
          })
        )
      )
      setActionMessage("Command dispatched to selected devices.")
    } catch (err) {
      setActionMessage("Command dispatch failed. Check device availability.")
    } finally {
      setIsBusy(false)
    }
  }

  const handleRemoveDevices = async () => {
    if (!window.confirm("Remove selected devices from registry?")) return
    setIsBusy(true)
    setActionMessage(null)
    try {
      await Promise.all(
        Array.from(selectedIds).map((deviceId) =>
          fetch(`/api/devices/${deviceId}`, { method: "DELETE" })
        )
      )
      setSelectedIds(new Set())
      await mutate()
      setActionMessage("Selected devices removed.")
    } catch (err) {
      setActionMessage("Remove failed. Try again.")
    } finally {
      setIsBusy(false)
    }
  }

  const handleExport = () => {
    const selectedDevices = devices.filter((device) =>
      selectedIds.has(device.device_id)
    )
    const blob = new Blob([JSON.stringify(selectedDevices, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "natureos-device-registry.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <div className="rounded-lg border p-6">Loading devices...</div>
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Unable to load device registry.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search devices, IDs, locations..."
            className="h-11 text-base md:max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full text-base md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="stale">Stale</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <DeviceTypeFilter
            value={typeFilter}
            options={deviceTypes}
            onChange={setTypeFilter}
          />
        </div>
        <div className="flex flex-col gap-2 md:items-end">
          <div className="text-sm text-muted-foreground">
            {filteredDevices.length} devices
          </div>
          <DeviceBulkActions
            selectedCount={selectedCount}
            isBusy={isBusy}
            onSendCommand={handleSendCommand}
            onRemove={handleRemoveDevices}
            onExport={handleExport}
            onClear={() => setSelectedIds(new Set())}
          />
        </div>
      </div>

      {actionMessage ? (
        <div className="rounded-md border border-muted bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {actionMessage}
        </div>
      ) : null}

      <div className="space-y-3 md:hidden">
        {filteredDevices.map((device) => (
          <div
            key={device.device_id}
            className="rounded-lg border p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">
                  {device.device_display_name || device.device_name || device.device_id}
                </div>
                <div className="text-xs text-muted-foreground">
                  {device.device_id}
                </div>
              </div>
              <Checkbox
                checked={selectedIds.has(device.device_id)}
                onCheckedChange={(value) =>
                  toggleSelection(device.device_id, Boolean(value))
                }
                className="h-5 w-5"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <DeviceStatusBadge status={device.status} />
              <span className="rounded-full border px-2 py-1">
                {device.device_role || "unknown"}
              </span>
              {device.location ? (
                <span className="rounded-full border px-2 py-1">
                  {device.location}
                </span>
              ) : null}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Firmware {device.firmware_version || "unknown"} •{" "}
              {device.connection_type || "lan"}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(value) => toggleSelectAll(Boolean(value))}
                  className="h-5 w-5"
                />
              </th>
              <th className="px-4 py-3 text-left">Device</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Firmware</th>
              <th className="px-4 py-3 text-left">Connection</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.map((device) => (
              <tr
                key={device.device_id}
                className={cn(
                  "border-t transition-colors",
                  selectedIds.has(device.device_id) && "bg-muted/30"
                )}
              >
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedIds.has(device.device_id)}
                    onCheckedChange={(value) =>
                      toggleSelection(device.device_id, Boolean(value))
                    }
                    className="h-5 w-5"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {device.device_display_name || device.device_name || device.device_id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {device.device_id}
                  </div>
                </td>
                <td className="px-4 py-3">{device.device_role || "unknown"}</td>
                <td className="px-4 py-3">
                  <DeviceStatusBadge status={device.status} />
                </td>
                <td className="px-4 py-3">{device.location || "—"}</td>
                <td className="px-4 py-3">
                  {device.firmware_version || "unknown"}
                </td>
                <td className="px-4 py-3">
                  {device.connection_type || "lan"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredDevices.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No devices found. Connect a MycoBrain device or adjust filters.
        </div>
      ) : null}
    </div>
  )
}
