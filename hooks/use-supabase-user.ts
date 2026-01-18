/**
 * Hook for accessing the current Supabase user
 * Use this in client components to get user state
 */
"use client"

import { useEffect, useState, useCallback } from "react"
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

export function useSupabaseUser(): UseSupabaseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      setSession(session)
      setUser(session?.user ?? null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to get session"))
    }
  }, [supabase.auth])

  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setSession(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to sign out"))
    } finally {
      setLoading(false)
    }
  }, [supabase.auth])

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error && error.message !== "Auth session missing!") {
          throw error
        }
        setUser(user)
        
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to get user"))
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Handle specific events
        if (event === "SIGNED_OUT") {
          setUser(null)
          setSession(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

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
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      if (!user) {
        setProfile(null)
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
