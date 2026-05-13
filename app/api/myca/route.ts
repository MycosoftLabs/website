import { type NextRequest, NextResponse } from "next/server"
import { assertScopedMasUserId, masHttpBaseUrl, masJsonHeaders } from "@/lib/myca/scoped-mas-user"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "suggestions") {
    try {
      const MAS_BASE = masHttpBaseUrl()
      const built = new URL(`${MAS_BASE}/api/myca/suggestions`)
      const sessionId = searchParams.get("session_id")
      if (sessionId) built.searchParams.set("session_id", sessionId)
      const scope = await assertScopedMasUserId(searchParams.get("user_id"))
      if ("denied" in scope) return scope.denied
      built.searchParams.set("user_id", scope.scopedUserId)

      const res = await fetch(built.toString(), {
        headers: masJsonHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        return NextResponse.json(
          {
            suggestions: [] as string[],
            timestamp: new Date().toISOString(),
            error: `MAS returned ${res.status}; configure MAS for live suggestions.`,
          },
          { status: 200 }
        )
      }
      const data = await res.json()
      const suggestions = Array.isArray(data?.suggestions)
        ? data.suggestions
        : Array.isArray(data)
          ? data
          : data?.items || []
      return NextResponse.json({
        suggestions,
        timestamp: new Date().toISOString(),
      })
    } catch {
      return NextResponse.json(
        {
          suggestions: [] as string[],
          timestamp: new Date().toISOString(),
          error: "Suggestions require a reachable MAS instance.",
        },
        { status: 200 }
      )
    }
  }

  if (action === "context") {
    try {
      const MAS_BASE = masHttpBaseUrl()
      const health = await fetch(`${MAS_BASE}/health`, {
        headers: masJsonHeaders(),
        signal: AbortSignal.timeout(3000),
      }).catch(() => null)
      return NextResponse.json({
        status: health?.ok ? "operational" : "degraded",
        masReachable: Boolean(health?.ok),
        lastChecked: new Date().toISOString(),
      })
    } catch {
      return NextResponse.json({
        status: "unknown",
        masReachable: false,
        lastChecked: new Date().toISOString(),
      })
    }
  }

  return NextResponse.json({
    name: "MYCA AI Assistant",
    description: "Mycological Intelligence and Analysis System",
    version: "2.1.0",
    capabilities: [
      "Species identification assistance",
      "Spore monitoring analysis",
      "Network status reporting",
      "Research data interpretation",
      "Cultivation guidance",
    ],
    status: "operational",
  })
}

export async function POST(request: NextRequest) {
  try {
    const { question, context, userId: bodyUserId, session_id, conversation_id } = await request.json()

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 })
    }

    const scope = await assertScopedMasUserId(
      typeof bodyUserId === "string" && bodyUserId.trim() ? bodyUserId.trim() : null
    )
    if ("denied" in scope) return scope.denied

    const message = context ? `${question}\n\n[Context: ${context}]` : String(question)
    const MAS_BASE = masHttpBaseUrl()

    const res = await fetch(`${MAS_BASE}/api/myca/chat`, {
      method: "POST",
      headers: masJsonHeaders(),
      body: JSON.stringify({
        message,
        user_id: scope.scopedUserId,
        session_id: session_id || `myca-rest-${Date.now()}`,
        conversation_id,
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return NextResponse.json(
        {
          answer: "",
          confidence: 0,
          sources: [],
          suggestedQuestions: [],
          timestamp: new Date().toISOString(),
          error: `MAS chat failed (${res.status}): ${errText || "no body"}`,
        },
        { status: 502 }
      )
    }

    const data = await res.json()
    const answer = data.message || data.response || data.content || ""

    return NextResponse.json({
      answer: typeof answer === "string" ? answer : String(answer),
      confidence: typeof data.confidence === "number" ? data.confidence : 0.85,
      sources: data.sources || [],
      suggestedQuestions: data.suggested_questions || data.suggestedQuestions || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("MYCA API error:", error)

    return NextResponse.json(
      {
        answer: "",
        confidence: 0,
        sources: [],
        suggestedQuestions: [],
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { action, conversationId, feedback } = await request.json()

    if (action === "feedback") {
      const scope = await assertScopedMasUserId(null)
      if ("denied" in scope) return scope.denied

      console.log("User feedback received:", {
        conversationId,
        feedback,
        user_id: scope.scopedUserId,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        message: "Feedback recorded successfully",
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("MYCA feedback error:", error)
    return NextResponse.json({ error: "Failed to process feedback" }, { status: 500 })
  }
}
