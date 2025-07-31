import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const systemPrompt = `You are Myca, an AI assistant specialized in mycology and fungal research. You have extensive knowledge about:

- Fungal biology, taxonomy, and identification
- Mushroom cultivation and foraging
- Mycological research methods and techniques
- Fungal ecology and environmental interactions
- Biotechnology applications of fungi
- Safety considerations for mushroom identification
- Current research in mycology

You should provide accurate, helpful information while always emphasizing safety when it comes to mushroom identification and consumption. If you're unsure about something, especially regarding edibility or toxicity, always err on the side of caution and recommend consulting experts or field guides.

Context from the conversation: ${context || "None"}

Respond in a helpful, knowledgeable, and safety-conscious manner.`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      prompt: message,
      maxTokens: 1000,
      temperature: 0.7,
    })

    return NextResponse.json({
      success: true,
      response: text,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Myca AI error:", error)

    // Fallback response
    const fallbackResponses = [
      "I'm having trouble processing your request right now. Could you try rephrasing your question about fungi or mycology?",
      "My systems are experiencing some difficulty. In the meantime, I'd recommend consulting a field guide or mycology expert for specific identification questions.",
      "I'm currently unable to provide a detailed response. For safety reasons, please consult multiple reliable sources when identifying mushrooms.",
    ]

    const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]

    return NextResponse.json({
      success: true,
      response: fallbackResponse,
      timestamp: new Date().toISOString(),
      fallback: true,
    })
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Myca AI",
    description: "AI assistant specialized in mycology and fungal research",
    version: "1.0.0",
    capabilities: [
      "Fungal identification assistance",
      "Mycological research support",
      "Cultivation guidance",
      "Safety recommendations",
      "Ecological information",
    ],
    status: "operational",
  })
}
