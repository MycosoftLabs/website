import { NextRequest, NextResponse } from "next/server"

// In production, this would use a proper database
// For now, using in-memory storage with persistence simulation
const settingsStore: Record<string, any> = {
  // System Settings
  system: {
    name: "NatureOS",
    version: "3.0.0",
    environment: "development",
    debugMode: true,
    logLevel: "info",
    timezone: "America/Los_Angeles",
    language: "en",
    autoUpdate: true,
    telemetryEnabled: true,
  },
  
  // MYCA AI Settings
  myca: {
    enabled: true,
    model: "gpt-4-turbo-preview",
    temperature: 0.7,
    maxTokens: 4096,
    learningEnabled: true,
    voiceEnabled: true,
    voiceId: "myca-voice-1",
    autoResponse: true,
    contextMemory: 50,
    trainingDataCollection: true,
    approvalRequired: {
      codeExecution: true,
      systemChanges: true,
      integrations: true,
      deviceControl: false,
    },
  },
  
  // Integration Settings
  integrations: {
    n8n: {
      enabled: true,
      localUrl: "http://localhost:5678",
      cloudUrl: "https://mycosoft.app.n8n.cloud",
      useCloud: false,
      apiKey: "",
      webhookSecret: "",
    },
    openai: {
      enabled: true,
      apiKey: "",
      organization: "",
      model: "gpt-4-turbo-preview",
    },
    elevenlabs: {
      enabled: true,
      apiKey: "",
      voiceId: "myca-default",
    },
    anthropic: {
      enabled: false,
      apiKey: "",
      model: "claude-3-opus-20240229",
    },
    google: {
      enabled: true,
      mapsApiKey: "",
      driveEnabled: true,
      calendarEnabled: true,
    },
  },
  
  // Device Network Settings
  devices: {
    autoDiscovery: true,
    scanInterval: 30,
    offlineThreshold: 300,
    mycoBrainEnabled: true,
    loraFrequency: 915.0,
    meshNetworkEnabled: true,
    telemetryInterval: 60,
  },
  
  // Security Settings
  security: {
    mfaEnabled: false,
    sessionTimeout: 3600,
    apiRateLimit: 100,
    corsOrigins: ["http://localhost:3000"],
    encryptionEnabled: true,
    auditLogging: true,
  },
  
  // Notification Settings
  notifications: {
    email: {
      enabled: false,
      address: "",
      digestFrequency: "daily",
    },
    push: {
      enabled: true,
      critical: true,
      warnings: true,
      info: false,
    },
    slack: {
      enabled: false,
      webhookUrl: "",
      channel: "#alerts",
    },
  },
  
  // Storage Settings
  storage: {
    primaryBackend: "local",
    localPath: "/data/natureos",
    cloudSync: false,
    compressionEnabled: true,
    retentionDays: 90,
    maxStorageGb: 100,
  },
  
  // Shell Settings
  shell: {
    theme: "dark",
    fontSize: 14,
    fontFamily: "JetBrains Mono",
    historySize: 1000,
    autocomplete: true,
    syntaxHighlighting: true,
    aiAssist: true,
  },
}

// Change log for MYCA training
const changeLog: Array<{
  id: string
  timestamp: string
  category: string
  key: string
  oldValue: any
  newValue: any
  source: "user" | "myca" | "system" | "api"
  userId?: string
  approved: boolean
  approvedBy?: string
  appliedAt?: string
}> = []

// Pending changes awaiting approval
const pendingChanges: Map<string, any> = new Map()

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category")
  const includeLog = request.nextUrl.searchParams.get("includeLog") === "true"
  const logLimit = parseInt(request.nextUrl.searchParams.get("logLimit") || "50")
  
  const response: any = {}
  
  if (category) {
    response.settings = settingsStore[category] || null
  } else {
    response.settings = settingsStore
  }
  
  if (includeLog) {
    response.changeLog = changeLog.slice(-logLimit).reverse()
  }
  
  response.pendingChanges = Array.from(pendingChanges.entries()).map(([id, change]) => ({
    id,
    ...change,
  }))
  
  return NextResponse.json(response)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, key, value, source = "user", userId, requireApproval = false } = body
    
    if (!category || !key) {
      return NextResponse.json(
        { error: "Category and key are required" },
        { status: 400 }
      )
    }
    
    // Get current value
    const currentSettings = settingsStore[category]
    if (!currentSettings) {
      return NextResponse.json(
        { error: `Category '${category}' not found` },
        { status: 404 }
      )
    }
    
    const oldValue = getNestedValue(currentSettings, key)
    
    // Check if approval is required
    const needsApproval = requireApproval || 
      (category === "security") ||
      (category === "myca" && key.includes("approvalRequired")) ||
      (category === "integrations" && key.includes("apiKey"))
    
    const changeId = `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    
    if (needsApproval && source !== "system") {
      // Store as pending change
      pendingChanges.set(changeId, {
        category,
        key,
        oldValue,
        newValue: value,
        source,
        userId,
        requestedAt: new Date().toISOString(),
        approved: false,
      })
      
      // Log the pending change for MYCA
      await logToMyca({
        type: "setting_change_pending",
        category,
        key,
        oldValue,
        newValue: value,
        source,
        changeId,
      })
      
      return NextResponse.json({
        success: true,
        requiresApproval: true,
        changeId,
        message: `Change to ${category}.${key} requires approval`,
      })
    }
    
    // Apply the change
    setNestedValue(currentSettings, key, value)
    
    // Log the change
    const logEntry = {
      id: changeId,
      timestamp: new Date().toISOString(),
      category,
      key,
      oldValue,
      newValue: value,
      source: source as "user" | "myca" | "system" | "api",
      userId,
      approved: true,
      appliedAt: new Date().toISOString(),
    }
    changeLog.push(logEntry)
    
    // Send to MYCA for training
    await logToMyca({
      type: "setting_changed",
      ...logEntry,
    })
    
    // Notify shell/subscribers via webhook (simulated)
    await notifySubscribers({
      event: "settings_changed",
      ...logEntry,
    })
    
    return NextResponse.json({
      success: true,
      changeId,
      category,
      key,
      oldValue,
      newValue: value,
      appliedAt: logEntry.appliedAt,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update setting" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { changeId, action, approvedBy } = body
    
    if (!changeId || !action) {
      return NextResponse.json(
        { error: "changeId and action are required" },
        { status: 400 }
      )
    }
    
    const pendingChange = pendingChanges.get(changeId)
    if (!pendingChange) {
      return NextResponse.json(
        { error: "Pending change not found" },
        { status: 404 }
      )
    }
    
    if (action === "approve") {
      // Apply the change
      const currentSettings = settingsStore[pendingChange.category]
      setNestedValue(currentSettings, pendingChange.key, pendingChange.newValue)
      
      // Log the approved change
      const logEntry = {
        id: changeId,
        timestamp: pendingChange.requestedAt,
        category: pendingChange.category,
        key: pendingChange.key,
        oldValue: pendingChange.oldValue,
        newValue: pendingChange.newValue,
        source: pendingChange.source,
        userId: pendingChange.userId,
        approved: true,
        approvedBy,
        appliedAt: new Date().toISOString(),
      }
      changeLog.push(logEntry)
      
      // Remove from pending
      pendingChanges.delete(changeId)
      
      // Notify MYCA
      await logToMyca({
        type: "setting_change_approved",
        ...logEntry,
      })
      
      return NextResponse.json({
        success: true,
        action: "approved",
        changeId,
        appliedAt: logEntry.appliedAt,
      })
    } else if (action === "reject") {
      // Log rejection for MYCA learning
      await logToMyca({
        type: "setting_change_rejected",
        changeId,
        ...pendingChange,
        rejectedBy: approvedBy,
        rejectedAt: new Date().toISOString(),
      })
      
      pendingChanges.delete(changeId)
      
      return NextResponse.json({
        success: true,
        action: "rejected",
        changeId,
      })
    }
    
    return NextResponse.json(
      { error: "Invalid action. Use 'approve' or 'reject'" },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process approval" },
      { status: 500 }
    )
  }
}

// Helper functions
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((acc, part) => acc?.[part], obj)
}

function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split(".")
  const last = parts.pop()!
  const target = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {}
    return acc[part]
  }, obj)
  target[last] = value
}

async function logToMyca(data: any): Promise<void> {
  try {
    // Log to MYCA training API
    await fetch("http://localhost:3000/api/myca/training", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "settings_interaction",
        input: JSON.stringify(data),
        output: data.type,
        context: "natureos-settings",
        timestamp: new Date().toISOString(),
        source: "natureos-settings",
        metadata: data,
      }),
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // MYCA training API not available
  }
}

async function notifySubscribers(data: any): Promise<void> {
  // In production, this would use WebSockets or Server-Sent Events
  // For now, we store notifications that can be polled
  console.log("[Settings] Notification:", data.event, data.category, data.key)
}
