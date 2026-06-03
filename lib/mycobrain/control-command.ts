/**
 * Map MycoBrain control API peripheral/action payloads to operator cmd strings
 * for field Jetsons (recovery-operator /api/cmd) and MAS network relay.
 */

export function controlPayloadToOperatorCommand(
  peripheral: string,
  action: string,
  data: Record<string, unknown> = {}
): string | null {
  switch (peripheral) {
    case "neopixel": {
      const r = Number(data.r ?? 0)
      const g = Number(data.g ?? 0)
      const b = Number(data.b ?? 0)
      if (action === "rainbow") return "led pattern rainbow"
      if (action === "off") return "led off"
      return `led rgb ${r} ${g} ${b}`
    }
    case "buzzer": {
      if (action === "melody" || action === "morgio") return "morgio"
      if (action === "coin") return "coin"
      if (action === "bump") return "bump"
      if (action === "power") return "power"
      if (action === "1up") return "1up"
      if (action === "off") return "buzzer off"
      if (action === "beep" || action === "tone") {
        const frequency = Math.max(50, Math.min(8000, Number(data.frequency ?? data.hz ?? 1000)))
        const duration = Math.max(20, Math.min(2000, Number(data.duration_ms ?? data.duration ?? data.ms ?? 200)))
        return `beep ${frequency} ${duration}`
      }
      if (action === "preset" && typeof data.preset === "string") {
        const preset = data.preset as string
        if (preset === "bump") return "bump"
        return preset
      }
      if (action === "acoustic_tx") {
        const payload = String(data.payload ?? "")
        return payload ? `aotx start ${payload}` : "aotx start"
      }
      return "bump"
    }
    case "led": {
      if (action === "optical_tx" || action === "optx_start") {
        const payload = String(data.payload ?? "")
        return payload ? `optx start ${payload}` : "optx start"
      }
      if (action === "optical_stop" || action === "optx_stop") return "optx stop"
      if (action === "optical_status" || action === "optx_status") return "optx status"
      const r = Number(data.r ?? 0)
      const g = Number(data.g ?? 0)
      const b = Number(data.b ?? 0)
      return `led rgb ${r} ${g} ${b}`
    }
    case "acoustic": {
      if (action === "acoustic_tx" || action === "aotx_start") {
        const payload = String(data.payload ?? "")
        return payload ? `aotx start ${payload}` : "aotx start"
      }
      if (action === "acoustic_stop" || action === "stop" || action === "aotx_stop") {
        return "aotx stop"
      }
      if (action === "acoustic_status" || action === "aotx_status") return "aotx status"
      return null
    }
    case "command": {
      if (typeof data.cmd === "string" && data.cmd.trim()) return data.cmd.trim()
      return null
    }
    default:
      return null
  }
}
