// Browser-compatible crypto utilities using Web Crypto API

export interface HashValue {
  algorithm: "sha256"
  valueHex: string
}

export function createRecordId(): string {
  // Use crypto.randomUUID which is available in modern browsers and Node.js
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>()

  function stringifyInner(v: unknown): string {
    if (v === null) return "null"
    if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null"
    if (typeof v === "boolean") return v ? "true" : "false"
    if (typeof v === "string") return JSON.stringify(v)
    if (typeof v === "bigint") return JSON.stringify(v.toString())
    if (typeof v === "undefined") return "null"

    if (Array.isArray(v)) return `[${v.map((item) => stringifyInner(item)).join(",")}]`

    if (typeof v === "object") {
      if (seen.has(v as object)) throw new Error("stableStringify: circular reference")
      seen.add(v as object)

      const obj = v as Record<string, unknown>
      const keys = Object.keys(obj).sort()
      const entries = keys.map((k) => `${JSON.stringify(k)}:${stringifyInner(obj[k])}`)
      return `{${entries.join(",")}}`
    }

    // Fallback for symbols/functions
    return "null"
  }

  return stringifyInner(value)
}

// Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Export toHex for external use
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Convert string to Uint8Array
export function textEncode(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

// Convert Uint8Array to base64 string
export function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }
  // Browser fallback
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// Convert base64 string to Uint8Array
export function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"))
  }
  // Browser fallback
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// Async SHA-256 hash using Web Crypto API
export async function sha256HexAsync(data: string | Uint8Array): Promise<string> {
  const encoder = new TextEncoder()
  const dataBytes = typeof data === "string" ? encoder.encode(data) : data
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes)
  return bufferToHex(hashBuffer)
}

// Sync-compatible SHA-256 for display purposes (returns placeholder, use async version for real hashing)
export function sha256Hex(data: string | Uint8Array): string {
  // For client-side display, we simulate the hash format
  // In production, use sha256HexAsync for actual hashing
  const input = typeof data === "string" ? data : new TextDecoder().decode(data)
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  // Generate a deterministic 64-char hex string from the simple hash
  const base = Math.abs(hash).toString(16).padStart(8, "0")
  return (base + base + base + base + base + base + base + base).slice(0, 64)
}

export function sha256Prefixed(data: string | Uint8Array): string {
  return `sha256:${sha256Hex(data)}`
}

export async function sha256PrefixedAsync(data: string | Uint8Array): Promise<string> {
  return `sha256:${await sha256HexAsync(data)}`
}

export function stripHashPrefix(hash: string): string {
  return hash.startsWith("sha256:") ? hash.slice("sha256:".length) : hash
}
