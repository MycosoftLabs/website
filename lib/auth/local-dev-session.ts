import { createHmac, timingSafeEqual } from "crypto"

export const LOCAL_DEV_ADMIN_COOKIE = "mycosoft_local_dev_admin"

const LOCALHOSTS = new Set(["localhost", "127.0.0.1", "::1"])
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

interface LocalDevSessionPayload {
  email: string
  exp: number
  role: "owner"
}

function isDevelopment() {
  return process.env.NODE_ENV === "development"
}

export function isLocalDevAuthEnabled() {
  return isDevelopment() && process.env.MYCOSOFT_LOCAL_DEV_AUTH !== "0"
}

export function isLocalDevHost(hostname: string | null | undefined) {
  if (!hostname) return false
  return LOCALHOSTS.has(hostname.toLowerCase())
}

export function isLocalDevRequestUrl(url: string) {
  try {
    return isLocalDevHost(new URL(url).hostname)
  } catch {
    return false
  }
}

function getSecret() {
  return (
    process.env.LOCAL_DEV_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    "mycosoft-local-dev-session-development-only"
  )
}

function encodePayload(payload: LocalDevSessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url")
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url")
}

export function createLocalDevAdminSession(email = "morgan@mycosoft.org") {
  const payload = encodePayload({
    email,
    exp: Date.now() + SESSION_TTL_MS,
    role: "owner",
  })
  return `${payload}.${signPayload(payload)}`
}

export function verifyLocalDevAdminSession(token: string | undefined | null) {
  if (!isLocalDevAuthEnabled() || !token) return null
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null

  const expected = signPayload(payload)
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as LocalDevSessionPayload
    if (parsed.role !== "owner" || parsed.exp < Date.now()) return null
    if (parsed.email !== "morgan@mycosoft.org") return null
    return parsed
  } catch {
    return null
  }
}
