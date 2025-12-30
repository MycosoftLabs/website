"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

// Types for user settings
export interface UserSettings {
  profile: {
    displayName: string
    bio: string
    avatar: string
  }
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    deviceAlerts: boolean
    weeklyReports: boolean
    securityAlerts: boolean
  }
  account: {
    darkMode: boolean
    compactView: boolean
    betaFeatures: boolean
    analyticsSharing: boolean
    language: string
    timezone: string
  }
  integrations: {
    githubConnected: boolean
    iNaturalistConnected: boolean
    googleCloudConnected: boolean
    azureMapsConnected: boolean
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: number
    loginNotifications: boolean
  }
}

export interface SettingsChange {
  id: string
  userId: string
  userEmail: string
  timestamp: string
  category: string
  key: string
  oldValue: any
  newValue: any
  source: "user" | "system" | "api"
}

interface UseUserSettingsReturn {
  settings: UserSettings | null
  loading: boolean
  error: string | null
  saving: boolean
  lastSaved: Date | null
  changelog: SettingsChange[]
  updateSetting: <K extends keyof UserSettings>(
    category: K,
    key: keyof UserSettings[K],
    value: UserSettings[K][keyof UserSettings[K]]
  ) => Promise<boolean>
  updateSettings: (updates: Partial<UserSettings>) => Promise<boolean>
  resetSettings: (category?: keyof UserSettings) => Promise<boolean>
  refreshSettings: () => Promise<void>
  loadChangelog: () => Promise<void>
}

// Default settings (matches server-side defaults)
const DEFAULT_SETTINGS: UserSettings = {
  profile: {
    displayName: "",
    bio: "",
    avatar: "",
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    deviceAlerts: true,
    weeklyReports: true,
    securityAlerts: true,
  },
  account: {
    darkMode: true,
    compactView: false,
    betaFeatures: false,
    analyticsSharing: true,
    language: "en",
    timezone: "America/Los_Angeles",
  },
  integrations: {
    githubConnected: false,
    iNaturalistConnected: false,
    googleCloudConnected: false,
    azureMapsConnected: false,
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginNotifications: true,
  },
}

export function useUserSettings(): UseUserSettingsReturn {
  const { data: session, status } = useSession()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [changelog, setChangelog] = useState<SettingsChange[]>([])

  // Load settings from API
  const refreshSettings = useCallback(async () => {
    if (status !== "authenticated") {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch("/api/user/settings")
      
      if (!response.ok) {
        throw new Error("Failed to load settings")
      }
      
      const data = await response.json()
      setSettings(data.settings)
    } catch (err) {
      console.error("Error loading settings:", err)
      setError(err instanceof Error ? err.message : "Failed to load settings")
      // Use defaults on error
      setSettings(DEFAULT_SETTINGS)
    } finally {
      setLoading(false)
    }
  }, [status])

  // Load changelog
  const loadChangelog = useCallback(async () => {
    if (status !== "authenticated") return
    
    try {
      const response = await fetch("/api/user/settings/changelog?limit=50")
      if (response.ok) {
        const data = await response.json()
        setChangelog(data.changelog)
      }
    } catch (err) {
      console.error("Error loading changelog:", err)
    }
  }, [status])

  // Update a single setting
  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    category: K,
    key: keyof UserSettings[K],
    value: UserSettings[K][keyof UserSettings[K]]
  ): Promise<boolean> => {
    if (!settings) return false

    try {
      setSaving(true)
      setError(null)
      
      // Optimistic update
      const newSettings = {
        ...settings,
        [category]: {
          ...settings[category],
          [key]: value,
        },
      }
      setSettings(newSettings)
      
      const response = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          key,
          value,
        }),
      })
      
      if (!response.ok) {
        // Rollback on error
        setSettings(settings)
        throw new Error("Failed to save setting")
      }
      
      const data = await response.json()
      setLastSaved(new Date(data.savedAt))
      return true
    } catch (err) {
      console.error("Error saving setting:", err)
      setError(err instanceof Error ? err.message : "Failed to save setting")
      return false
    } finally {
      setSaving(false)
    }
  }, [settings])

  // Update multiple settings
  const updateSettings = useCallback(async (updates: Partial<UserSettings>): Promise<boolean> => {
    if (!settings) return false

    try {
      setSaving(true)
      setError(null)
      
      // Optimistic update with deep merge
      const newSettings = { ...settings }
      for (const category in updates) {
        if (updates[category as keyof UserSettings]) {
          newSettings[category as keyof UserSettings] = {
            ...settings[category as keyof UserSettings],
            ...updates[category as keyof UserSettings],
          } as any
        }
      }
      setSettings(newSettings)
      
      const response = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updates }),
      })
      
      if (!response.ok) {
        // Rollback on error
        setSettings(settings)
        throw new Error("Failed to save settings")
      }
      
      const data = await response.json()
      setLastSaved(new Date(data.savedAt))
      return true
    } catch (err) {
      console.error("Error saving settings:", err)
      setError(err instanceof Error ? err.message : "Failed to save settings")
      return false
    } finally {
      setSaving(false)
    }
  }, [settings])

  // Reset settings
  const resetSettings = useCallback(async (category?: keyof UserSettings): Promise<boolean> => {
    try {
      setSaving(true)
      setError(null)
      
      const url = category 
        ? `/api/user/settings?category=${category}`
        : "/api/user/settings"
      
      const response = await fetch(url, { method: "DELETE" })
      
      if (!response.ok) {
        throw new Error("Failed to reset settings")
      }
      
      const data = await response.json()
      setSettings(data.settings)
      setLastSaved(new Date())
      return true
    } catch (err) {
      console.error("Error resetting settings:", err)
      setError(err instanceof Error ? err.message : "Failed to reset settings")
      return false
    } finally {
      setSaving(false)
    }
  }, [])

  // Load settings on mount and when session changes
  useEffect(() => {
    if (status === "authenticated") {
      refreshSettings()
    } else if (status === "unauthenticated") {
      setSettings(null)
      setLoading(false)
    }
  }, [status, refreshSettings])

  return {
    settings,
    loading,
    error,
    saving,
    lastSaved,
    changelog,
    updateSetting,
    updateSettings,
    resetSettings,
    refreshSettings,
    loadChangelog,
  }
}




