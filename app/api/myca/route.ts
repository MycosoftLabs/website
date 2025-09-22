import { type NextRequest, NextResponse } from "next/server"

// Mock MYCA AI responses for demonstration
const mockResponses = [
  "Based on the morphological characteristics you've described, this appears to be from the Agaricus genus. The brown spore print and ring on the stem are key identifying features.",
  "The spore count data shows typical seasonal patterns for temperate regions. Peak dispersal usually occurs during autumn months when humidity levels are optimal.",
  "Current network status shows 847 active monitoring stations across North America. All systems are operational with 99.2% uptime this month.",
  "The mycorrhizal connections you're observing indicate a healthy forest ecosystem. These symbiotic relationships are crucial for nutrient exchange.",
  "Recent discoveries in our database include 23 new species documented this quarter, with particularly interesting finds in tropical regions.",
]

const mockSuggestions = [
  "What species are currently active in the network?",
  "Show me the latest spore count data",
  "How is the monitoring system performing?",
  "Explain mycorrhizal network connections",
  "What are the recent species discoveries?",
  "Help me identify this mushroom specimen",
  "What's the current environmental data?",
  "Show me cultivation best practices",
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action === "suggestions") {
    return NextResponse.json({
      suggestions: mockSuggestions.slice(0, 4),
      timestamp: new Date().toISOString(),
    })
  }

  if (action === "context") {
    return NextResponse.json({
      status: "operational",
      activeNodes: 847,
      systemHealth: 99.2,
      lastUpdate: new Date().toISOString(),
    })
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
    const { question, context, userId } = await request.json()

    if (!question) {
      return NextResponse.json(
        {
          error: "Question is required",
        },
        { status: 400 },
      )
    }

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Select a contextual response based on keywords
    let response = mockResponses[0] // default
    const lowerQuestion = question.toLowerCase()

    if (lowerQuestion.includes("spore") || lowerQuestion.includes("count")) {
      response = mockResponses[1]
    } else if (
      lowerQuestion.includes("network") ||
      lowerQuestion.includes("status") ||
      lowerQuestion.includes("system")
    ) {
      response = mockResponses[2]
    } else if (lowerQuestion.includes("mycorrhiz") || lowerQuestion.includes("connection")) {
      response = mockResponses[3]
    } else if (
      lowerQuestion.includes("discover") ||
      lowerQuestion.includes("new") ||
      lowerQuestion.includes("recent")
    ) {
      response = mockResponses[4]
    }

    // Generate relevant follow-up suggestions
    const relevantSuggestions = mockSuggestions
      .filter((s) => !s.toLowerCase().includes(lowerQuestion.split(" ")[0]))
      .slice(0, 3)

    return NextResponse.json({
      answer: response,
      confidence: 0.85 + Math.random() * 0.1, // 85-95%
      sources: ["MINDEX Database", "NatureOS Network", "Field Observations"],
      suggestedQuestions: relevantSuggestions,
      timestamp: new Date().toISOString(),
      fallback: false,
    })
  } catch (error) {
    console.error("MYCA API error:", error)

    return NextResponse.json({
      answer:
        "I'm experiencing some technical difficulties right now. Please try your question again in a moment, or contact our support team if the issue persists.",
      confidence: 0.0,
      sources: [],
      suggestedQuestions: mockSuggestions.slice(0, 3),
      timestamp: new Date().toISOString(),
      fallback: true,
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { action, conversationId, feedback } = await request.json()

    if (action === "feedback") {
      // Log feedback for improvement (in a real app, this would go to a database)
      console.log("User feedback received:", {
        conversationId,
        feedback,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        success: true,
        message: "Feedback recorded successfully",
      })
    }

    return NextResponse.json(
      {
        error: "Invalid action",
      },
      { status: 400 },
    )
  } catch (error) {
    console.error("MYCA feedback error:", error)
    return NextResponse.json(
      {
        error: "Failed to process feedback",
      },
      { status: 500 },
    )
  }
}
