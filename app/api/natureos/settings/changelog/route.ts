import { NextRequest, NextResponse } from "next/server"

// Shared change log storage (in production, use database)
// This is imported from the main settings route conceptually
// For now, we maintain a separate log for the changelog endpoint
const systemChangeLog: Array<{
  id: string
  timestamp: string
  category: string
  key: string
  oldValue: any
  newValue: any
  source: "user" | "myca" | "system" | "api" | "shell"
  userId?: string
  approved: boolean
  approvedBy?: string
  appliedAt?: string
  description?: string
  impact?: "low" | "medium" | "high" | "critical"
}> = []

// Initialize with some example historical changes
if (systemChangeLog.length === 0) {
  const now = Date.now()
  systemChangeLog.push(
    {
      id: "init-001",
      timestamp: new Date(now - 86400000 * 7).toISOString(),
      category: "system",
      key: "debugMode",
      oldValue: false,
      newValue: true,
      source: "user",
      approved: true,
      appliedAt: new Date(now - 86400000 * 7).toISOString(),
      description: "Enabled debug mode for development",
      impact: "low",
    },
    {
      id: "init-002",
      timestamp: new Date(now - 86400000 * 5).toISOString(),
      category: "myca",
      key: "learningEnabled",
      oldValue: false,
      newValue: true,
      source: "system",
      approved: true,
      appliedAt: new Date(now - 86400000 * 5).toISOString(),
      description: "MYCA learning mode activated",
      impact: "medium",
    },
    {
      id: "init-003",
      timestamp: new Date(now - 86400000 * 3).toISOString(),
      category: "integrations",
      key: "n8n.enabled",
      oldValue: false,
      newValue: true,
      source: "user",
      approved: true,
      appliedAt: new Date(now - 86400000 * 3).toISOString(),
      description: "Connected n8n workflow automation",
      impact: "medium",
    },
    {
      id: "init-004",
      timestamp: new Date(now - 86400000 * 2).toISOString(),
      category: "devices",
      key: "autoDiscovery",
      oldValue: false,
      newValue: true,
      source: "myca",
      approved: true,
      approvedBy: "admin",
      appliedAt: new Date(now - 86400000 * 2).toISOString(),
      description: "MYCA enabled auto-discovery for device network optimization",
      impact: "medium",
    },
    {
      id: "init-005",
      timestamp: new Date(now - 86400000).toISOString(),
      category: "security",
      key: "auditLogging",
      oldValue: false,
      newValue: true,
      source: "system",
      approved: true,
      appliedAt: new Date(now - 86400000).toISOString(),
      description: "Security audit logging enabled",
      impact: "high",
    }
  )
}

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100")
  const category = request.nextUrl.searchParams.get("category")
  const source = request.nextUrl.searchParams.get("source")
  const since = request.nextUrl.searchParams.get("since")
  const format = request.nextUrl.searchParams.get("format") || "json"
  
  let filtered = [...systemChangeLog]
  
  if (category) {
    filtered = filtered.filter(log => log.category === category)
  }
  
  if (source) {
    filtered = filtered.filter(log => log.source === source)
  }
  
  if (since) {
    const sinceDate = new Date(since)
    filtered = filtered.filter(log => new Date(log.timestamp) > sinceDate)
  }
  
  // Sort by timestamp descending (most recent first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  // Apply limit
  filtered = filtered.slice(0, limit)
  
  // Calculate statistics
  const stats = {
    totalChanges: systemChangeLog.length,
    byCategory: {} as Record<string, number>,
    bySource: {} as Record<string, number>,
    byImpact: {} as Record<string, number>,
    last24Hours: systemChangeLog.filter(
      log => new Date(log.timestamp) > new Date(Date.now() - 86400000)
    ).length,
    mycaChanges: systemChangeLog.filter(log => log.source === "myca").length,
    pendingApprovals: 0, // Would come from pending changes
  }
  
  systemChangeLog.forEach(log => {
    stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1
    stats.bySource[log.source] = (stats.bySource[log.source] || 0) + 1
    if (log.impact) {
      stats.byImpact[log.impact] = (stats.byImpact[log.impact] || 0) + 1
    }
  })
  
  if (format === "training") {
    // Format for MYCA training
    const trainingData = filtered.map(log => ({
      input: `User changed ${log.category}.${log.key} from ${JSON.stringify(log.oldValue)} to ${JSON.stringify(log.newValue)}`,
      output: log.description || `Setting ${log.key} updated`,
      context: `settings-change-${log.category}`,
      metadata: {
        category: log.category,
        key: log.key,
        source: log.source,
        impact: log.impact,
        timestamp: log.timestamp,
      },
    }))
    
    return NextResponse.json({ trainingData, count: trainingData.length })
  }
  
  return NextResponse.json({
    changes: filtered,
    stats,
    hasMore: systemChangeLog.length > limit,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      category,
      key,
      oldValue,
      newValue,
      source = "api",
      userId,
      description,
      impact = "low",
    } = body
    
    const logEntry = {
      id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      category,
      key,
      oldValue,
      newValue,
      source: source as "user" | "myca" | "system" | "api" | "shell",
      userId,
      approved: true,
      appliedAt: new Date().toISOString(),
      description,
      impact: impact as "low" | "medium" | "high" | "critical",
    }
    
    systemChangeLog.push(logEntry)
    
    // Keep only last 10000 entries
    if (systemChangeLog.length > 10000) {
      systemChangeLog.shift()
    }
    
    // Forward to MYCA training
    try {
      await fetch("http://localhost:3000/api/myca/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "settings_change",
          input: `Changed ${category}.${key} from ${JSON.stringify(oldValue)} to ${JSON.stringify(newValue)}`,
          output: description || `Setting updated: ${category}.${key}`,
          context: "settings-changelog",
          timestamp: logEntry.timestamp,
          source: "natureos-settings",
          metadata: logEntry,
        }),
        signal: AbortSignal.timeout(3000),
      })
    } catch {
      // Training API not available
    }
    
    return NextResponse.json({
      success: true,
      id: logEntry.id,
      timestamp: logEntry.timestamp,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log change" },
      { status: 500 }
    )
  }
}
