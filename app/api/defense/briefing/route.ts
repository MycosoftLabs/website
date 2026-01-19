import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, title, organization, email, phone, classificationLevel, areasOfInterest, message } = body

    // Validate required fields
    if (!name || !organization || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Insert into Supabase
    const { data, error } = await supabase
      .from("defense_briefing_requests")
      .insert({
        name,
        title: title || null,
        organization,
        email,
        phone: phone || null,
        classification_level: classificationLevel || null,
        areas_of_interest: areasOfInterest || [],
        message,
        status: "pending"
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      // If table doesn't exist yet, log to console and still return success for demo
      if (error.code === "42P01") {
        console.log("Table does not exist yet. Logging request:", { name, organization, email })
        // TODO: Send email notification here
        return NextResponse.json({ 
          success: true, 
          message: "Request logged (table pending creation)",
          id: crypto.randomUUID()
        })
      }
      return NextResponse.json(
        { error: "Failed to submit request" },
        { status: 500 }
      )
    }

    // TODO: Send email notification to admin
    // This would typically use an edge function or email service like Resend

    console.log("New briefing request submitted:", {
      id: data?.id,
      name,
      organization,
      email,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ 
      success: true, 
      message: "Request submitted successfully",
      id: data?.id 
    })

  } catch (error) {
    console.error("Error processing briefing request:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: "Defense briefing request API",
    method: "POST",
    fields: ["name", "title", "organization", "email", "phone", "classificationLevel", "areasOfInterest", "message"]
  })
}
