/**
 * Bridge serial-style mycobrain API commands to network registry devices (server-side).
 */

import { networkCommandToOperator } from "@/lib/devices/operator-commands"
import { isFieldRegistryId } from "@/lib/devices/firmware-compatibility"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export function isNetworkRegistryTarget(id: string): boolean {
  return isFieldRegistryId(id)
}

export async function sendMasNetworkCommand(
  deviceId: string,
  command: string,
  params: Record<string, unknown> = {},
  timeoutSeconds = 10
): Promise<{ ok: boolean; result: unknown; status: number }> {
  const operatorCommand = networkCommandToOperator(command, params)
  const res = await fetch(`${MAS_API_URL}/api/devices/${encodeURIComponent(deviceId)}/command`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      command: operatorCommand,
      params,
      timeout: timeoutSeconds,
    }),
    cache: "no-store",
  })
  const text = await res.text()
  let result: unknown = text
  try {
    result = text ? JSON.parse(text) : {}
  } catch {
    result = text
  }
  return { ok: res.ok, result, status: res.status }
}
