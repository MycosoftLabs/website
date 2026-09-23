import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import {
  LOCAL_DEV_ADMIN_COOKIE,
  verifyLocalDevAdminSession,
} from "@/lib/auth/local-dev-session"

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

/** Aligns with NLM profile roles (super_admin) and platform owner/superuser. */
const OWNER_EMAILS = new Set(["morgan@mycosoft.org"])
const ADMIN_EMAILS = new Set([
  "morgan@mycosoft.org",
  "rj@mycosoft.org",
  "admin@mycosoft.org",
])

export function normalizeVerifiedRole(user: any): string {
  return String(user?.user_metadata?.role || "user").toLowerCase().trim()
}

export function isOwnerOrSuperuserRole(role: string): boolean {
  // NLM training UI uses super_admin; platform uses owner/superuser
  return ["owner", "superuser", "super_admin"].includes(role)
}

export function isAdminRole(role: string): boolean {
  return ["owner", "superuser", "super_admin", "admin"].includes(role)
}

function roleFromEmail(email: string | null): string | null {
  if (!email) return null
  if (OWNER_EMAILS.has(email)) return "owner"
  if (ADMIN_EMAILS.has(email)) return "admin"
  return null
}

export async function resolveVerifiedIdentity(): Promise<VerifiedIdentity> {
  // Local-dev admin cookie (same path as lib/auth/api-auth) so NLM seed APIs work on :3010
  const localDevCookie = (await cookies()).get(LOCAL_DEV_ADMIN_COOKIE)?.value
  const localDevSession = verifyLocalDevAdminSession(localDevCookie)
  if (localDevSession) {
    return {
      userId: "local-dev-morgan",
      userRole: "owner",
      email: localDevSession.email,
      isAuthenticated: true,
      isSuperuser: true,
      isCreator: true,
      authTrustLevel: "verified",
    }
  }

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

  const email = user.email ? String(user.email).toLowerCase().trim() : null
  let userRole = normalizeVerifiedRole(user)

  // Prefer profiles.role when JWT metadata is still the default "user"
  // (NLM dashboard seeds profiles as super_admin for Morgan).
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    const profileRole = String(profile?.role || "")
      .toLowerCase()
      .trim()
    if (profileRole && (isAdminRole(profileRole) || userRole === "user")) {
      userRole = profileRole
    }
  } catch {
    // profiles table may be unavailable; fall through to email / metadata
  }

  const emailRole = roleFromEmail(email)
  if (emailRole && (!isAdminRole(userRole) || emailRole === "owner")) {
    userRole = emailRole
  }

  const isSuperuser = isAdminRole(userRole)
  const isCreator =
    email === "morgan@mycosoft.org" &&
    (isOwnerOrSuperuserRole(userRole) || isAdminRole(userRole))

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
  // Accept platform owner/superuser/super_admin and email-elevated admin (isSuperuser)
  if (identity.isSuperuser || isOwnerOrSuperuserRole(identity.userRole)) return null
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
  const token =
    process.env.MYCA_INTERNAL_SERVICE_TOKEN ||
    process.env.MAS_INTERNAL_SERVICE_TOKEN ||
    process.env.MYCA_MAS_SERVICE_TOKEN
  return {
    ...base,
    ...(token
      ? {
          "X-MYCA-Service-Token": token,
          "X-MYCOSOFT-Service-Token": token,
        }
      : {}),
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
