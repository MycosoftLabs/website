import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Default settings used when no user settings exist yet
const DEFAULT_SETTINGS: Record<string, Record<string, unknown>> = {
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
      model: "claude-opus-4-6",
    },
    google: {
      enabled: true,
      mapsApiKey: "",
      driveEnabled: true,
      calendarEnabled: true,
    },
  },
  devices: {
    autoDiscovery: true,
    scanInterval: 30,
    offlineThreshold: 300,
    mycoBrainEnabled: true,
    loraFrequency: 915.0,
    meshNetworkEnabled: true,
    telemetryInterval: 60,
  },
  security: {
    mfaEnabled: false,
    sessionTimeout: 3600,
    apiRateLimit: 100,
    corsOrigins: ["http://localhost:3000"],
    encryptionEnabled: true,
    auditLogging: true,
  },
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
  storage: {
    primaryBackend: "local",
    localPath: "/data/natureos",
    cloudSync: false,
    compressionEnabled: true,
    retentionDays: 90,
    maxStorageGb: 100,
  },
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

// ─── Supabase helpers ────────────────────────────────────────────────

async function getUserSettings(userId: string): Promise<Record<string, Record<string, unknown>>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_app_state")
    .select("tool_states")
    .eq("user_id", userId)
    .single()

  const saved = data?.tool_states?.natureos_settings as Record<string, Record<string, unknown>> | undefined
  if (!saved) return deepClone(DEFAULT_SETTINGS)

  // Merge saved over defaults to ensure all keys exist
  const merged: Record<string, Record<string, unknown>> = {}
  for (const cat of Object.keys(DEFAULT_SETTINGS)) {
    merged[cat] = { ...DEFAULT_SETTINGS[cat], ...(saved[cat] || {}) }
  }
  return merged
}

async function saveUserSettings(userId: string, settings: Record<string, Record<string, unknown>>): Promise<void> {
  const supabase = await createClient()

  // Try upsert: update tool_states.natureos_settings
  const { data: existing } = await supabase
    .from("user_app_state")
    .select("id, tool_states")
    .eq("user_id", userId)
    .single()

  if (existing) {
    const updatedStates = { ...(existing.tool_states || {}), natureos_settings: settings }
    await supabase
      .from("user_app_state")
      .update({ tool_states: updatedStates })
      .eq("user_id", userId)
  } else {
    await supabase
      .from("user_app_state")
      .insert({
        user_id: userId,
        tool_states: { natureos_settings: settings },
      })
  }
}

async function getChangelog(userId: string, limit: number): Promise<unknown[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("user_app_state")
    .select("tool_states")
    .eq("user_id", userId)
    .single()

  const log = (data?.tool_states?.natureos_settings_changelog || []) as unknown[]
  return log.slice(-limit).reverse()
}

async function appendChangelog(userId: string, entry: Record<string, unknown>): Promise<void> {
  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("user_app_state")
    .select("tool_states")
    .eq("user_id", userId)
    .single()

  const states = existing?.tool_states || {}
  const log = (states.natureos_settings_changelog || []) as unknown[]
  log.push(entry)
  // Keep last 200 entries
  const trimmed = log.slice(-200)
  states.natureos_settings_changelog = trimmed

  if (existing) {
    await supabase.from("user_app_state").update({ tool_states: states }).eq("user_id", userId)
  } else {
    await supabase.from("user_app_state").insert({ user_id: userId, tool_states: states })
  }
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// ─── GET ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If not authenticated, return defaults (read-only)
  const userId = user?.id
  const settings = userId ? await getUserSettings(userId) : deepClone(DEFAULT_SETTINGS)

  const includeLog = request.nextUrl.searchParams.get("includeLog") === "true"
  const logLimit = parseInt(request.nextUrl.searchParams.get("logLimit") || "50")

  const response: Record<string, unknown> = { settings }

  if (includeLog && userId) {
    response.changeLog = await getChangelog(userId, logLimit)
  }

  response.pendingChanges = []
  response.authenticated = !!userId

  return NextResponse.json(response)
}

// ─── POST ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required to save settings" }, { status: 401 })
    }

    const body = await request.json()
    const { category, key, value, source = "user", requireApproval = false } = body

    if (!category || !key) {
      return NextResponse.json({ error: "Category and key are required" }, { status: 400 })
    }

    const settings = await getUserSettings(user.id)
    if (!settings[category]) {
      return NextResponse.json({ error: `Category '${category}' not found` }, { status: 404 })
    }

    const oldValue = getNestedValue(settings[category], key)
    const changeId = `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    // Apply the change
    setNestedValue(settings[category], key, value)
    await saveUserSettings(user.id, settings)

    // Log the change
    const logEntry = {
      id: changeId,
      timestamp: new Date().toISOString(),
      category,
      key,
      oldValue,
      newValue: value,
      source,
      approved: true,
      appliedAt: new Date().toISOString(),
    }
    await appendChangelog(user.id, logEntry)

    // Notify MYCA for training (non-blocking)
    logToMyca({
      type: "setting_changed",
      ...logEntry,
    }).catch(() => {})

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

// ─── PUT (approve/reject) ────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { changeId, action } = body

    if (!changeId || !action) {
      return NextResponse.json({ error: "changeId and action are required" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      action,
      changeId,
      message: `Change ${action}d`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process approval" },
      { status: 500 }
    )
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".")
  const last = parts.pop()!
  const target = parts.reduce((acc: Record<string, unknown>, part) => {
    if (!acc[part] || typeof acc[part] !== "object") acc[part] = {}
    return acc[part] as Record<string, unknown>
  }, obj)
  target[last] = value
}

async function logToMyca(data: Record<string, unknown>): Promise<void> {
  try {
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
