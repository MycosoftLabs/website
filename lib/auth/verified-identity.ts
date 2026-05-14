import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export type AuthTrustLevel = "verified" | "anonymous"

export interface VerifiedIdentity {
  userId: string
  userRole: string
  email: string | null
  isAuthenticated: boolean
  isSuperuser: boolean
  isCreator: boolean
  authTrustLevel: AuthTrustLevel
}

export function normalizeVerifiedRole(user: any): string {
  return String(user?.user_metadata?.role || "user").toLowerCase().trim()
}

export function isOwnerOrSuperuserRole(role: string): boolean {
  return ["owner", "superuser"].includes(role)
}

export function isAdminRole(role: string): boolean {
  return ["owner", "superuser", "admin"].includes(role)
}

export async function resolveVerifiedIdentity(): Promise<VerifiedIdentity> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth.user

  if (!user) {
    return {
      userId: "anonymous",
      userRole: "guest",
      email: null,
      isAuthenticated: false,
      isSuperuser: false,
      isCreator: false,
      authTrustLevel: "anonymous",
    }
  }

  const userRole = normalizeVerifiedRole(user)
  const email = user.email ? String(user.email).toLowerCase().trim() : null
  const isSuperuser = isAdminRole(userRole)
  const isCreator = email === "morgan@mycosoft.org" && isOwnerOrSuperuserRole(userRole)

  return {
    userId: user.id,
    userRole,
    email,
    isAuthenticated: true,
    isSuperuser,
    isCreator,
    authTrustLevel: "verified",
  }
}

export function requireAuthenticatedIdentity(identity: VerifiedIdentity): NextResponse | null {
  if (identity.isAuthenticated) return null
  return NextResponse.json({ error: "Authentication required" }, { status: 401 })
}

export function requireOwnerOrSuperuserIdentity(identity: VerifiedIdentity): NextResponse | null {
  const authError = requireAuthenticatedIdentity(identity)
  if (authError) return authError
  if (isOwnerOrSuperuserRole(identity.userRole)) return null
  return NextResponse.json({ error: "Owner or superuser access required" }, { status: 403 })
}

export function requireAdminIdentity(identity: VerifiedIdentity): NextResponse | null {
  const authError = requireAuthenticatedIdentity(identity)
  if (authError) return authError
  if (identity.isSuperuser) return null
  return NextResponse.json({ error: "Admin access required" }, { status: 403 })
}

export function resolveScopedUserId(
  identity: VerifiedIdentity,
  requestedUserId?: string | null
): { userId: string; denied?: NextResponse } {
  if (!requestedUserId || requestedUserId === identity.userId) {
    return { userId: identity.userId }
  }

  if (isOwnerOrSuperuserRole(identity.userRole)) {
    return { userId: requestedUserId }
  }

  return {
    userId: identity.userId,
    denied: NextResponse.json(
      { error: "Cross-user access requires owner or superuser authorization" },
      { status: 403 }
    ),
  }
}

export function identityRuntimeContext(identity: VerifiedIdentity) {
  return {
    user_id: identity.userId,
    user_role: identity.userRole,
    is_authenticated: identity.isAuthenticated,
    is_superuser: identity.isSuperuser,
    is_creator: identity.isCreator,
    auth_trust_level: identity.authTrustLevel,
    verified_email: identity.email,
  }
}

export function masServiceHeaders(
  base: HeadersInit = {},
  identity?: Pick<VerifiedIdentity, "userId" | "userRole" | "email" | "authTrustLevel">
): HeadersInit {
  const token = process.env.MAS_INTERNAL_SERVICE_TOKEN || process.env.MYCA_MAS_SERVICE_TOKEN
  return {
    ...base,
    ...(token ? { "X-MYCA-Service-Token": token } : {}),
    ...(identity
      ? {
          "X-MYCA-Verified-User-Id": identity.userId,
          "X-MYCA-Verified-Email": identity.email || "",
          "X-MYCA-Verified-Role": identity.userRole,
          "X-MYCA-Auth-Trust-Level": identity.authTrustLevel,
        }
      : {}),
  }
}
