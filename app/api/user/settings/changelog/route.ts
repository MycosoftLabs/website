/**
 * Settings Changelog API
 * 
 * View history of all settings changes for the authenticated user
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import fs from "fs/promises"
import path from "path"

const CHANGELOG_FILE = path.join(process.cwd(), ".data", "settings-changelog.json")

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

async function loadChangelog(): Promise<SettingsChange[]> {
  try {
    const data = await fs.readFile(CHANGELOG_FILE, "utf-8")
    return JSON.parse(data)
  } catch {
    return []
  }
}

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
    const isAdmin = user.role === "owner" || user.role === "admin" || user.isAdmin
    
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100")
    const category = request.nextUrl.searchParams.get("category")
    const allUsers = request.nextUrl.searchParams.get("allUsers") === "true" && isAdmin
    
    let changelog = await loadChangelog()
    
    // Filter by user unless admin requesting all
    if (!allUsers) {
      changelog = changelog.filter(c => c.userId === userId)
    }
    
    // Filter by category if specified
    if (category) {
      changelog = changelog.filter(c => c.category === category)
    }
    
    // Sort by timestamp descending and limit
    changelog = changelog
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
    
    return NextResponse.json({
      success: true,
      changelog,
      total: changelog.length,
      isAdmin,
    })
  } catch (error) {
    console.error("Error loading changelog:", error)
    return NextResponse.json(
      { error: "Failed to load changelog" },
      { status: 500 }
    )
  }
}





