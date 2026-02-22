"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface RegistryDevice {
  device_id: string
  device_name?: string
  device_display_name?: string
  device_role?: string
  status?: string
}

interface FleetGroup {
  id: string
  name: string
  description?: string
  device_ids: string[]
  created_at: string
  updated_at: string
}

interface ProvisioningResponse {
  status: string
  token: string
  expires_in: number
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) throw new Error("Request failed")
  return response.json()
}

function formatDeviceLabel(device: RegistryDevice) {
  return (
    device.device_display_name ||
    device.device_name ||
    device.device_role ||
    device.device_id
  )
}

export function FleetManagement() {
  const { data: groups, mutate: mutateGroups, error: groupsError, isLoading: groupsLoading } =
    useSWR<FleetGroup[]>("/api/iot/fleet/groups", fetcher, { refreshInterval: 15000 })

  const { data: devices, error: devicesError } = useSWR<RegistryDevice[]>(
    "/api/devices/network?include_offline=true",
    fetcher,
    { refreshInterval: 20000 }
  )

  const deviceOptions = useMemo(
    () =>
      (devices || []).map((device) => ({
        id: device.device_id,
        label: formatDeviceLabel(device),
        status: device.status ?? "unknown",
      })),
    [devices]
  )

  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [groupDevices, setGroupDevices] = useState<string[]>([])

  const [bulkCommand, setBulkCommand] = useState("")
  const [bulkParams, setBulkParams] = useState("{}")
  const [bulkTargets, setBulkTargets] = useState<string[]>([])
  const [bulkResult, setBulkResult] = useState<string>("")

  const [firmwareVersion, setFirmwareVersion] = useState("")
  const [firmwareTargets, setFirmwareTargets] = useState<string[]>([])
  const [firmwareResult, setFirmwareResult] = useState<string>("")

  const [provisionRole, setProvisionRole] = useState("")
  const [provisionName, setProvisionName] = useState("")
  const [provisionLocation, setProvisionLocation] = useState("")
  const [provisionTtl, setProvisionTtl] = useState("3600")
  const [provisionResponse, setProvisionResponse] = useState<ProvisioningResponse | null>(null)
  const [provisionError, setProvisionError] = useState<string>("")

  async function createGroup() {
    if (!groupName.trim()) return
    await fetch("/api/iot/fleet/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        device_ids: groupDevices,
      }),
    })
    setGroupName("")
    setGroupDescription("")
    setGroupDevices([])
    mutateGroups()
  }

  async function deleteGroup(groupId: string) {
    await fetch(`/api/iot/fleet/groups/${groupId}`, { method: "DELETE" })
    mutateGroups()
  }

  async function sendBulkCommand() {
    setBulkResult("")
    try {
      const params = JSON.parse(bulkParams || "{}")
      const response = await fetch("/api/iot/fleet/bulk/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_ids: bulkTargets,
          command: bulkCommand,
          params,
        }),
      })
      const text = await response.text()
      setBulkResult(text)
    } catch {
      setBulkResult("Invalid JSON in command parameters.")
    }
  }

  async function deployFirmware() {
    setFirmwareResult("")
    const response = await fetch("/api/iot/fleet/firmware/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_ids: firmwareTargets,
        firmware_version: firmwareVersion,
      }),
    })
    const text = await response.text()
    setFirmwareResult(text)
  }

  async function createProvisioningToken() {
    setProvisionError("")
    setProvisionResponse(null)
    const response = await fetch("/api/iot/fleet/provisioning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_role: provisionRole,
        device_name: provisionName || undefined,
        location: provisionLocation || undefined,
        ttl_seconds: Number(provisionTtl) || 3600,
      }),
    })
    if (!response.ok) {
      setProvisionError("Failed to create token.")
      return
    }
    const data = (await response.json()) as ProvisioningResponse
    setProvisionResponse(data)
  }

  if (groupsLoading) {
    return <div className="rounded-lg border p-6">Loading fleet management...</div>
  }

  if (groupsError || devicesError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Unable to load fleet management data.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fleet Groups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.5fr]">
            <div className="space-y-3">
              <Input
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="Group name"
              />
              <Textarea
                value={groupDescription}
                onChange={(event) => setGroupDescription(event.target.value)}
                placeholder="Description"
                rows={3}
              />
              <div className="rounded-md border p-3">
                <div className="mb-2 text-sm font-medium">Assign devices</div>
                <div className="max-h-44 space-y-2 overflow-y-auto text-sm">
                  {deviceOptions.length ? (
                    deviceOptions.map((device) => (
                      <label key={device.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={groupDevices.includes(device.id)}
                          onCheckedChange={(checked) => {
                            setGroupDevices((prev) =>
                              checked
                                ? [...prev, device.id]
                                : prev.filter((id) => id !== device.id)
                            )
                          }}
                        />
                        <span>{device.label}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-muted-foreground">No devices available.</div>
                  )}
                </div>
              </div>
              <Button className="w-full" onClick={createGroup} disabled={!groupName.trim()}>
                Create group
              </Button>
            </div>

            <div className="space-y-3">
              {groups?.length ? (
                groups.map((group) => (
                  <div key={group.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{group.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {group.description || "No description"}
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          Devices: {group.device_ids.length}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteGroup(group.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                  No fleet groups created yet.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Commands</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={bulkCommand}
              onChange={(event) => setBulkCommand(event.target.value)}
              placeholder="Command name"
            />
            <Textarea
              value={bulkParams}
              onChange={(event) => setBulkParams(event.target.value)}
              placeholder='{"mode":"reset"}'
              rows={4}
            />
            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-medium">Target devices</div>
              <div className="max-h-44 space-y-2 overflow-y-auto text-sm">
                {deviceOptions.map((device) => (
                  <label key={device.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={bulkTargets.includes(device.id)}
                      onCheckedChange={(checked) => {
                        setBulkTargets((prev) =>
                          checked
                            ? [...prev, device.id]
                            : prev.filter((id) => id !== device.id)
                        )
                      }}
                    />
                    <span>{device.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={sendBulkCommand}
              disabled={!bulkCommand.trim() || bulkTargets.length === 0}
            >
              Dispatch command
            </Button>
            {bulkResult ? (
              <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                {bulkResult}
              </pre>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Firmware Deployment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={firmwareVersion}
              onChange={(event) => setFirmwareVersion(event.target.value)}
              placeholder="Firmware version (e.g. 1.3.2)"
            />
            <div className="rounded-md border p-3">
              <div className="mb-2 text-sm font-medium">Target devices</div>
              <div className="max-h-44 space-y-2 overflow-y-auto text-sm">
                {deviceOptions.map((device) => (
                  <label key={device.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={firmwareTargets.includes(device.id)}
                      onCheckedChange={(checked) => {
                        setFirmwareTargets((prev) =>
                          checked
                            ? [...prev, device.id]
                            : prev.filter((id) => id !== device.id)
                        )
                      }}
                    />
                    <span>{device.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={deployFirmware}
              disabled={!firmwareVersion.trim() || firmwareTargets.length === 0}
            >
              Deploy firmware
            </Button>
            {firmwareResult ? (
              <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                {firmwareResult}
              </pre>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provisioning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              value={provisionRole}
              onChange={(event) => setProvisionRole(event.target.value)}
              placeholder="Device role"
            />
            <Input
              value={provisionName}
              onChange={(event) => setProvisionName(event.target.value)}
              placeholder="Device name (optional)"
            />
            <Input
              value={provisionLocation}
              onChange={(event) => setProvisionLocation(event.target.value)}
              placeholder="Location (optional)"
            />
            <Input
              value={provisionTtl}
              onChange={(event) => setProvisionTtl(event.target.value)}
              placeholder="TTL seconds"
            />
          </div>
          <Button
            className="w-full md:w-auto"
            onClick={createProvisioningToken}
            disabled={!provisionRole.trim()}
          >
            Create provisioning token
          </Button>
          {provisionError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {provisionError}
            </div>
          ) : null}
          {provisionResponse ? (
            <div className="rounded-md border p-3 text-sm">
              <div className="font-semibold">Token: {provisionResponse.token}</div>
              <div className="text-muted-foreground">
                Expires in {provisionResponse.expires_in} seconds
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
