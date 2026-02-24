/**
 * MYCA Query API - NatureOS-compatible endpoint
 *
 * Accepts NatureOS MycaAPI format and proxies to MAS consciousness chat.
 * Enables NatureOS components to use website MAS instead of Azure.
 *
 * Created: Feb 17, 2026
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question, context, userId } = body

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json(
        { error: "question is required and must be a non-empty string" },
        { status: 400 }
      )
    }

    const message = context ? `${question}\n\n[Context: ${context}]` : question.trim()

    const res = await fetch(`${MAS_API_URL}/api/myca/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        user_id: userId || "anonymous",
        session_id: body.session_id || `natureos-${Date.now()}`,
        conversation_id: body.conversation_id,
      }),
      signal: AbortSignal.timeout(20000),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json(
        { error: `MAS chat failed: ${err}`, answer: "", confidence: 0, timestamp: new Date().toISOString() },
        { status: 502 }
      )
    }

    const data = await res.json()
    const answer = data.message || data.response || data.content || ""
    const confidence = typeof data.confidence === "number" ? data.confidence : 0.85

    return NextResponse.json({
      answer: typeof answer === "string" ? answer : String(answer),
      confidence,
      timestamp: new Date().toISOString(),
      suggestedQuestions: data.suggested_questions || data.suggestedQuestions || [],
      sources: data.sources || [],
    })
  } catch (error) {
    console.error("MYCA query error:", error)
    return NextResponse.json(
      {
        answer: "",
        confidence: 0,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
