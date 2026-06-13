/**
 * Hook for accessing the current Supabase user
 * Use this in client components to get user state
 */
"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User, Session } from "@supabase/supabase-js"

interface UseSupabaseUserReturn {
  user: User | null
  session: Session | null
  loading: boolean
  error: Error | null
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

function isLocalDevHost() {
  if (typeof window === "undefined") return false
  return process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
}

let localDevUserCache: { at: number; user: User | null } | null = null
let localDevUserInFlight: Promise<User | null> | null = null
const LOCAL_DEV_USER_CACHE_TTL_MS = 60_000

async function getLocalDevUser(): Promise<User | null> {
  if (!isLocalDevHost()) return null
  if (localDevUserCache && Date.now() - localDevUserCache.at < LOCAL_DEV_USER_CACHE_TTL_MS) {
    return localDevUserCache.user
  }
  if (localDevUserInFlight) return localDevUserInFlight
  localDevUserInFlight = (async () => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" })
      if (!response.ok) return null
      const data = await response.json()
      if (data?.ok !== true || data?.user?.localDev !== true || !data.user.email) return null
      return {
        id: data.user.id || "local-dev-morgan",
        email: data.user.email,
        app_metadata: { provider: "local-dev", localDev: true },
        user_metadata: { full_name: "Morgan", localDev: true },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User
    } catch {
      return null
    }
  })()
  try {
    const user = await localDevUserInFlight
    localDevUserCache = { at: Date.now(), user }
    return user
  } finally {
    localDevUserInFlight = null
  }
}

export function useSupabaseUser(): UseSupabaseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  const refreshSession = useCallback(async () => {
    if (!supabase) return
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      setSession(session)
      setUser(session?.user ?? (await getLocalDevUser()))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to get session"))
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    if (!supabase) return
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      if (isLocalDevHost()) {
        await fetch("/api/auth/local-dev-session", { method: "DELETE" }).catch(() => null)
      }
      setUser(null)
      setSession(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to sign out"))
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    // Single call to getSession - it contains the user
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          // Silently handle missing session - not an error
          if (error.message !== "Auth session missing!") {
            console.warn("Session error:", error.message)
          }
        }
        setSession(session)
        setUser(session?.user ?? (await getLocalDevUser()))
      } catch {
        // Silently fail - don't block the app
      } finally {
        setLoading(false)
      }
    }

    // Use setTimeout to not block initial render
    const timeoutId = setTimeout(getInitialSession, 0)

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        if (session?.user) {
          setUser(session.user)
          setLoading(false)
          return
        }
        getLocalDevUser()
          .then((localUser) => setUser(localUser))
          .finally(() => setLoading(false))
      }
    )

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase])

  return { user, session, loading, error, signOut, refreshSession }
}

/**
 * Hook for accessing user profile from Supabase
 */
interface Profile {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  organization: string | null
  role: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}

interface UseProfileReturn {
  profile: Profile | null
  loading: boolean
  error: Error | null
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const { user, loading: userLoading } = useSupabaseUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    const getProfile = async () => {
      if (!supabase || !user) {
        setProfile(null)
        setLoading(false)
        return
      }

      const localDevUser =
        isLocalDevHost() &&
        (user.id === "local-dev-morgan" ||
          user.app_metadata?.localDev === true ||
          user.user_metadata?.localDev === true)
      if (localDevUser) {
        setProfile({
          id: user.id,
          username: "morgan",
          full_name: "Morgan",
          avatar_url: null,
          organization: "Mycosoft",
          role: "owner",
          subscription_tier: "enterprise",
          created_at: user.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        setError(null)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()

        if (error && error.code !== "PGRST116") {
          throw error
        }
        setProfile(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to get profile"))
      } finally {
        setLoading(false)
      }
    }

    if (!userLoading) {
      getProfile()
    }
  }, [user, userLoading, supabase])

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!supabase) {
      throw new Error("Supabase is not configured")
    }
    if (!user) {
      throw new Error("No user logged in")
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update profile"))
      throw err
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  return { profile, loading: loading || userLoading, error, updateProfile }
}
