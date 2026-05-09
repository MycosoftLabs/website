const MYCOBRAIN_VM_LAN = "http://192.168.0.196:8003"

function isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1"
  } catch {
    return false
  }
}

export function resolveMycoBrainServiceUrl(): string {
  const configured =
    process.env.MYCOBRAIN_SERVICE_URL?.trim() ||
    process.env.MYCOBRAIN_API_URL?.trim() ||
    MYCOBRAIN_VM_LAN

  if (configured.startsWith("/") || (isLoopbackUrl(configured) && process.env.ALLOW_LOOPBACK_MYCOBRAIN !== "1")) {
    return MYCOBRAIN_VM_LAN
  }

  return configured.replace(/\/+$/, "")
}
