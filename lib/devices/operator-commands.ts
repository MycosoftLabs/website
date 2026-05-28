/**
 * Operator command strings for Jetson :8787 agents (`POST /api/cmd` with `{ cmd: string }`).
 * Shared by Earth Simulator, Device Network, and Device Manager routes.
 */

export function earthSimControlToOperatorCommand(
  peripheral: string,
  params?: Record<string, unknown>
): string {
  if (typeof params?.cmd === "string" && params.cmd.trim()) {
    return params.cmd.trim()
  }
  if (peripheral === "neopixel" && params?.effect === "rainbow") {
    return "led pattern rainbow"
  }
  if (peripheral === "neopixel" && params?.effect === "off") {
    return "led off"
  }
  if (peripheral === "buzzer") {
    return "bump"
  }
  return peripheral
}

export function networkCommandToOperator(command: string, params: Record<string, unknown>): string {
  if (typeof params.cmd === "string" && params.cmd.trim()) {
    return params.cmd.trim()
  }
  if (command === "led pattern rainbow" || command === "led rainbow") {
    return "led pattern rainbow"
  }
  if (command === "led rgb 0 0 0" || command === "led off") {
    return "led off"
  }
  if (command.startsWith("beep ") || command === "beep" || command === "buzzer") {
    return "bump"
  }
  if (command === "led_rgb" && params) {
    const r = Number(params.r ?? 0)
    const g = Number(params.g ?? 0)
    const b = Number(params.b ?? 0)
    return `led rgb ${r} ${g} ${b}`
  }
  if (command === "read_sensors") {
    return "sensor read"
  }
  return command
}

/** Map MDP LiveCommandConsole payloads to operator strings when /command is unavailable. */
export function mdpToOperatorCommand(
  target: string,
  cmd: string,
  params: Record<string, unknown> = {}
): string | null {
  if (cmd === "output_control") {
    const id = String(params.id ?? "")
    if (id === "neopixel") {
      if (params.value === 0 || params.value === false) return "led off"
      if (params.effect === "rainbow") return "led pattern rainbow"
      const r = Number(params.r ?? 0)
      const g = Number(params.g ?? 0)
      const b = Number(params.b ?? 0)
      return `led rgb ${r} ${g} ${b}`
    }
    if (id === "buzzer") return "bump"
  }
  if (cmd === "read_sensors") return "sensor read"
  if (cmd === "estop") return "estop"
  if (cmd === "clear_estop") return "clear estop"
  if (cmd === "transport_status" && target === "side_b") return "transport status"
  return null
}

export function isCommandResponseOk(result: unknown): boolean {
  if (!result || typeof result !== "object") return true
  const r = result as Record<string, unknown>
  if (r.success === false) return false
  if (r.ok === false) return false
  const nested = r.result
  if (nested && typeof nested === "object") {
    const n = nested as Record<string, unknown>
    if (n.ok === false) return false
  }
  const response = r.response
  if (response && typeof response === "object") {
    const resp = response as Record<string, unknown>
    if (resp.ok === false) return false
  }
  return true
}
