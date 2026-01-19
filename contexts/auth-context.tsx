"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser, Session } from "@supabase/supabase-js"

export interface User {
  id: string
  name: string
  email: string | null
  avatar?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  login: (email: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Transform Supabase user to our User interface
  const transformUser = useCallback((supabaseUser: SupabaseUser | null): User | null => {
    if (!supabaseUser) return null
    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || 
            supabaseUser.user_metadata?.name ||
            supabaseUser.email?.split("@")[0] || 
            "User",
      email: supabaseUser.email ?? null,
      avatar: supabaseUser.user_metadata?.avatar_url || 
              supabaseUser.user_metadata?.picture ||
              "/placeholder.svg",
      role: supabaseUser.user_metadata?.role || "user",
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession()
        if (error) {
          console.error("Error getting session:", error)
        }
        setSession(currentSession)
        setUser(transformUser(currentSession?.user ?? null))
      } catch (err) {
        console.error("Auth initialization error:", err)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event)
        setSession(newSession)
        setUser(transformUser(newSession?.user ?? null))
        setIsLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth, transformUser])

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        return { error: error.message }
      }
      setSession(data.session)
      setUser(transformUser(data.user))
      return {}
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Failed to sign in" }
    } finally {
      setIsLoading(false)
    }
  }

  const doSignOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, login, signOut: doSignOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
