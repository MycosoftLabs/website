/**
 * User Settings API Route
 * 
 * Handles user-specific settings with persistent storage and changelog
 * Settings are stored per-user and persist across sessions
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import fs from "fs/promises"
import path from "path"

// Settings storage path (in production, use a database)
const SETTINGS_DIR = path.join(process.cwd(), ".data", "user-settings")
const CHANGELOG_FILE = path.join(process.cwd(), ".data", "settings-changelog.json")

// Default user settings
const DEFAULT_SETTINGS = {
  // Profile settings
  profile: {
    displayName: "",
    bio: "",
    avatar: "",
  },
  // Notification preferences
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    deviceAlerts: true,
    weeklyReports: true,
    securityAlerts: true,
  },
  // Account settings
  account: {
    darkMode: true,
    compactView: false,
    betaFeatures: false,
    analyticsSharing: true,
    language: "en",
    timezone: "America/Los_Angeles",
  },
  // Integrations
  integrations: {
    githubConnected: false,
    iNaturalistConnected: false,
    googleCloudConnected: false,
    azureMapsConnected: false,
  },
  // Security preferences
  security: {
    twoFactorEnabled: false,
    sessionTimeout: 30, // days
    loginNotifications: true,
  },
}

interface SettingsChange {
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

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true })
  } catch (error) {
    // Directory already exists
  }
}

// Get user settings file path
function getUserSettingsPath(userId: string): string {
  return path.join(SETTINGS_DIR, `${userId}.json`)
}

// Load user settings
async function loadUserSettings(userId: string): Promise<typeof DEFAULT_SETTINGS> {
  await ensureStorageDir()
  const filePath = getUserSettingsPath(userId)
  
  try {
    const data = await fs.readFile(filePath, "utf-8")
    const savedSettings = JSON.parse(data)
    // Merge with defaults to ensure all keys exist
    return deepMerge(DEFAULT_SETTINGS, savedSettings)
  } catch (error) {
    // File doesn't exist, return defaults
    return { ...DEFAULT_SETTINGS }
  }
}

// Save user settings
async function saveUserSettings(userId: string, settings: any): Promise<void> {
  await ensureStorageDir()
  const filePath = getUserSettingsPath(userId)
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2))
}

// Load changelog
async function loadChangelog(): Promise<SettingsChange[]> {
  await ensureStorageDir()
  try {
    const data = await fs.readFile(CHANGELOG_FILE, "utf-8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save changelog entry
async function addChangelogEntry(entry: SettingsChange): Promise<void> {
  await ensureStorageDir()
  const changelog = await loadChangelog()
  changelog.push(entry)
  // Keep only last 1000 entries
  const trimmed = changelog.slice(-1000)
  await fs.writeFile(CHANGELOG_FILE, JSON.stringify(trimmed, null, 2))
}

// Deep merge helper
function deepMerge(target: any, source: any): any {
  const result = { ...target }
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  }
  return result
}

// GET - Load user settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const user = session.user as any
    const userId = user.id || user.email
    
    const settings = await loadUserSettings(userId)
    
    // Get user's changelog (last 50 entries)
    const includeLog = request.nextUrl.searchParams.get("includeLog") === "true"
    let changelog: SettingsChange[] = []
    
    if (includeLog) {
      const allChanges = await loadChangelog()
      changelog = allChanges
        .filter(c => c.userId === userId)
        .slice(-50)
        .reverse()
    }
    
    return NextResponse.json({
      success: true,
      settings,
      changelog: includeLog ? changelog : undefined,
      userId,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error loading settings:", error)
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    )
  }
}

// POST - Save user settings (partial or full update)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const user = session.user as any
    const userId = user.id || user.email
    const userEmail = user.email || "unknown"
    
    const body = await request.json()
    const { settings: newSettings, category, key, value } = body
    
    // Load current settings
    const currentSettings = await loadUserSettings(userId)
    let updatedSettings = { ...currentSettings }
    const changes: { category: string; key: string; oldValue: any; newValue: any }[] = []
    
    if (newSettings) {
      // Full or partial settings object provided
      for (const cat in newSettings) {
        if (updatedSettings[cat as keyof typeof updatedSettings]) {
          const categorySettings = newSettings[cat]
          for (const k in categorySettings) {
            const oldValue = (updatedSettings[cat as keyof typeof updatedSettings] as any)?.[k]
            const newValue = categorySettings[k]
            
            if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
              changes.push({ category: cat, key: k, oldValue, newValue })
            }
          }
          updatedSettings = {
            ...updatedSettings,
            [cat]: { ...(updatedSettings[cat as keyof typeof updatedSettings] as any), ...categorySettings }
          }
        }
      }
    } else if (category && key !== undefined) {
      // Single setting update
      const oldValue = (updatedSettings[category as keyof typeof updatedSettings] as any)?.[key]
      if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
        changes.push({ category, key, oldValue, newValue: value })
      }
      updatedSettings = {
        ...updatedSettings,
        [category]: { ...(updatedSettings[category as keyof typeof updatedSettings] as any), [key]: value }
      }
    } else {
      return NextResponse.json(
        { error: "Either 'settings' object or 'category' and 'key' are required" },
        { status: 400 }
      )
    }
    
    // Save updated settings
    await saveUserSettings(userId, updatedSettings)
    
    // Log changes
    for (const change of changes) {
      const entry: SettingsChange = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        userId,
        userEmail,
        timestamp: new Date().toISOString(),
        category: change.category,
        key: change.key,
        oldValue: change.oldValue,
        newValue: change.newValue,
        source: "user",
      }
      await addChangelogEntry(entry)
    }
    
    return NextResponse.json({
      success: true,
      message: `${changes.length} setting(s) updated`,
      changes: changes.length,
      settings: updatedSettings,
      savedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error saving settings:", error)
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    )
  }
}

// DELETE - Reset settings to defaults
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const user = session.user as any
    const userId = user.id || user.email
    const userEmail = user.email || "unknown"
    
    const category = request.nextUrl.searchParams.get("category")
    
    if (category) {
      // Reset specific category
      const currentSettings = await loadUserSettings(userId)
      const defaultCat = DEFAULT_SETTINGS[category as keyof typeof DEFAULT_SETTINGS]
      
      if (!defaultCat) {
        return NextResponse.json(
          { error: `Category '${category}' not found` },
          { status: 404 }
        )
      }
      
      const updatedSettings = {
        ...currentSettings,
        [category]: defaultCat
      }
      
      await saveUserSettings(userId, updatedSettings)
      
      // Log reset
      await addChangelogEntry({
        id: `${Date.now()}-reset`,
        userId,
        userEmail,
        timestamp: new Date().toISOString(),
        category,
        key: "*",
        oldValue: (currentSettings as any)[category],
        newValue: defaultCat,
        source: "user",
      })
      
      return NextResponse.json({
        success: true,
        message: `Category '${category}' reset to defaults`,
        settings: updatedSettings,
      })
    } else {
      // Reset all settings
      await saveUserSettings(userId, DEFAULT_SETTINGS)
      
      await addChangelogEntry({
        id: `${Date.now()}-reset-all`,
        userId,
        userEmail,
        timestamp: new Date().toISOString(),
        category: "*",
        key: "*",
        oldValue: "all",
        newValue: "defaults",
        source: "user",
      })
      
      return NextResponse.json({
        success: true,
        message: "All settings reset to defaults",
        settings: DEFAULT_SETTINGS,
      })
    }
  } catch (error) {
    console.error("Error resetting settings:", error)
    return NextResponse.json(
      { error: "Failed to reset settings" },
      { status: 500 }
    )
  }
}




