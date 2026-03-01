import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { NextRequest, NextResponse } from "next/server"

import { recordUsageFromRequest } from "@/lib/usage/record-api-usage"

interface ChatMessage {
  role: string
  content: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages must be a non-empty array" },
        { status: 400 }
      )
    }

    for (const msg of messages) {
      if (typeof msg?.content !== "string") {
        return NextResponse.json(
          { error: "Each message must have a string content field" },
          { status: 400 }
        )
      }
    }

    const prompt = messages
      .map((message: ChatMessage) => message.content)
      .join("\n")

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `You are Myca AI, an expert mycology research assistant.\n${prompt}`,
    })

    await recordUsageFromRequest({
      request: req,
      usageType: "AI_QUERY",
      quantity: 1,
      metadata: { model: "gpt-4o" },
    })

    return new Response(text)
  } catch (error) {
    console.error("AI route error:", error)
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
