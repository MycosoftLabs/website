import { NextRequest, NextResponse } from "next/server"

// In production, this would write to a database
const trainingLog: any[] = []

interface TrainingData {
  type: string
  input: string
  output: string
  context: string
  timestamp: string
  source: string
  userId?: string
  feedback?: string
  metadata?: Record<string, any>
}

// Store training data
export async function POST(request: NextRequest) {
  try {
    const data: TrainingData = await request.json()
    
    // Add to in-memory log (in production, store in database)
    trainingLog.push({
      ...data,
      id: `train-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      receivedAt: new Date().toISOString(),
    })

    // Keep only last 1000 entries in memory
    if (trainingLog.length > 1000) {
      trainingLog.shift()
    }

    // Forward to MAS for actual training if available
    try {
      const MAS_API_URL = process.env.MAS_API_URL || "http://host.docker.internal:8000"
      await fetch(`${MAS_API_URL}/api/training/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      // MAS not available, data is still stored locally
    }

    return NextResponse.json({
      success: true,
      message: "Training data logged",
      id: trainingLog[trainingLog.length - 1].id,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to log training data" },
      { status: 500 }
    )
  }
}

// Get training statistics
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")
  
  let filtered = trainingLog
  if (type) {
    filtered = trainingLog.filter(t => t.type === type)
  }

  // Calculate statistics
  const stats = {
    totalInteractions: trainingLog.length,
    byType: {
      ai_response: trainingLog.filter(t => t.type === "ai_response").length,
      code_generation: trainingLog.filter(t => t.context?.includes("code")).length,
      debugging: trainingLog.filter(t => t.context === "debugging").length,
      user_feedback: trainingLog.filter(t => t.type === "user_feedback").length,
      sdk_usage: trainingLog.filter(t => t.source === "sdk").length,
    },
    bySource: {
      shell: trainingLog.filter(t => t.source === "natureos-shell").length,
      sdk: trainingLog.filter(t => t.source === "sdk").length,
      api: trainingLog.filter(t => t.source === "api-explorer").length,
      functions: trainingLog.filter(t => t.source === "functions").length,
    },
    recentInteractions: filtered.slice(-20).reverse(),
    lastTraining: trainingLog.length > 0 ? trainingLog[trainingLog.length - 1].receivedAt : null,
  }

  return NextResponse.json(stats)
}
