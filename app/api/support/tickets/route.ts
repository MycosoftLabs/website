import { NextRequest, NextResponse } from "next/server"

interface SupportTicketData {
  name: string
  email: string
  issueType: string
  description: string
}

export async function POST(request: NextRequest) {
  try {
    const body: SupportTicketData = await request.json()

    // Validate required fields
    if (!body.name || !body.email || !body.issueType || !body.description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      )
    }

    // Validate description length
    if (body.description.length < 20 || body.description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be between 20 and 2000 characters" },
        { status: 400 }
      )
    }

    // Submit to Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Insert ticket into Supabase
    const supabaseResponse = await fetch(`${supabaseUrl}/rest/v1/support_tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        issue_type: body.issueType,
        description: body.description,
        status: "open",
        created_at: new Date().toISOString(),
      }),
    })

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text()
      console.error("Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to submit support ticket" },
        { status: 500 }
      )
    }

    const ticket = await supabaseResponse.json()

    // Optionally notify MAS about the new support ticket
    const masApiUrl = process.env.MAS_API_URL
    if (masApiUrl) {
      try {
        await fetch(`${masApiUrl}/api/notifications/support-ticket`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticketId: ticket[0]?.id || "unknown",
            name: body.name,
            email: body.email,
            issueType: body.issueType,
            priority: body.issueType === "security" ? "high" : "normal",
          }),
        }).catch((err) => {
          // Don't fail the request if MAS notification fails
          console.error("Failed to notify MAS:", err)
        })
      } catch (error) {
        // Silent fail - MAS notification is optional
        console.error("MAS notification error:", error)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your support ticket has been submitted successfully. We'll get back to you within 24 hours.",
        ticketId: ticket[0]?.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Support ticket submission error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter required" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    // Fetch tickets for this email
    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/support_tickets?email=eq.${encodeURIComponent(email)}&order=created_at.desc`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    )

    if (!supabaseResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      )
    }

    const tickets = await supabaseResponse.json()

    return NextResponse.json({
      success: true,
      tickets,
    })
  } catch (error) {
    console.error("Ticket fetch error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    )
  }
}
