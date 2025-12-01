import { type NextRequest, NextResponse } from "next/server"
import { natureOSAPI } from "@/lib/services/natureos-api"

export async function POST(request: NextRequest) {
  let body: { question?: string; context?: any; action?: string; conversationId?: string; feedback?: any }

  try {
    body = await request.json()
    const { question, context, action, conversationId, feedback } = body

    // Handle different actions
    switch (action) {
      case "query":
        if (!question) {
          return NextResponse.json({ error: "Question is required" }, { status: 400 })
        }

        const queryResponse = await natureOSAPI.queryMYCA(question, context)

        if (!queryResponse.success) {
          // Fallback response when MYCA is unavailable
          const fallbackResponse = generateFallbackResponse(question)
          return NextResponse.json(fallbackResponse)
        }

        return NextResponse.json(queryResponse.data)

      case "feedback":
        // Note: Backend doesn't support feedback endpoint yet
        // Log locally for now
        console.log("[v0] MYCA feedback received:", { conversationId, feedback })
        return NextResponse.json({ success: true, message: "Feedback recorded locally" })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("[v0] MYCA API error:", error)
    const fallbackResponse = generateFallbackResponse(body?.question || "general inquiry")
    return NextResponse.json(fallbackResponse)
  }
}

function generateFallbackResponse(question: string) {
  return {
    answer:
      "I'm currently experiencing connectivity issues with the MYCA AI system. However, I can help you explore our fungal database, search for species, or browse research papers. Please try your question again in a moment, or visit our species directory for detailed information.",
    sources: [
      { title: "Species Directory", url: "/species" },
      { title: "Research Papers", url: "/papers" },
      { title: "Mushroom Database", url: "/mushrooms" },
    ],
    confidence: 0.5,
    timestamp: new Date().toISOString(),
    fallback: true,
  }
}

// Suggested questions endpoint
export async function GET(request: NextRequest) {
  try {
    const dashboardResponse = await natureOSAPI.getDashboardData()

    const suggestions = [
      "What are the most common edible mushrooms?",
      "Tell me about lion's mane mushroom benefits",
      "How do I identify poisonous mushrooms?",
      "What is the role of mycelium in ecosystems?",
    ]

    // Add contextual suggestions based on dashboard data
    if (dashboardResponse.success && dashboardResponse.data) {
      const data = dashboardResponse.data as any
      if (data.Insights?.TrendingCompounds?.length > 0) {
        suggestions.unshift(`Tell me about ${data.Insights.TrendingCompounds[0]}`)
      }
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("[v0] Suggestions error:", error)
    return NextResponse.json({
      suggestions: ["Search for mushroom species", "Browse research papers", "Explore fungal compounds"],
    })
  }
}
