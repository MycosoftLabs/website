import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

interface SupportTicketRequest {
  name: string
  email: string
  issueType: string
  subject: string
  description: string
}

export async function POST(request: Request) {
  try {
    const body: SupportTicketRequest = await request.json()

    // Validate required fields
    if (!body.name || !body.email || !body.issueType || !body.subject || !body.description) {
      return NextResponse.json(
        { error: "All fields are required" },
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

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase configuration missing")
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Insert support ticket into Supabase
    const { data, error } = await supabase
      .from("support_tickets")
      .insert([
        {
          name: body.name,
          email: body.email,
          issue_type: body.issueType,
          subject: body.subject,
          description: body.description,
          status: "open",
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) {
      console.error("Supabase insert error:", error)
      return NextResponse.json(
        { error: "Failed to create support ticket" },
        { status: 500 }
      )
    }

    // Also send to MAS for agent triage (optional)
    try {
      const masUrl = process.env.MAS_API_URL || process.env.NEXT_PUBLIC_MAS_API_URL || "http://192.168.0.188:8001"
      await fetch(`${masUrl}/api/support/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticket_id: data?.[0]?.id,
          ...body,
        }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => {
        // Fail silently - the ticket is already in Supabase
        console.log("MAS notification failed (non-critical)")
      })
    } catch {
      // Ignore MAS notification failures
    }

    return NextResponse.json(
      {
        success: true,
        ticket_id: data?.[0]?.id,
        message: "Support ticket created successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Support ticket creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve tickets (for authenticated users)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter required" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("email", email)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      console.error("Supabase query error:", error)
      return NextResponse.json(
        { error: "Failed to fetch tickets" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      tickets: data || [],
    })
  } catch (error) {
    console.error("Support ticket fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
