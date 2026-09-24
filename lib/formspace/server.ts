/**
 * FormSpace BFF helpers — auth session + MAS proxy.
 * No mock metrics. Proxies to MAS /api/formspace/*.
 */

import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"
import {
  LOCAL_DEV_ADMIN_COOKIE,
  verifyLocalDevAdminSession,
} from "@/lib/auth/local-dev-session"

export interface FormSpaceAuthUser {
  id: string
  email?: string | null
  localDev?: boolean
}

export async function resolveFormSpaceUser(): Promise<FormSpaceAuthUser | null> {
  const cookieStore = await cookies()
  const localDev = verifyLocalDevAdminSession(
    cookieStore.get(LOCAL_DEV_ADMIN_COOKIE)?.value,
  )
  if (localDev) {
    return {
      id: "local-dev-morgan",
      email: localDev.email,
      localDev: true,
    }
  }
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    return { id: user.id, email: user.email }
  } catch {
    return null
  }
}

export function formspaceMasBaseUrl(): string {
  return resolveMasServerBaseUrl().replace(/\/$/, "")
}

export async function proxyFormSpace(
  path: string,
  init?: RequestInit & { userId?: string | null; timeoutMs?: number },
): Promise<Response> {
  const base = formspaceMasBaseUrl()
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`
  const headers = new Headers(init?.headers || {})
  if (!headers.has("Accept")) headers.set("Accept", "application/json")
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  if (init?.userId) {
    headers.set("X-User-Id", init.userId)
    headers.set("X-Mycosoft-User-Id", init.userId)
  }
  const timeoutMs = init?.timeoutMs ?? 4_000
  const { userId: _u, timeoutMs: _t, ...rest } = init || {}
  return fetch(url, {
    ...rest,
    headers,
    cache: "no-store",
    signal: rest.signal ?? AbortSignal.timeout(timeoutMs),
  })
}
