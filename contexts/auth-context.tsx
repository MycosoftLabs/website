"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

export interface User {
  id: string
  name: string
  email: string | null
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      // Mock login - replace with real authentication later
      setUser({
        id: "1",
        name: email.split("@")[0],
        email: email,
        avatar: "/placeholder.svg",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, signOut, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
