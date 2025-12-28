"use client"

import type React from "react"
import { createContext, useContext, useMemo, useState } from "react"
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react"

export interface User {
  id: string
  name: string
  email: string | null
  avatar?: string
  role?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function AuthContextBridge({ children }: { children: React.ReactNode }) {
  const { data, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  const user: User | null = useMemo(() => {
    const sessionUser = data?.user
    if (!sessionUser) return null
    return {
      id: (sessionUser as any).id ?? sessionUser.email ?? "unknown",
      name: sessionUser.name ?? sessionUser.email?.split("@")?.[0] ?? "User",
      email: sessionUser.email ?? null,
      avatar: (sessionUser as any).image ?? "/placeholder.svg",
      role: (sessionUser as any).role,
    }
  }, [data?.user])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await signIn("credentials", { email, password, redirect: false })
      if (!res?.ok) throw new Error(res?.error || "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  const doSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: "/" })
  }

  return (
    <AuthContext.Provider value={{ user, login, signOut: doSignOut, isLoading: isLoading || status === "loading" }}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextBridge>{children}</AuthContextBridge>
    </SessionProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
